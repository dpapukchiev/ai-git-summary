import { simpleGit, SimpleGit, LogResult, DiffResult } from "simple-git";
import fs from "fs";
import path from "path";
import { Repository, Commit, FileChange } from "../types";
import { DatabaseManager } from "../storage/database";
import {
  parseGitRemoteUrl,
  organizationMatches,
  GitRemoteInfo,
} from "../utils/git-utils";

export class GitAnalyzer {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
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

    console.log(`Analyzing repository: ${repo.name}`);
    console.log(
      `Last sync: ${lastSyncDate ? lastSyncDate.toISOString() : "Never"}`
    );

    // Fetch commits since last sync
    const commits = await this.fetchCommits(git, lastSyncDate || undefined);

    console.log(`Found ${commits.length} new commits`);

    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i];
      console.log(
        `Processing commit: ${commit?.hash} (${i + 1} out of ${commits.length})`
      );
      await this.processCommit(git, repo.id, commit);
    }

    // Update last synced timestamp
    this.db.updateRepositoryLastSynced(repo.id, new Date());
  }

  private async getRemoteUrl(git: SimpleGit): Promise<string | undefined> {
    try {
      const remotes = await git.getRemotes(true);
      const origin = remotes.find((r) => r.name === "origin");
      return origin?.refs?.fetch;
    } catch (error) {
      console.warn("Could not get remote URL:", error);
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

      console.log(
        `Fetching commits from branches: ${Array.from(branchesToCheck).join(", ")}`
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
          console.warn(`Could not fetch commits from branch ${branch}:`, error);
        }
      }

      return allCommits;
    } catch (error) {
      console.error("Error fetching commits:", error);

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

        const log = await git.log(logArgs, options);
        return log.all;
      } catch (fallbackError) {
        console.error("Fallback commit fetch also failed:", fallbackError);
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
          console.error(
            `Error adding file change for commit ${logEntry.hash}, file ${fileChange.filePath}:`,
            fileChangeError
          );
          // Continue processing other file changes
        }
      }
    } catch (error) {
      console.error(`Error processing commit ${logEntry.hash}:`, error);
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
        console.warn(`Could not get stats for commit ${hash}:`, error);
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

  async discoverRepositories(searchPaths: string[]): Promise<Repository[]> {
    const repositories: Repository[] = [];

    console.log(
      `🔍 Discovering repositories in ${searchPaths.length} search paths...`
    );

    for (const searchPath of searchPaths) {
      console.log(`📂 Scanning: ${searchPath}`);

      if (!fs.existsSync(searchPath)) {
        console.warn(`⚠️  Search path does not exist: ${searchPath}`);
        continue;
      }

      const repos = await this.findGitRepositories(searchPath);
      console.log(`   Found ${repos.length} repositories in this path`);
      repositories.push(...repos);
    }

    console.log(`📊 Total repositories discovered: ${repositories.length}`);
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
        console.warn(`Could not read directory ${currentPath}:`, error);
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
    console.log(
      `\n🔍 Starting organization discovery for: ${organizationName}`
    );
    console.log(`📂 Searching in paths: ${searchPaths.join(", ")}`);
    console.log(`📏 Max depth: ${maxDepth}`);

    const allRepositories = await this.discoverRepositories(searchPaths);
    console.log(`📦 Found ${allRepositories.length} total repositories`);

    if (allRepositories.length === 0) {
      console.log(`⚠️  No repositories found in search paths`);
      return [];
    }

    const filteredRepositories: Repository[] = [];

    console.log(`\n🔎 Checking each repository for organization match...`);

    for (let i = 0; i < allRepositories.length; i++) {
      const repo = allRepositories[i];
      if (!repo) {
        console.warn(`   ⚠️  Skipping undefined repository at index ${i}`);
        continue;
      }

      console.log(
        `\n[${i + 1}/${allRepositories.length}] Checking: ${repo.name}`
      );
      console.log(`   📍 Path: ${repo.path}`);

      try {
        // Get remote URL for this repository
        const git = simpleGit(repo.path);
        const remoteUrl = await this.getRemoteUrl(git);

        if (remoteUrl) {
          console.log(`   🌐 Remote URL: ${remoteUrl}`);
          const remoteInfo = parseGitRemoteUrl(remoteUrl);

          if (remoteInfo) {
            console.log(
              `   🏢 Parsed organization: ${remoteInfo.organization}`
            );
            console.log(`   📊 Repository name: ${remoteInfo.repository}`);

            if (
              organizationMatches(remoteInfo.organization, organizationName)
            ) {
              console.log(`   ✅ MATCH! Adding to filtered results`);
              filteredRepositories.push({
                id: repo.id,
                name: repo.name,
                path: repo.path,
                lastSynced: repo.lastSynced,
                weight: repo.weight,
                remoteUrl,
              });
            } else {
              console.log(`   ❌ No match (expected: ${organizationName})`);
            }
          } else {
            console.log(`   ⚠️  Could not parse remote URL`);
          }
        } else {
          console.log(`   ⚠️  No remote URL found`);
        }
      } catch (error) {
        console.warn(
          `   ❌ Error checking remote for repository ${repo.path}:`,
          error
        );
      }
    }

    console.log(`\n🎯 Organization discovery complete!`);
    console.log(
      `📊 Found ${filteredRepositories.length} repositories matching organization: ${organizationName}`
    );

    if (filteredRepositories.length > 0) {
      console.log(`📋 Matching repositories:`);
      filteredRepositories.forEach((repo, index) => {
        if (repo) {
          console.log(`   ${index + 1}. ${repo.name} (${repo.path})`);
        }
      });
    }

    return filteredRepositories;
  }
}
