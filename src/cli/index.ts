#!/usr/bin/env node

import { Command } from "commander";
import { DatabaseManager } from "../storage/database";
import { GitAnalyzer } from "../core/git-analyzer";
import { DataAggregator } from "../core/data-aggregator";
import { DateUtils } from "../utils/date-utils";
import { PeriodType } from "../types";
import path from "path";
import fs from "fs";

const program = new Command();
const db = new DatabaseManager();
const gitAnalyzer = new GitAnalyzer(db);
const dataAggregator = new DataAggregator(db);

/**
 * Process repositories in parallel with configurable concurrency
 */
async function processRepositoriesInParallel<T>(
  items: T[],
  processor: (item: T) => Promise<{ success: boolean; error?: any }>,
  concurrency: number = 3,
  progressCallback?: (
    completed: number,
    total: number,
    item: T,
    success: boolean
  ) => void
): Promise<{
  completed: number;
  failed: number;
  errors: Array<{ item: T; error: any }>;
}> {
  const results = {
    completed: 0,
    failed: 0,
    errors: [] as Array<{ item: T; error: any }>,
  };

  const processChunk = async (chunk: T[]) => {
    const promises = chunk.map(async (item) => {
      try {
        const result = await processor(item);
        if (result.success) {
          results.completed++;
          progressCallback?.(
            results.completed + results.failed,
            items.length,
            item,
            true
          );
        } else {
          results.failed++;
          results.errors.push({ item, error: result.error });
          progressCallback?.(
            results.completed + results.failed,
            items.length,
            item,
            false
          );
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ item, error });
        progressCallback?.(
          results.completed + results.failed,
          items.length,
          item,
          false
        );
      }
    });

    await Promise.all(promises);
  };

  // Process items in chunks to control concurrency
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    await processChunk(chunk);
  }

  return results;
}

program
  .name("git-summary")
  .description("AI-powered git activity analyzer and summarizer")
  .version("1.0.0");

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

      const results = await processRepositoriesInParallel(
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

      const results = await processRepositoriesInParallel(
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

// Summary commands
const createSummaryCommand = (period: PeriodType, description: string) => {
  return program
    .command(period.replace(/\d+/, ""))
    .description(description)
    .option("-r, --repos <repos...>", "Specific repositories to analyze")
    .option(
      "-f, --format <format>",
      "Output format (text, json, markdown)",
      "text"
    )
    .option("-v, --verbose", "Verbose output")
    .action(async (options) => {
      try {
        if (options.verbose) {
          console.log(`📊 Generating ${description.toLowerCase()}...`);
        }

        const timePeriod = DateUtils.getPeriod(period);
        const summary = await dataAggregator.generateWorkSummary(
          timePeriod,
          options.repos
        );

        if (options.format === "json") {
          console.log(JSON.stringify(summary, null, 2));
        } else if (options.format === "markdown") {
          printMarkdownSummary(summary);
        } else {
          printTextSummary(summary, options.verbose);
        }
      } catch (error) {
        console.error("❌ Error generating summary:", error);
        process.exit(1);
      }
    });
};

// Create summary commands
createSummaryCommand("1week", "Last week summary");
createSummaryCommand("1month", "Last month summary");
createSummaryCommand("3months", "Last 3 months summary");
createSummaryCommand("6months", "Last 6 months summary");
createSummaryCommand("1year", "Last year summary");
createSummaryCommand("ytd", "Year to date summary");

// Custom period command
program
  .command("period")
  .description("Generate summary for custom date range")
  .requiredOption("--from <date>", "Start date (YYYY-MM-DD)")
  .requiredOption("--to <date>", "End date (YYYY-MM-DD)")
  .option("-r, --repos <repos...>", "Specific repositories to analyze")
  .option(
    "-f, --format <format>",
    "Output format (text, json, markdown)",
    "text"
  )
  .option("-v, --verbose", "Verbose output")
  .action(async (options) => {
    try {
      const startDate = new Date(options.from);
      const endDate = new Date(options.to);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error("❌ Invalid date format. Use YYYY-MM-DD format.");
        process.exit(1);
      }

      if (startDate >= endDate) {
        console.error("❌ Start date must be before end date.");
        process.exit(1);
      }

      if (options.verbose) {
        console.log(
          `📊 Generating summary for ${options.from} to ${options.to}...`
        );
      }

      const timePeriod = DateUtils.getPeriod("1week", startDate, endDate); // Using custom dates
      const summary = await dataAggregator.generateWorkSummary(
        timePeriod,
        options.repos
      );

      if (options.format === "json") {
        console.log(JSON.stringify(summary, null, 2));
      } else if (options.format === "markdown") {
        printMarkdownSummary(summary);
      } else {
        printTextSummary(summary, options.verbose);
      }
    } catch (error) {
      console.error("❌ Error generating summary:", error);
      process.exit(1);
    }
  });

// Global error handling
process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});

