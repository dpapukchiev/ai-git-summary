import { DatabaseManager } from "../../../storage/database";
import { GitAnalyzer } from "../../../core/git-analyzer";
import { processInParallel } from "../../../utils/parallel-processor";

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
    console.log("🔄 Syncing repositories...");

    const repositories = this.db.getAllRepositories();
    let reposToSync = repositories;

    if (options.repos && options.repos.length > 0) {
      reposToSync = repositories.filter((repo) =>
        options.repos!.some(
          (r: string) => repo.path.includes(r) || repo.name === r
        )
      );
    }

    if (reposToSync.length === 0) {
      console.log("No repositories found to sync.");
      return;
    }

    const concurrency = parseInt(options.concurrency, 10);
    console.log(
      `\nSyncing ${reposToSync.length} repositories with concurrency: ${concurrency}...`
    );

    const results = await processInParallel(
      reposToSync,
      async (repo) => {
        try {
          await this.gitAnalyzer.analyzeRepository(repo.path, repo.name);
          return { success: true };
        } catch (error) {
          return { success: false, error };
        }
      },
      concurrency,
      (completed, total, repo, success) => {
        const status = success ? "✅" : "❌";
        console.log(`${status} [${completed}/${total}] ${repo.name}`);
      }
    );

    console.log(`\n🎉 Sync complete!`);
    console.log(`✅ Successfully synced: ${results.completed}`);
    if (results.failed > 0) {
      console.log(`❌ Failed: ${results.failed}`);
      console.log("\nFailed repositories:");
      for (const { item, error } of results.errors) {
        console.log(`  - ${item.name}: ${error}`);
      }
    }
  }
}
