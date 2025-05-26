import { printTextSummary } from "./text-formatter";
import { printMarkdownSummary } from "./markdown-formatter";
import { log } from "../utils/logger";
import { WorkSummary } from "../types";
import {
  AnalyticsEngine,
  ComprehensiveWorkSummary,
} from "../core/analytics-engine";

export { printTextSummary, printMarkdownSummary };

export type OutputFormat = "text" | "json" | "markdown";

/**
 * Format and output summary based on the specified format
 * Now computes analytics once and uses them across all formatters
 */
export function formatSummary(
  summary: WorkSummary,
  format: OutputFormat,
  verbose: boolean = false
) {
  // Compute comprehensive analytics once
  const comprehensiveSummary = AnalyticsEngine.computeAnalytics(summary);

  switch (format) {
    case "json":
      log.output(JSON.stringify(comprehensiveSummary, null, 2), "formatter");
      break;
    case "markdown":
      printMarkdownSummary(comprehensiveSummary);
      break;
    case "text":
    default:
      printTextSummary(comprehensiveSummary, verbose);
      break;
  }
}
