import { simpleGit, SimpleGit, LogResult } from "simple-git";
import fs from "fs";
import path from "path";
import PQueue from "p-queue";
import { Repository, Commit, FileChange } from "../types";
import { DatabaseManager } from "../storage/database";
import {
  parseGitRemoteUrl,
  organizationMatches,
  GitRemoteInfo,
} from "../utils/git-utils";
import { log } from "../utils/logger";

export class GitAnalyzer {
  private db: DatabaseManager;
  private queue: PQueue;
  private concurrency: number;

  constructor(db: DatabaseManager, options?: { concurrency?: number }) {
    this.db = db;
    this.concurrency = options?.concurrency || 5;
    this.queue = new PQueue({
      concurrency: this.concurrency,
      timeout: 60000, // 60 second timeout per operation
      throwOnTimeout: true,
    });
  }

  async analyzeRepository(repoPath: string, repoName?: string): Promise<void> {
    if (!fs.existsSync(repoPath)) {
      throw new Error(`Repository path does not exist: ${repoPath}`);
    }

    if (!fs.existsSync(path.join(repoPath, ".git"))) {
      throw new Error(`Not a git repository: ${repoPath}`);
    }

    const git = simpleGit(repoPath);

    // Get or create repository record
    let repo = this.db.getRepository(repoPath);
    if (!repo) {
      const remoteUrl = await this.getRemoteUrl(git);
      const name = repoName || path.basename(repoPath);

      const repoId = this.db.addRepository({
        name,
        path: repoPath,
        remoteUrl,
      });

      repo = { id: repoId, name, path: repoPath, remoteUrl };
    }

    if (!repo.id) {
      throw new Error("Failed to get repository ID");
    }

    // Get last synced date to optimize fetching
    const lastSyncDate = this.db.getLatestCommitDate(repo.id);

    log.output(`Analyzing repository: ${repo.name}`);
    log.debug(
      `Last sync: ${lastSyncDate ? lastSyncDate.toISOString() : "Never"}`,
      "git-analyzer"
    );

    // Fetch commits since last sync
    const commits = await this.fetchCommits(git, lastSyncDate || undefined);

    log.output(`Found ${commits.length} new commits`);

    if (commits.length > 0) {
      await this.processCommitsInParallel(git, repo.id!, commits);
    }

    // Update last synced timestamp
    this.db.updateRepositoryLastSynced(repo.id, new Date());
  }

  private async processCommitsInParallel(
    git: SimpleGit,
    repoId: number,
    commits: readonly any[]
  ): Promise<void> {
    log.output(`Processing commits with concurrency: ${this.concurrency}`);

    let processed = 0;
    const startTime = Date.now();

    const commitTasks = commits.map((commit, index) =>
      this.queue.add(async () => {
        log.debug(
          `Processing commit: ${commit?.hash} (${index + 1}/${commits.length})`,
          "git-analyzer"
        );

        try {
          await this.processCommit(git, repoId, commit);
          processed++;

          // Progress logging every 10 commits or on completion
          if (processed % 10 === 0 || processed === commits.length) {
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = processed / elapsed;
            log.output(
              `✓ Processed ${processed}/${commits.length} commits (${rate.toFixed(1)} commits/sec)`
            );
          }
        } catch (error) {
          log.error(
            `Failed to process commit ${commit?.hash}`,
            error as Error,
            "git-analyzer"
          );
          throw error; // Re-throw for Promise.allSettled to catch
        }
      })
    );

    const results = await Promise.allSettled(commitTasks);
    const elapsed = (Date.now() - startTime) / 1000;

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    log.output(
      `🎉 Completed processing ${commits.length} commits in ${elapsed.toFixed(1)}s`
    );
    log.output(`✅ Successful: ${successful}, ❌ Failed: ${failed}`);

    if (failed > 0) {
      log.output(
        `⚠️  ${failed} commits failed to process. Check logs above for details.`
      );
    }
  }

  private async getRemoteUrl(git: SimpleGit): Promise<string | undefined> {
    try {
      const remotes = await git.getRemotes(true);
      const origin = remotes.find((r) => r.name === "origin");
      return origin?.refs?.fetch;
    } catch (error) {
      log.warn("Could not get remote URL", "git-analyzer");
      log.debug(`Remote URL error: ${error}`, "git-analyzer");
      return undefined;
    }
  }

