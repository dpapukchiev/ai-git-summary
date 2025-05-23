import { printTextSummary } from "./text-formatter";
import { printMarkdownSummary } from "./markdown-formatter";

export { printTextSummary, printMarkdownSummary };

export type OutputFormat = "text" | "json" | "markdown";

/**
 * Format and output summary based on the specified format
 */
export function formatSummary(
  summary: any,
  format: OutputFormat,
  verbose: boolean = false
) {
  switch (format) {
    case "json":
      console.log(JSON.stringify(summary, null, 2));
      break;
    case "markdown":
      printMarkdownSummary(summary);
      break;
    case "text":
    default:
      printTextSummary(summary, verbose);
      break;
  }
}
