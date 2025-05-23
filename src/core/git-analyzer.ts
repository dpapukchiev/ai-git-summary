import { simpleGit, SimpleGit } from "simple-git";
import fs from "fs";
import path from "path";
import { Repository } from "../types";
import { DatabaseManager } from "../storage/database";
import { log } from "../utils/logger";
import { CommitProcessor } from "./commit-processor";
import { CommitFetcher } from "./commit-fetcher";
import { RepositoryDiscovery } from "./repository-discovery";
import { GitRemoteHandler } from "./git-remote-handler";
import { ParallelProcessor } from "./parallel-processor";

export class GitAnalyzer {
  private db: DatabaseManager;
  private commitProcessor: CommitProcessor;
  private commitFetcher: CommitFetcher;
  private repositoryDiscovery: RepositoryDiscovery;
  private gitRemoteHandler: GitRemoteHandler;
  private parallelProcessor: ParallelProcessor;

  constructor(db: DatabaseManager, options?: { concurrency?: number }) {
    this.db = db;
    this.commitProcessor = new CommitProcessor(db);
    this.commitFetcher = new CommitFetcher();
    this.repositoryDiscovery = new RepositoryDiscovery();
    this.gitRemoteHandler = new GitRemoteHandler();
    this.parallelProcessor = new ParallelProcessor(options?.concurrency || 5);
  }

  async analyzeRepository(repoPath: string, repoName?: string): Promise<void> {
    this.validateRepositoryPath(repoPath);

    const git = simpleGit(repoPath);
    const repo = await this.getOrCreateRepository(git, repoPath, repoName);

    log.output(`Analyzing repository: ${repo.name}`, "git-analyzer");

    const lastSyncDate = this.db.getLatestCommitDate(repo.id);
    log.debug(
      `Last sync: ${lastSyncDate ? lastSyncDate.toISOString() : "Never"}`,
      "git-analyzer"
    );

    const commits = await this.commitFetcher.fetchCommits(
      git,
      lastSyncDate || undefined
    );
    log.output(`Found ${commits.length} new commits`, "git-analyzer");

    if (commits.length > 0) {
      await this.parallelProcessor.processCommitsInParallel(
        git,
        repo.id,
        commits,
        this.commitProcessor
      );
    }

    this.db.updateRepositoryLastSynced(repo.id, new Date());
  }

  private validateRepositoryPath(repoPath: string): void {
    if (!fs.existsSync(repoPath)) {
      throw new Error(`Repository path does not exist: ${repoPath}`);
    }

    if (!fs.existsSync(path.join(repoPath, ".git"))) {
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
      throw new Error("Failed to get repository ID");
    }

    return repo as Repository & { id: number };
  }

  async cleanup(): Promise<void> {
    await this.parallelProcessor.cleanup();
  }

  getQueueStatus(): { size: number; pending: number; isPaused: boolean } {
    return this.parallelProcessor.getQueueStatus();
  }

  async discoverRepositories(searchPaths: string[]): Promise<Repository[]> {
    return await this.repositoryDiscovery.discoverRepositories(searchPaths);
  }

  async discoverRepositoriesByOrganization(
    searchPaths: string[],
    organizationName: string,
    maxDepth: number = 3
  ): Promise<Repository[]> {
    log.output(
      `🔍 Starting organization discovery for: ${organizationName}`,
      "git-analyzer"
    );

    const allRepositories =
      await this.repositoryDiscovery.discoverRepositories(searchPaths);
    return await this.gitRemoteHandler.filterRepositoriesByOrganization(
      allRepositories,
      organizationName
    );
  }
}
