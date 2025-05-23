import { GitAnalyzer } from "../../../core/git-analyzer";
import { processInParallel } from "../../../utils/parallel-processor";
import * as path from "path";

export interface DiscoverOptions {
  maxDepth: string;
  concurrency: string;
}

export class DiscoverHandler {
  constructor(private gitAnalyzer: GitAnalyzer) {}

  async execute(
    searchPaths: string[],
    options: DiscoverOptions
  ): Promise<void> {
    console.log("🔍 Discovering git repositories...");

    const absolutePaths = searchPaths.map((p) => path.resolve(p));
    const repositories =
      await this.gitAnalyzer.discoverRepositories(absolutePaths);

    if (repositories.length === 0) {
      console.log("No git repositories found in the specified paths.");
      return;
    }

    console.log(`\nFound ${repositories.length} repositories:`);
    for (const repo of repositories) {
      console.log(`  📁 ${repo.name} (${repo.path})`);
    }

    const concurrency = parseInt(options.concurrency, 10);
    console.log(`\nAnalyzing repositories with concurrency: ${concurrency}...`);

    const results = await processInParallel(
      repositories,
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

    console.log(`\n🎉 Discovery and analysis complete!`);
    console.log(`✅ Successfully processed: ${results.completed}`);
    if (results.failed > 0) {
      console.log(`❌ Failed: ${results.failed}`);
      console.log("\nFailed repositories:");
      for (const { item, error } of results.errors) {
        console.log(`  - ${item.name}: ${error}`);
      }
    }
  }
}