  private async fetchCommits(
    git: SimpleGit,
    since?: Date
  ): Promise<LogResult["all"]> {
    try {
      // Get all branches first
      const branches = await git.branch(["--all"]);

      // Define branches to check (prioritize common main branches)
      const branchesToCheck = new Set<string>();

      // Add current branch if it exists
      if (branches.current) {
        branchesToCheck.add(branches.current);
      }

      // Add common main branches
      const commonBranches = ["main", "develop"];
      for (const branch of commonBranches) {
        if (branches.all.includes(branch)) {
          branchesToCheck.add(branch);
        }
      }

      // Add remote versions of common branches
      for (const branch of commonBranches) {
        const remoteBranch = `origin/${branch}`;
        if (branches.all.includes(remoteBranch)) {
          branchesToCheck.add(remoteBranch);
        }
      }

      // If no specific branches found, fall back to current branch or all branches
      if (branchesToCheck.size === 0) {
        if (branches.current) {
          branchesToCheck.add(branches.current);
        } else {
          // Add first few local branches as fallback
          const localBranches = branches.all.filter(
            (b) => !b.startsWith("remotes/")
          );
          localBranches.slice(0, 3).forEach((b) => branchesToCheck.add(b));
        }
      }

      log.debug(
        `Fetching commits from branches: ${Array.from(branchesToCheck).join(", ")}`,
        "git-analyzer"
      );

      const allCommits: any[] = [];
      const seenHashes = new Set<string>();

      for (const branch of branchesToCheck) {
        try {
          // Build git log arguments
          const logArgs: string[] = ["--max-count=1000"];

          if (since) {
            logArgs.push(`--since=${since.toISOString()}`);
          }

          logArgs.push(branch);

          const options: any = {
            format: {
              hash: "%H",
              date: "%ai",
              message: "%s",
              body: "%b",
              author_name: "%an",
              author_email: "%ae",
            },
          };

          const log = await git.log(logArgs, options);

          // Deduplicate commits by hash and add to collection
          for (const commit of log.all) {
            if (!seenHashes.has(commit.hash)) {
              seenHashes.add(commit.hash);
              allCommits.push(commit);
            }
          }
        } catch (error) {
          log.warn(
            `Could not fetch commits from branch ${branch}`,
            "git-analyzer"
          );
          log.debug(`Branch fetch error: ${error}`, "git-analyzer");
        }
      }

      return allCommits;
    } catch (error) {
      log.error("Error fetching commits", error as Error, "git-analyzer");

      // Fallback to original behavior if branch detection fails
      try {
        // Build git log arguments for fallback
        const logArgs: string[] = ["--max-count=1000"];

        if (since) {
          logArgs.push(`--since=${since.toISOString()}`);
        }

        const options: any = {
          format: {
            hash: "%H",
            date: "%ai",
            message: "%s",
            body: "%b",
            author_name: "%an",
            author_email: "%ae",
          },
        };

        const gitLog = await git.log(logArgs, options);
        return gitLog.all;
      } catch (fallbackError) {
        log.error(
          "Fallback commit fetch also failed",
          fallbackError as Error,
          "git-analyzer"
        );
        return [];
      }
    }
  }

  private async processCommit(
    git: SimpleGit,
    repoId: number,
    logEntry: any
  ): Promise<void> {
    try {
      // Get commit stats
      const stats = await this.getCommitStats(git, logEntry.hash);

      // Save commit to database
      const commitId = this.db.addCommit({
        repoId,
        hash: logEntry.hash,
        author: logEntry.author_name,
        email: logEntry.author_email,
        date: new Date(logEntry.date),
        message: logEntry.message,
        filesChanged: stats.filesChanged,
        insertions: stats.insertions,
        deletions: stats.deletions,
      });

      // Validate commitId before proceeding
      if (!commitId || commitId <= 0) {
        throw new Error(
          `Failed to add commit ${logEntry.hash} - invalid commit ID: ${commitId}`
        );
      }

      // Save file changes
      for (const fileChange of stats.fileChanges) {
        try {
          this.db.addFileChange({
            commitId,
            ...fileChange,
          });
        } catch (fileChangeError) {
          log.error(
            `Error adding file change for commit ${logEntry.hash}, file ${fileChange.filePath}`,
            fileChangeError as Error,
            "git-analyzer"
          );
          // Continue processing other file changes
        }
      }
    } catch (error) {
      log.error(
        `Error processing commit ${logEntry.hash}`,
        error as Error,
        "git-analyzer"
      );
    }
  }

