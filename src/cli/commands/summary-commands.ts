import { Command } from "commander";
import { DataAggregator } from "../../core/data-aggregator";
import { DateUtils } from "../../utils/date-utils";
import { GitUtils } from "../../utils/git-utils";
import { PeriodType } from "../../types";
import { formatSummary, OutputFormat } from "../../formatters";

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
    { period: "3months", description: "Last 3 months summary" },
    { period: "6months", description: "Last 6 months summary" },
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
            console.log(`📊 Generating ${description.toLowerCase()}...`);
          }

          // Handle author filtering
          let author = options.author;
          if (options.me) {
            const currentUser = GitUtils.getCurrentUser();
            if (!currentUser) {
              console.error(
                "❌ Could not determine current git user. Please set git config user.name or user.email"
              );
              process.exit(1);
            }
            author = currentUser;
            if (options.verbose) {
              console.log(`🔍 Filtering commits by current user: ${author}`);
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
          console.error("❌ Error generating summary:", error);
          process.exit(1);
        }
      });
  }

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

        // Handle author filtering
        let author = options.author;
        if (options.me) {
          const currentUser = GitUtils.getCurrentUser();
          if (!currentUser) {
            console.error(
              "❌ Could not determine current git user. Please set git config user.name or user.email"
            );
            process.exit(1);
          }
          author = currentUser;
          if (options.verbose) {
            console.log(`🔍 Filtering commits by current user: ${author}`);
          }
        }

        const timePeriod = DateUtils.getPeriod("1week", startDate, endDate); // Using custom dates
        const summary = await dataAggregator.generateWorkSummary(
          timePeriod,
          options.repos,
          author
        );

        formatSummary(summary, options.format as OutputFormat, options.verbose);
      } catch (error) {
        console.error("❌ Error generating summary:", error);
        process.exit(1);
      }
    });
}
