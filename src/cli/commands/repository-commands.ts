import { Command } from "commander";
import { DatabaseManager } from "../../storage/database";
import { GitAnalyzer } from "../../core/git-analyzer";
import { DateUtils } from "../../utils/date-utils";
import { processInParallel } from "../../utils/parallel-processor";
import * as fs from "fs";
import * as path from "path";

/**
 * Add repository commands to the CLI program
 */
export function addRepositoryCommands(
  program: Command,
  db: DatabaseManager,
  gitAnalyzer: GitAnalyzer
) {
  // Add repository command
  program
    .command("add-repo")
    .description("Add a git repository to track")
    .argument("<path>", "Path to the git repository")
    .option("-n, --name <name>", "Custom name for the repository")
    .action(async (repoPath: string, options) => {
      try {
        const absolutePath = path.resolve(repoPath);

        if (!fs.existsSync(absolutePath)) {
          console.error(`Repository path does not exist: ${absolutePath}`);
          process.exit(1);
        }

        console.log(`Adding repository: ${absolutePath}`);
        await gitAnalyzer.analyzeRepository(absolutePath, options.name);
        console.log("✅ Repository added and analyzed successfully!");
      } catch (error) {
        console.error("❌ Error adding repository:", error);
        process.exit(1);
      }
    });

  // Discover repositories command
  program
    .command("discover")
    .description("Discover git repositories in specified directories")
    .argument("<paths...>", "Directory paths to search for git repositories")
    .option("-d, --max-depth <depth>", "Maximum search depth", "3")
    .option(
      "-c, --concurrency <num>",
      "Number of repositories to process concurrently",
      "3"
    )
    .action(async (searchPaths: string[], options) => {
      try {
        console.log("🔍 Discovering git repositories...");

        const absolutePaths = searchPaths.map((p) => path.resolve(p));
        const repositories =
          await gitAnalyzer.discoverRepositories(absolutePaths);

        if (repositories.length === 0) {
          console.log("No git repositories found in the specified paths.");
          return;
        }

        console.log(`\nFound ${repositories.length} repositories:`);
        for (const repo of repositories) {
          console.log(`  📁 ${repo.name} (${repo.path})`);
        }

        const concurrency = parseInt(options.concurrency, 10);
        console.log(
          `\nAnalyzing repositories with concurrency: ${concurrency}...`
        );

        const results = await processInParallel(
          repositories,
          async (repo) => {
            try {
              await gitAnalyzer.analyzeRepository(repo.path, repo.name);
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
      } catch (error) {
        console.error("❌ Error during discovery:", error);
        process.exit(1);
      }
    });

  // Sync command
  program
    .command("sync")
    .description("Sync all tracked repositories")
    .option("-r, --repos <repos...>", "Specific repositories to sync")
    .option(
      "-c, --concurrency <num>",
      "Number of repositories to process concurrently",
      "3"
    )
    .action(async (options) => {
      try {
        console.log("🔄 Syncing repositories...");

        const repositories = db.getAllRepositories();
        let reposToSync = repositories;

        if (options.repos && options.repos.length > 0) {
          reposToSync = repositories.filter((repo) =>
            options.repos.some(
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
              await gitAnalyzer.analyzeRepository(repo.path, repo.name);
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
      } catch (error) {
        console.error("❌ Error during sync:", error);
        process.exit(1);
      }
    });

  // List repositories command
  program
    .command("list")
    .description("List all tracked repositories")
    .action(() => {
      try {
        const repositories = db.getAllRepositories();

        if (repositories.length === 0) {
          console.log("No repositories are currently tracked.");
          console.log('Use "git-summary add-repo <path>" to add repositories.');
          return;
        }

        console.log(`\n📚 Tracked Repositories (${repositories.length}):\n`);

        for (const repo of repositories) {
          console.log(`📁 ${repo.name}`);
          console.log(`   Path: ${repo.path}`);
          if (repo.remoteUrl) {
            console.log(`   Remote: ${repo.remoteUrl}`);
          }
          if (repo.lastSynced) {
            console.log(
              `   Last Synced: ${DateUtils.formatDateTime(repo.lastSynced)}`
            );
          }
          console.log("");
        }
      } catch (error) {
        console.error("❌ Error listing repositories:", error);
        process.exit(1);
      }
    });
}
