import { SimpleGit, LogResult } from "simple-git";
import { log } from "../utils/logger";

export class CommitFetcher {
  private static readonly COMMON_BRANCHES = ["main", "develop"];
  private static readonly MAX_COMMITS_PER_BRANCH = 1000;

  async fetchCommits(git: SimpleGit, since?: Date): Promise<LogResult["all"]> {
    try {
      const branches = await git.branch(["--all"]);
      const branchesToCheck = this.getBranchesToCheck(branches);

      log.debug(
        `Fetching commits from branches: ${Array.from(branchesToCheck).join(", ")}`,
        "commit-fetcher"
      );

      return await this.fetchCommitsFromBranches(git, branchesToCheck, since);
    } catch (error) {
      log.error("Error fetching commits", error as Error, "commit-fetcher");
      return await this.fallbackCommitFetch(git, since);
    }
  }

  private getBranchesToCheck(branches: any): Set<string> {
    const branchesToCheck = new Set<string>();

    this.addCurrentBranch(branchesToCheck, branches);
    this.addCommonBranches(branchesToCheck, branches);
    this.addRemoteCommonBranches(branchesToCheck, branches);
    this.addFallbackBranches(branchesToCheck, branches);

    return branchesToCheck;
  }

  private addCurrentBranch(branchesToCheck: Set<string>, branches: any): void {
    if (branches.current) {
      branchesToCheck.add(branches.current);
    }
  }

  private addCommonBranches(branchesToCheck: Set<string>, branches: any): void {
    for (const branch of CommitFetcher.COMMON_BRANCHES) {
      if (branches.all.includes(branch)) {
        branchesToCheck.add(branch);
      }
    }
  }

  private addRemoteCommonBranches(
    branchesToCheck: Set<string>,
    branches: any
  ): void {
    for (const branch of CommitFetcher.COMMON_BRANCHES) {
      const remoteBranch = `origin/${branch}`;
      if (branches.all.includes(remoteBranch)) {
        branchesToCheck.add(remoteBranch);
      }
    }
  }

  private addFallbackBranches(
    branchesToCheck: Set<string>,
    branches: any
  ): void {
    if (branchesToCheck.size === 0) {
      if (branches.current) {
        branchesToCheck.add(branches.current);
      } else {
        const localBranches = branches.all.filter(
          (b: string) => !b.startsWith("remotes/")
        );
        localBranches
          .slice(0, 3)
          .forEach((b: string) => branchesToCheck.add(b));
      }
    }
  }

  private async fetchCommitsFromBranches(
    git: SimpleGit,
    branchesToCheck: Set<string>,
    since?: Date
  ): Promise<LogResult["all"]> {
    const allCommits: any[] = [];
    const seenHashes = new Set<string>();

    for (const branch of branchesToCheck) {
      try {
        const commits = await this.fetchCommitsFromSingleBranch(
          git,
          branch,
          since
        );
        this.deduplicateAndAdd(commits, allCommits, seenHashes);
      } catch (error) {
        log.warn(
          `Could not fetch commits from branch ${branch}`,
          "commit-fetcher"
        );
        log.debug(`Branch fetch error: ${error}`, "commit-fetcher");
      }
    }

    return allCommits;
  }

  private async fetchCommitsFromSingleBranch(
    git: SimpleGit,
    branch: string,
    since?: Date
  ): Promise<any[]> {
    const logArgs = this.buildLogArgs(since, branch);
    const options = this.buildLogOptions();

    const gitLog = await git.log(logArgs, options);
    return [...gitLog.all];
  }

  private buildLogArgs(since?: Date, branch?: string): string[] {
    const logArgs: string[] = [
      `--max-count=${CommitFetcher.MAX_COMMITS_PER_BRANCH}`,
    ];

    if (since) {
      logArgs.push(`--since=${since.toISOString()}`);
    }

    if (branch) {
      logArgs.push(branch);
    }

    return logArgs;
  }

  private buildLogOptions(): any {
    return {
      format: {
        hash: "%H",
        date: "%ai",
        message: "%s",
        body: "%b",
        author_name: "%an",
        author_email: "%ae",
      },
    };
  }

  private deduplicateAndAdd(
    commits: any[],
    allCommits: any[],
    seenHashes: Set<string>
  ): void {
    for (const commit of commits) {
      if (!seenHashes.has(commit.hash)) {
        seenHashes.add(commit.hash);
        allCommits.push(commit);
      }
    }
  }

  private async fallbackCommitFetch(
    git: SimpleGit,
    since?: Date
  ): Promise<LogResult["all"]> {
    try {
      const logArgs = this.buildLogArgs(since);
      const options = this.buildLogOptions();

      const gitLog = await git.log(logArgs, options);
      return [...gitLog.all];
    } catch (fallbackError) {
      log.error(
        "Fallback commit fetch also failed",
        fallbackError as Error,
        "commit-fetcher"
      );
      return [];
    }
  }
}