process.on("SIGINT", () => {
  console.log("\n👋 Goodbye!");
  db.close();
  process.exit(0);
});

// Parse command line arguments
program.parse();

function printTextSummary(summary: any, verbose = false) {
  console.log(`\n📊 Work Summary: ${summary.period.label}\n`);
  console.log(
    `Period: ${DateUtils.formatDate(summary.period.startDate)} to ${DateUtils.formatDate(summary.period.endDate)}`
  );
  console.log(`Repositories: ${summary.repositories.length}\n`);

  // Overall stats
  console.log("📈 Overall Statistics:");
  console.log(`  Commits: ${summary.stats.totalCommits}`);
  console.log(`  Files Changed: ${summary.stats.totalFilesChanged}`);
  console.log(`  Lines Added: ${summary.stats.totalInsertions}`);
  console.log(`  Lines Deleted: ${summary.stats.totalDeletions}`);
  console.log(`  Active Days: ${summary.stats.activeDays}`);
  console.log(`  Average Commits/Day: ${summary.stats.averageCommitsPerDay}\n`);

  // Top languages
  if (summary.stats.topLanguages && summary.stats.topLanguages.length > 0) {
    console.log("💻 Top Languages:");
    for (const lang of summary.stats.topLanguages.slice(0, 5)) {
      console.log(`  ${lang.language}: ${lang.changes} changes`);
    }
    console.log("");
  }

  // Top files
  if (verbose && summary.stats.topFiles && summary.stats.topFiles.length > 0) {
    console.log("📄 Most Active Files:");
    for (const file of summary.stats.topFiles.slice(0, 10)) {
      console.log(`  ${file.file} (${file.changes} changes)`);
    }
    console.log("");
  }

  // Repository breakdown
  if (verbose && summary.repositories.length > 0) {
    console.log("📁 Analyzed Repositories:");
    for (const repo of summary.repositories) {
      console.log(`  ${repo.name} (${repo.path})`);
    }
  }
}

function printMarkdownSummary(summary: any) {
  console.log(`# Work Summary: ${summary.period.label}\n`);
  console.log(
    `**Period:** ${DateUtils.formatDate(summary.period.startDate)} to ${DateUtils.formatDate(summary.period.endDate)}\n`
  );
  console.log(`**Repositories:** ${summary.repositories.length}\n`);

  console.log("## Overall Statistics\n");
  console.log(`- **Commits:** ${summary.stats.totalCommits}`);
  console.log(`- **Files Changed:** ${summary.stats.totalFilesChanged}`);
  console.log(`- **Lines Added:** ${summary.stats.totalInsertions}`);
  console.log(`- **Lines Deleted:** ${summary.stats.totalDeletions}`);
  console.log(`- **Active Days:** ${summary.stats.activeDays}`);
  console.log(
    `- **Average Commits/Day:** ${summary.stats.averageCommitsPerDay}\n`
  );

  if (summary.stats.topLanguages && summary.stats.topLanguages.length > 0) {
    console.log("## Top Languages\n");
    for (const lang of summary.stats.topLanguages.slice(0, 5)) {
      console.log(`- **${lang.language}:** ${lang.changes} changes`);
    }
    console.log("");
  }

  if (summary.stats.topFiles && summary.stats.topFiles.length > 0) {
    console.log("## Most Active Files\n");
    for (const file of summary.stats.topFiles.slice(0, 10)) {
      console.log(`- \`${file.file}\` (${file.changes} changes)`);
    }
    console.log("");
  }

  console.log("## Analyzed Repositories\n");
  for (const repo of summary.repositories) {
    console.log(`- ${repo.name} (\`${repo.path}\`)`);
  }
}
