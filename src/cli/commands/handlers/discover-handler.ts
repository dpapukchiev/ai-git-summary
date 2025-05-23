import { GitAnalyzer } from "../../../core/git-analyzer";
import { processInParallel } from "../../../utils/parallel-processor";
import { log } from "../../../utils/logger";
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
    log.output("🔍 Discovering git repositories...", "discover");

    const absolutePaths = searchPaths.map((p) => path.resolve(p));
    const repositories =
      await this.gitAnalyzer.discoverRepositories(absolutePaths);

    if (repositories.length === 0) {
      log.output(
        "No git repositories found in the specified paths.",
        "discover"
      );
      return;
    }

    log.output(`\nFound ${repositories.length} repositories:`, "discover");
    for (const repo of repositories) {
      log.output(`  📁 ${repo.name} (${repo.path})`, "discover");
    }

    const concurrency = parseInt(options.concurrency, 10);
    log.output(
      `\nAnalyzing repositories with concurrency: ${concurrency}...`,
      "discover"
    );

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
        log.output(
          `${status} [${completed}/${total}] ${repo.name}`,
          "discover"
        );
      }
    );

    log.output(`\n🎉 Discovery and analysis complete!`, "discover");
    log.output(`✅ Successfully processed: ${results.completed}`, "discover");
    if (results.failed > 0) {
      log.output(`❌ Failed: ${results.failed}`, "discover");
      log.output("\nFailed repositories:", "discover");
      for (const { item, error } of results.errors) {
        log.output(`  - ${item.name}: ${error}`, "discover");
      }
    }
  }
}
