import { DatabaseManager } from '../../../storage/database';
import { GitAnalyzer } from '../../../core/git-analyzer';
import { processInParallel } from '../../../utils/parallel-processor';
import { log } from '../../../utils/logger';

export interface SyncOptions {
  repos?: string[];
  concurrency: string;
}

export class SyncHandler {
  constructor(
    private db: DatabaseManager,
    private gitAnalyzer: GitAnalyzer
  ) {}

  async execute(options: SyncOptions): Promise<void> {
    log.output('🔄 Syncing repositories...', 'sync');

    const repositories = this.db.getAllRepositories();
    let reposToSync = repositories;

    if (options.repos && options.repos.length > 0) {
      reposToSync = repositories.filter(repo =>
        options.repos!.some(
          (r: string) => repo.path.includes(r) || repo.name === r
        )
      );
    }

    if (reposToSync.length === 0) {
      log.output('No repositories found to sync.', 'sync');
      return;
    }

    const concurrency = parseInt(options.concurrency, 10);
    log.output(
      `\nSyncing ${reposToSync.length} repositories with concurrency: ${concurrency}...`,
      'sync'
    );

    const results = await processInParallel(
      reposToSync,
      async repo => {
        try {
          await this.gitAnalyzer.analyzeRepository(repo.path, repo.name);
          return { success: true };
        } catch (error) {
          return { success: false, error };
        }
      },
      concurrency,
      (completed, total, repo, success) => {
        const status = success ? '✅' : '❌';
        log.output(`${status} [${completed}/${total}] ${repo.name}`, 'sync');
      }
    );

    log.output(`\n🎉 Sync complete!`, 'sync');
    log.output(`✅ Successfully synced: ${results.completed}`, 'sync');
    if (results.failed > 0) {
      log.output(`❌ Failed: ${results.failed}`, 'sync');
      log.output('\nFailed repositories:', 'sync');
      for (const { item, error } of results.errors) {
        log.output(`  - ${item.name}: ${error}`, 'sync');
      }
    }
  }
}
