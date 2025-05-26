import { BranchSummary, LogResult, SimpleGit, TaskOptions } from 'simple-git';
import { log } from '../utils/logger';

export class CommitFetcher {
  private static readonly COMMON_BRANCHES = ['main', 'develop'];
  private static readonly MAX_COMMITS_PER_BRANCH = 1000;

  async fetchCommits(git: SimpleGit, since?: Date): Promise<LogResult['all']> {
    try {
      const branches = await git.branch(['--all']);
      const branchesToCheck = this.getBranchesToCheck(branches);

      log.debug(
        `Fetching commits from branches: ${Array.from(branchesToCheck).join(', ')}`,
        'commit-fetcher'
      );

      return await this.fetchCommitsFromBranches(git, branchesToCheck, since);
    } catch (error) {
      log.error('Error fetching commits', error as Error, 'commit-fetcher');
      return await this.fallbackCommitFetch(git, since);
    }
  }

  private getBranchesToCheck(branches: BranchSummary): Set<string> {
    const branchesToCheck = new Set<string>();

    this.addCurrentBranch(branchesToCheck, branches);
    this.addCommonBranches(branchesToCheck, branches);
    this.addRemoteCommonBranches(branchesToCheck, branches);
    this.addFallbackBranches(branchesToCheck, branches);

    return branchesToCheck;
  }

  private addCurrentBranch(
    branchesToCheck: Set<string>,
    branches: BranchSummary
  ): void {
    if (branches.current) {
      branchesToCheck.add(branches.current);
    }
  }

  private addCommonBranches(
    branchesToCheck: Set<string>,
    branches: BranchSummary
  ): void {
    for (const branch of CommitFetcher.COMMON_BRANCHES) {
      if (branches.all.includes(branch)) {
        branchesToCheck.add(branch);
      }
    }
  }

  private addRemoteCommonBranches(
    branchesToCheck: Set<string>,
    branches: BranchSummary
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
    branches: BranchSummary
  ): void {
    if (branchesToCheck.size === 0) {
      if (branches.current) {
        branchesToCheck.add(branches.current);
      } else {
        const localBranches = branches.all.filter(
          (b: string) => !b.startsWith('remotes/')
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
  ): Promise<LogResult['all']> {
    const allCommits: LogResult['all'][number][] = [];
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
          'commit-fetcher'
        );
        log.debug(`Branch fetch error: ${error}`, 'commit-fetcher');
      }
    }

    return allCommits;
  }

  private async fetchCommitsFromSingleBranch(
    git: SimpleGit,
    branch: string,
    since?: Date
  ): Promise<LogResult['all'][number][]> {
    const options = this.buildLogOptions(since, branch);
    const gitLog = await git.log(options);
    return [...gitLog.all];
  }

  private buildLogOptions(since?: Date, branch?: string): TaskOptions {
    const args: string[] = [
      `--max-count=${CommitFetcher.MAX_COMMITS_PER_BRANCH}`,
    ];

    if (since) {
      args.push(`--since=${since.toISOString()}`);
    }

    if (branch) {
      args.push(branch);
    }

    return args;
  }

  private deduplicateAndAdd(
    commits: LogResult['all'][number][],
    allCommits: LogResult['all'][number][],
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
  ): Promise<LogResult['all']> {
    try {
      const options = this.buildLogOptions(since);
      const gitLog = await git.log(options);
      return [...gitLog.all];
    } catch (fallbackError) {
      log.error(
        'Fallback commit fetch also failed',
        fallbackError as Error,
        'commit-fetcher'
      );
      return [];
    }
  }
}