  private async getCommitStats(
    git: SimpleGit,
    hash: string
  ): Promise<{
    filesChanged: number;
    insertions: number;
    deletions: number;
    fileChanges: Omit<FileChange, "id" | "commitId">[];
  }> {
    try {
      // Get diff summary
      const diffSummary = await git.diffSummary([`${hash}^`, hash]);

      // Get detailed file changes
      const diff = await git.diff([`${hash}^`, hash, "--numstat"]);
      const fileChanges = this.parseDiffNumstat(diff);

      return {
        filesChanged: diffSummary.files.length,
        insertions: diffSummary.insertions,
        deletions: diffSummary.deletions,
        fileChanges,
      };
    } catch (error) {
      // If this is the first commit, compare against empty tree
      try {
        const diffSummary = await git.diffSummary([
          "4b825dc642cb6eb9a060e54bf8d69288fbee4904",
          hash,
        ]);
        const diff = await git.diff([
          "4b825dc642cb6eb9a060e54bf8d69288fbee4904",
          hash,
          "--numstat",
        ]);
        const fileChanges = this.parseDiffNumstat(diff);

        return {
          filesChanged: diffSummary.files.length,
          insertions: diffSummary.insertions,
          deletions: diffSummary.deletions,
          fileChanges,
        };
      } catch (firstCommitError) {
        log.warn(`Could not get stats for commit ${hash}`, "git-analyzer");
        log.debug(`Commit stats error: ${error}`, "git-analyzer");
        return {
          filesChanged: 0,
          insertions: 0,
          deletions: 0,
          fileChanges: [],
        };
      }
    }
  }

  private parseDiffNumstat(
    diffOutput: string
  ): Omit<FileChange, "id" | "commitId">[] {
    const lines = diffOutput
      .trim()
      .split("\n")
      .filter((line) => line.length > 0);
    const fileChanges: Omit<FileChange, "id" | "commitId">[] = [];

    for (const line of lines) {
      const parts = line.split("\t");
      if (parts.length >= 3) {
        const insertions =
          parts[0] === "-" ? 0 : parseInt(parts[0] || "0", 10) || 0;
        const deletions =
          parts[1] === "-" ? 0 : parseInt(parts[1] || "0", 10) || 0;
        const filePath = parts[2];

        // Skip if filePath is undefined or empty
        if (!filePath) {
          continue;
        }

        // Determine change type based on insertions/deletions
        let changeType: FileChange["changeType"] = "modified";
        if (insertions > 0 && deletions === 0) {
          changeType = "added";
        } else if (insertions === 0 && deletions > 0) {
          changeType = "deleted";
        }

        // Handle renamed files
        if (filePath.includes(" => ")) {
          changeType = "renamed";
        }

        fileChanges.push({
          filePath,
          changeType,
          insertions,
          deletions,
        });
      }
    }

    return fileChanges;
  }

  async cleanup(): Promise<void> {
    log.output("🧹 Cleaning up queue...");
    this.queue.clear();
    await this.queue.onIdle();
    log.output("✅ Queue cleanup completed");
  }

  getQueueStatus(): { size: number; pending: number; isPaused: boolean } {
    return {
      size: this.queue.size,
      pending: this.queue.pending,
      isPaused: this.queue.isPaused,
    };
  }

  async discoverRepositories(searchPaths: string[]): Promise<Repository[]> {
    const repositories: Repository[] = [];

    log.output(
      `🔍 Discovering repositories in ${searchPaths.length} search paths...`
    );

    for (const searchPath of searchPaths) {
      log.output(`📂 Scanning: ${searchPath}`);

      if (!fs.existsSync(searchPath)) {
        log.output(`⚠️  Search path does not exist: ${searchPath}`);
        continue;
      }

      const repos = await this.findGitRepositories(searchPath);
      log.output(`   Found ${repos.length} repositories in this path`);
      repositories.push(...repos);
    }

    log.output(`📊 Total repositories discovered: ${repositories.length}`);
    return repositories;
  }

