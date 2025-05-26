import { Command } from "commander";
import { DataAggregator } from "../../core/data-aggregator";
import { DateUtils } from "../../utils/date-utils";
import { GitUtils } from "../../utils/git-utils";
import { PeriodType } from "../../types";
import { formatSummary, OutputFormat } from "../../formatters";
import { log } from "../../utils/logger";
import { formatRepositoryDetail } from "../../formatters/repository-detail-formatter";

/**
 * Add summary commands to the CLI program
 */
export function addSummaryCommands(
  program: Command,
  dataAggregator: DataAggregator
) {
  // Create predefined summary commands
  const summaryPeriods: Array<{ period: PeriodType; description: string }> = [
    { period: "1week", description: "Last week summary" },
    { period: "1month", description: "Last month summary" },
    { period: "1year", description: "Last year summary" },
    { period: "ytd", description: "Year to date summary" },
  ];

  for (const { period, description } of summaryPeriods) {
    program
      .command(period.replace(/\d+/, ""))
      .description(description)
      .option("-r, --repos <repos...>", "Specific repositories to analyze")
      .option(
        "-f, --format <format>",
        "Output format (text, json, markdown)",
        "text"
      )
      .option("-a, --author <author>", "Filter commits by author name or email")
      .option("--me", "Filter commits by current git user")
      .option("-v, --verbose", "Verbose output")
      .action(async (options) => {
        try {
          if (options.verbose) {
            log.info(`📊 Generating ${description.toLowerCase()}...`, "cli");
          }

          // Handle author filtering
          let author = options.author;
          if (options.me) {
            const currentUser = GitUtils.getCurrentUser();
            if (!currentUser) {
              log.error(
                "Could not determine current git user. Please set git config user.name or user.email",
                undefined,
                "cli"
              );
              process.exit(1);
            }
            author = currentUser;
            if (options.verbose) {
              log.info(
                `🔍 Filtering commits by current user: ${author}`,
                "cli"
              );
            }
          }

          const timePeriod = DateUtils.getPeriod(period);
          const summary = await dataAggregator.generateWorkSummary(
            timePeriod,
            options.repos,
            author
          );

          formatSummary(
            summary,
            options.format as OutputFormat,
            options.verbose
          );
        } catch (error) {
          log.error("Error generating summary", error as Error, "cli");
          process.exit(1);
        }
      });
  }

  // Special months command that accepts a numeric argument
  program
    .command("months")
    .description("Generate summary for specified number of months")
    .argument("[count]", "Number of months (default: 3)", "3")
    .option("-r, --repos <repos...>", "Specific repositories to analyze")
    .option(
      "-f, --format <format>",
      "Output format (text, json, markdown)",
      "text"
    )
    .option("-a, --author <author>", "Filter commits by author name or email")
    .option("--me", "Filter commits by current git user")
    .option("-v, --verbose", "Verbose output")
    .action(async (count: string, options) => {
      try {
        const monthCount = parseInt(count, 10);
        if (isNaN(monthCount) || monthCount <= 0) {
          log.error(
            "Invalid month count. Please provide a positive number.",
            undefined,
            "cli"
          );
          process.exit(1);
        }

        const description = `Last ${monthCount} month${monthCount === 1 ? "" : "s"} summary`;

        if (options.verbose) {
          log.info(`📊 Generating ${description.toLowerCase()}...`, "cli");
        }

        // Handle author filtering
        let author = options.author;
        if (options.me) {
          const currentUser = GitUtils.getCurrentUser();
          if (!currentUser) {
            log.error(
              "Could not determine current git user. Please set git config user.name or user.email",
              undefined,
              "cli"
            );
            process.exit(1);
          }
          author = currentUser;
          if (options.verbose) {
            log.info(`🔍 Filtering commits by current user: ${author}`, "cli");
          }
        }

        // Create custom time period for the specified number of months
        const now = new Date();
        const startDate = new Date(now);
        startDate.setMonth(now.getMonth() - monthCount);

        const timePeriod = DateUtils.getPeriod("custom", startDate, now);
        // Override the label to reflect the actual period
        timePeriod.label = `Last ${monthCount} Month${monthCount === 1 ? "" : "s"}`;

        const summary = await dataAggregator.generateWorkSummary(
          timePeriod,
          options.repos,
          author
        );

        formatSummary(summary, options.format as OutputFormat, options.verbose);
      } catch (error) {
        log.error("Error generating summary", error as Error, "cli");
        process.exit(1);
      }
    });

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
    .option("-a, --author <author>", "Filter commits by author name or email")
    .option("--me", "Filter commits by current git user")
    .option("-v, --verbose", "Verbose output")
    .action(async (options) => {
      try {
        const startDate = new Date(options.from);
        const endDate = new Date(options.to);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          log.error(
            "Invalid date format. Use YYYY-MM-DD format.",
            undefined,
            "cli"
          );
          process.exit(1);
        }

        if (startDate >= endDate) {
          log.error("Start date must be before end date.", undefined, "cli");
          process.exit(1);
        }

        if (options.verbose) {
          log.info(
            `📊 Generating summary for ${options.from} to ${options.to}...`,
            "cli"
          );
        }

        // Handle author filtering
        let author = options.author;
        if (options.me) {
          const currentUser = GitUtils.getCurrentUser();
          if (!currentUser) {
            log.error(
              "Could not determine current git user. Please set git config user.name or user.email",
              undefined,
              "cli"
            );
            process.exit(1);
          }
          author = currentUser;
          if (options.verbose) {
            log.info(`🔍 Filtering commits by current user: ${author}`, "cli");
          }
        }

        const timePeriod = DateUtils.getPeriod("1week", startDate, endDate);
        const summary = await dataAggregator.generateWorkSummary(
          timePeriod,
          options.repos,
          author
        );

        formatSummary(summary, options.format as OutputFormat, options.verbose);
      } catch (error) {
        log.error("Error generating summary", error as Error, "cli");
        process.exit(1);
      }
    });

  // Repository detail command
  program
    .command("repo-detail")
    .description("Analyze a specific repository in detail")
    .requiredOption("-r, --repo <repo>", "Repository name or path to analyze")
    .option(
      "--period <period>",
      "Time period (1week, 1month, 3months, 6months, 1year, ytd)",
      "1month"
    )
    .option("--from <date>", "Start date (YYYY-MM-DD) for custom period")
    .option("--to <date>", "End date (YYYY-MM-DD) for custom period")
    .option("-a, --author <author>", "Filter commits by author name or email")
    .option("--me", "Filter commits by current git user")
    .option(
      "-f, --format <format>",
      "Output format (text, json, markdown)",
      "text"
    )
    .option("-v, --verbose", "Verbose output")
    .action(async (options) => {
      try {
        if (options.verbose) {
          log.info(`🔍 Analyzing repository: ${options.repo}...`, "cli");
        }

        // Handle author filtering
        let author = options.author;
        if (options.me) {
          const currentUser = GitUtils.getCurrentUser();
          if (!currentUser) {
            log.error(
              "Could not determine current git user. Please set git config user.name or user.email",
              undefined,
              "cli"
            );
            process.exit(1);
          }
          author = currentUser;
          if (options.verbose) {
            log.info(`🔍 Filtering commits by current user: ${author}`, "cli");
          }
        }

        // Determine time period
        let timePeriod;
        if (options.from && options.to) {
          const startDate = new Date(options.from);
          const endDate = new Date(options.to);

          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            log.error(
              "Invalid date format. Use YYYY-MM-DD format.",
              undefined,
              "cli"
            );
            process.exit(1);
          }

          if (startDate >= endDate) {
            log.error("Start date must be before end date.", undefined, "cli");
            process.exit(1);
          }

          timePeriod = DateUtils.getPeriod("1week", startDate, endDate);
        } else {
          timePeriod = DateUtils.getPeriod(options.period as any);
        }

        // Generate summary for the specific repository
        const summary = await dataAggregator.generateWorkSummary(
          timePeriod,
          [options.repo],
          author
        );

        // Format and display the detailed repository analysis
        await formatRepositoryDetail(
          summary,
          options.format as OutputFormat,
          options.verbose
        );
      } catch (error) {
        log.error("Error analyzing repository", error as Error, "cli");
        process.exit(1);
      }
    });
}
