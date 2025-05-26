import fs from 'fs';
import path from 'path';
import { simpleGit, SimpleGit } from 'simple-git';
import { DatabaseManager } from '../storage/database';
import { Repository } from '../types';
import { log } from '../utils/logger';
import { processInParallel, ProcessResult } from '../utils/parallel-processor';
import { CommitFetcher } from './commit-fetcher';
import { CommitProcessor } from './commit-processor';
import { CommitStatsService } from './commit-stats-service';
import { SimpleGitOperations } from './git-operations';
import { GitRemoteHandler } from './git-remote-handler';
import { RepositoryDiscovery } from './repository-discovery';

export class GitAnalyzer {
  private db: DatabaseManager;
  private commitFetcher: CommitFetcher;
  private repositoryDiscovery: RepositoryDiscovery;
  private gitRemoteHandler: GitRemoteHandler;
  private concurrency: number;

  constructor(db: DatabaseManager, options?: { concurrency?: number }) {
    this.db = db;
    this.commitFetcher = new CommitFetcher();
    this.repositoryDiscovery = new RepositoryDiscovery();
    this.gitRemoteHandler = new GitRemoteHandler();
    this.concurrency = options?.concurrency || 5;
  }

  async analyzeRepository(repoPath: string, repoName?: string): Promise<void> {
    this.validateRepositoryPath(repoPath);

    const git = simpleGit(repoPath);
    const repo = await this.getOrCreateRepository(git, repoPath, repoName);

    log.output(`Analyzing repository: ${repo.name}`, 'git-analyzer');

    const lastSyncDate = this.db.getLatestCommitDate(repo.id);
    log.debug(
      `Last sync: ${lastSyncDate ? lastSyncDate.toISOString() : 'Never'}`,
      'git-analyzer'
    );

    const commits = await this.commitFetcher.fetchCommits(
      git,
      lastSyncDate || undefined
    );
    log.output(`Found ${commits.length} new commits`, 'git-analyzer');

    if (commits.length > 0) {
      const startTime = Date.now();

      log.output(
        `Processing commits with concurrency: ${this.concurrency}`,
        'git-analyzer'
      );

      // Create a git operations instance for this specific repository
      const repoGitOperations = new SimpleGitOperations(git);
      const repoStatsService = new CommitStatsService(repoGitOperations);
      const repoCommitProcessor = new CommitProcessor(
        this.db,
        repoStatsService
      );

      const results = await processInParallel(
        [...commits],
        async (commit): Promise<ProcessResult> => {
          log.debug(`Processing commit: ${commit?.hash}`, 'git-analyzer');

          try {
            // Updated method call - removed git parameter
            await repoCommitProcessor.processCommit(repo.id, commit);
            return { success: true };
          } catch (error) {
            log.error(
              `Failed to process commit ${commit?.hash}`,
              error as Error,
              'git-analyzer'
            );
            return { success: false, error };
          }
        },
        this.concurrency,
        (completed, total, _commit, _success) => {
          this.logProgress(completed, total, startTime);
        }
      );

      const totalTime = (Date.now() - startTime) / 1000;
      this.logFinalResults(
        commits.length,
        totalTime,
        results.completed,
        results.failed
      );
    }

    this.db.updateRepositoryLastSynced(repo.id, new Date());
  }

  private logProgress(
    processed: number,
    total: number,
    startTime: number
  ): void {
    if (processed % 10 === 0 || processed === total) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = processed / elapsed;
      log.output(
        `✓ Processed ${processed}/${total} commits (${rate.toFixed(1)} commits/sec)`,
        'git-analyzer'
      );
    }
  }

  private logFinalResults(
    totalCommits: number,
    totalTime: number,
    successful: number,
    failed: number
  ): void {
    log.output(
      `🎉 Completed processing ${totalCommits} commits in ${totalTime.toFixed(1)}s`,
      'git-analyzer'
    );
    log.output(
      `✅ Successful: ${successful}, ❌ Failed: ${failed}`,
      'git-analyzer'
    );

    if (failed > 0) {
      log.output(
        `⚠️  ${failed} commits failed to process. Check logs above for details.`,
        'git-analyzer'
      );
    }
  }

  private validateRepositoryPath(repoPath: string): void {
    if (!fs.existsSync(repoPath)) {
      throw new Error(`Repository path does not exist: ${repoPath}`);
    }

    if (!fs.existsSync(path.join(repoPath, '.git'))) {
      throw new Error(`Not a git repository: ${repoPath}`);
    }
  }

  private async getOrCreateRepository(
    git: SimpleGit,
    repoPath: string,
    repoName?: string
  ): Promise<Repository & { id: number }> {
    let repo = this.db.getRepository(repoPath);

    if (!repo) {
      const remoteUrl = await this.gitRemoteHandler.getRemoteUrl(git);
      const name = repoName || path.basename(repoPath);

      const repoId = this.db.addRepository({
        name,
        path: repoPath,
        remoteUrl,
      });

      repo = { id: repoId, name, path: repoPath, remoteUrl };
    }

    if (!repo.id) {
      throw new Error('Failed to get repository ID');
    }

    return repo as Repository & { id: number };
  }

  async discoverRepositories(searchPaths: string[]): Promise<Repository[]> {
    return await this.repositoryDiscovery.discoverRepositories(searchPaths);
  }

  async discoverRepositoriesByOrganization(
    searchPaths: string[],
    organizationName: string,
    _maxDepth: number = 3
  ): Promise<Repository[]> {
    log.output(
      `🔍 Starting organization discovery for: ${organizationName}`,
      'git-analyzer'
    );

    const allRepositories =
      await this.repositoryDiscovery.discoverRepositories(searchPaths);
    return await this.gitRemoteHandler.filterRepositoriesByOrganization(
      allRepositories,
      organizationName
    );
  }
}