  private async findGitRepositories(
    basePath: string,
    maxDepth: number = 3
  ): Promise<Repository[]> {
    const repositories: Repository[] = [];

    const searchDirectory = async (
      currentPath: string,
      depth: number
    ): Promise<void> => {
      if (depth > maxDepth) return;

      try {
        const items = fs.readdirSync(currentPath, { withFileTypes: true });

        // Check if current directory is a git repository
        if (items.some((item) => item.name === ".git" && item.isDirectory())) {
          const name = path.basename(currentPath);
          repositories.push({
            name,
            path: currentPath,
          });
          return; // Don't search subdirectories of git repos
        }

        // Search subdirectories
        for (const item of items) {
          if (
            item.isDirectory() &&
            !item.name.startsWith(".") &&
            item.name !== "node_modules"
          ) {
            await searchDirectory(path.join(currentPath, item.name), depth + 1);
          }
        }
      } catch (error) {
        log.warn(`Could not read directory ${currentPath}`, "git-analyzer");
        log.debug(`Directory read error: ${error}`, "git-analyzer");
      }
    };

    await searchDirectory(basePath, 0);
    return repositories;
  }

  async discoverRepositoriesByOrganization(
    searchPaths: string[],
    organizationName: string,
    maxDepth: number = 3
  ): Promise<Repository[]> {
    log.output(`\n🔍 Starting organization discovery for: ${organizationName}`);
    log.debug(
      `📂 Searching in paths: ${searchPaths.join(", ")}`,
      "git-analyzer"
    );
    log.debug(`📏 Max depth: ${maxDepth}`, "git-analyzer");

    const allRepositories = await this.discoverRepositories(searchPaths);
    log.output(`📦 Found ${allRepositories.length} total repositories`);

    if (allRepositories.length === 0) {
      log.output(`⚠️  No repositories found in search paths`);
      return [];
    }

    const filteredRepositories: Repository[] = [];

    log.output(`\n🔎 Checking each repository for organization match...`);

    for (let i = 0; i < allRepositories.length; i++) {
      const repo = allRepositories[i];
      if (!repo) {
        log.debug(
          `   ⚠️  Skipping undefined repository at index ${i}`,
          "git-analyzer"
        );
        continue;
      }

      log.debug(
        `\n[${i + 1}/${allRepositories.length}] Checking: ${repo.name}`,
        "git-analyzer"
      );
      log.debug(`   📍 Path: ${repo.path}`, "git-analyzer");

      try {
        // Get remote URL for this repository
        const git = simpleGit(repo.path);
        const remoteUrl = await this.getRemoteUrl(git);

        if (remoteUrl) {
          log.debug(`   🌐 Remote URL: ${remoteUrl}`, "git-analyzer");
          const remoteInfo = parseGitRemoteUrl(remoteUrl);

          if (remoteInfo) {
            log.debug(
              `   🏢 Parsed organization: ${remoteInfo.organization}`,
              "git-analyzer"
            );
            log.debug(
              `   📊 Repository name: ${remoteInfo.repository}`,
              "git-analyzer"
            );

            if (
              organizationMatches(remoteInfo.organization, organizationName)
            ) {
              log.output(`   ✅ MATCH! Adding to filtered results`);
              filteredRepositories.push({
                id: repo.id,
                name: repo.name,
                path: repo.path,
                lastSynced: repo.lastSynced,
                weight: repo.weight,
                remoteUrl,
              });
            } else {
              log.debug(
                `   ❌ No match (expected: ${organizationName})`,
                "git-analyzer"
              );
            }
          } else {
            log.debug(`   ⚠️  Could not parse remote URL`, "git-analyzer");
          }
        } else {
          log.debug(`   ⚠️  No remote URL found`, "git-analyzer");
        }
      } catch (error) {
        log.debug(
          `   ❌ Error checking remote for repository ${repo.path}`,
          "git-analyzer"
        );
        log.debug(`Remote check error: ${error}`, "git-analyzer");
      }
    }

    log.output(`\n🎯 Organization discovery complete!`);
    log.output(
      `📊 Found ${filteredRepositories.length} repositories matching organization: ${organizationName}`
    );

    if (filteredRepositories.length > 0) {
      log.output(`📋 Matching repositories:`);
      filteredRepositories.forEach((repo, index) => {
        if (repo) {
          log.output(`   ${index + 1}. ${repo.name} (${repo.path})`);
        }
      });
    }

    return filteredRepositories;
  }
}
