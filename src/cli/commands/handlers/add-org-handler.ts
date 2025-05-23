import { GitAnalyzer } from "../../../core/git-analyzer";
import { processInParallel } from "../../../utils/parallel-processor";
import { parseGitRemoteUrl } from "../../../utils/git-utils";
import * as fs from "fs";
import * as path from "path";

export interface AddOrgOptions {
  maxDepth: string;
  concurrency: string;
  dryRun?: boolean;
}

export class AddOrgHandler {
  constructor(private gitAnalyzer: GitAnalyzer) {}

  async execute(
    organizationName: string,
    searchPaths: string[],
    options: AddOrgOptions
  ): Promise<void> {
    console.log(
      `🔍 Discovering repositories from organization "${organizationName}"...`
    );

    const absolutePaths = searchPaths.map((p) => path.resolve(p));
    const maxDepth = parseInt(options.maxDepth, 10);

    // Validate search paths
    for (const searchPath of absolutePaths) {
      if (!fs.existsSync(searchPath)) {
        throw new Error(`Search path does not exist: ${searchPath}`);
      }
    }

    const repositories =
      await this.gitAnalyzer.discoverRepositoriesByOrganization(
        absolutePaths,
        organizationName,
        maxDepth
      );

    if (repositories.length === 0) {
      console.log(
        `No repositories found for organization "${organizationName}" in the specified paths.`
      );
      return;
    }

    console.log(
      `\nFound ${repositories.length} repositories from "${organizationName}":`
    );
    for (const repo of repositories) {
      const remoteInfo = repo.remoteUrl
        ? parseGitRemoteUrl(repo.remoteUrl)
        : null;
      const provider = remoteInfo ? remoteInfo.provider : "unknown";
      console.log(`  📁 ${repo.name} (${provider}) - ${repo.path}`);
      if (repo.remoteUrl) {
        console.log(`     Remote: ${repo.remoteUrl}`);
      }
    }

    if (options.dryRun) {
      console.log(
        `\n🔍 Dry run completed. Would add ${repositories.length} repositories.`
      );
      console.log("Run without --dry-run to actually add these repositories.");
      return;
    }

    const concurrency = parseInt(options.concurrency, 10);
    console.log(
      `\nAdding and analyzing repositories with concurrency: ${concurrency}...`
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
        console.log(`${status} [${completed}/${total}] ${repo.name}`);
      }
    );

    console.log(`\n🎉 Organization repository discovery complete!`);
    console.log(`✅ Successfully added: ${results.completed}`);
    if (results.failed > 0) {
      console.log(`❌ Failed: ${results.failed}`);
      console.log("\nFailed repositories:");
      for (const { item, error } of results.errors) {
        console.log(`  - ${item.name}: ${error}`);
      }
    }
  }
}
