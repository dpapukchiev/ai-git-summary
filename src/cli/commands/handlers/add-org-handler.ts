import { GitAnalyzer } from "../../../core/git-analyzer";
import { processInParallel } from "../../../utils/parallel-processor";
import { parseGitRemoteUrl } from "../../../utils/git-utils";
import { log } from "../../../utils/logger";
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
    log.output(
      `🔍 Discovering repositories from organization "${organizationName}"...`,
      "add-org"
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
      log.output(
        `No repositories found for organization "${organizationName}" in the specified paths.`,
        "add-org"
      );
      return;
    }

    log.output(
      `\nFound ${repositories.length} repositories from "${organizationName}":`,
      "add-org"
    );
    for (const repo of repositories) {
      const remoteInfo = repo.remoteUrl
        ? parseGitRemoteUrl(repo.remoteUrl)
        : null;
      const provider = remoteInfo ? remoteInfo.provider : "unknown";
      log.output(`  📁 ${repo.name} (${provider}) - ${repo.path}`, "add-org");
      if (repo.remoteUrl) {
        log.output(`     Remote: ${repo.remoteUrl}`, "add-org");
      }
    }

    if (options.dryRun) {
      log.output(
        `\n🔍 Dry run completed. Would add ${repositories.length} repositories.`,
        "add-org"
      );
      log.output(
        "Run without --dry-run to actually add these repositories.",
        "add-org"
      );
      return;
    }

    const concurrency = parseInt(options.concurrency, 10);
    log.output(
      `\nAdding and analyzing repositories with concurrency: ${concurrency}...`,
      "add-org"
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
        log.output(`${status} [${completed}/${total}] ${repo.name}`, "add-org");
      }
    );

    log.output(`\n🎉 Organization repository discovery complete!`, "add-org");
    log.output(`✅ Successfully added: ${results.completed}`, "add-org");
    if (results.failed > 0) {
      log.output(`❌ Failed: ${results.failed}`, "add-org");
      log.output("\nFailed repositories:", "add-org");
      for (const { item, error } of results.errors) {
        log.output(`  - ${item.name}: ${error}`, "add-org");
      }
    }
  }
}
