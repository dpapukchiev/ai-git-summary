import { DateUtils } from "../utils/date-utils";
import { log } from "../utils/logger";
import {
  CommitSizeMetrics,
  TimePatterns,
  ActivityMetrics,
  WeeklyPattern,
  COMMIT_SIZE_THRESHOLDS,
  DISPLAY_LIMITS,
} from "./types";
import {
  CommitSizeCalculator,
  TimePatternCalculator,
  ActivityCalculator,
  WeeklyPatternGenerator,
} from "./calculators";
import { AchievementGenerator } from "./achievement-generator";

/**
 * Formatter for different sections of the summary
 */
class SummaryFormatter {
  private static readonly CONTEXT = "text-formatter";

  static formatHeader(summary: any): void {
    log.output(`\n📊 Work Summary: ${summary.period.label}\n`, this.CONTEXT);
    log.output(
      `Period: ${DateUtils.formatDate(summary.period.startDate)} to ${DateUtils.formatDate(summary.period.endDate)}`,
      this.CONTEXT
    );
    log.output(`Repositories: ${summary.repositories.length}\n`, this.CONTEXT);
  }

  static formatOverallStats(summary: any): void {
    log.output("📈 Overall Statistics:", this.CONTEXT);
    log.output(
      `  Commits: ${summary.stats.totalCommits.toLocaleString()}`,
      this.CONTEXT
    );
    log.output(
      `  Files Changed: ${summary.stats.totalFilesChanged.toLocaleString()}`,
      this.CONTEXT
    );
    log.output(
      `  Lines Added: +${summary.stats.totalInsertions.toLocaleString()}`,
      this.CONTEXT
    );
    log.output(
      `  Lines Deleted: -${summary.stats.totalDeletions.toLocaleString()}`,
      this.CONTEXT
    );

    const netChange =
      summary.stats.totalInsertions - summary.stats.totalDeletions;
    log.output(
      `  Net Change: ${netChange > 0 ? "+" : ""}${netChange.toLocaleString()} lines`,
      this.CONTEXT
    );
    log.output(`  Active Days: ${summary.stats.activeDays}`, this.CONTEXT);
    log.output(
      `  Average Commits/Day: ${summary.stats.averageCommitsPerDay}`,
      this.CONTEXT
    );

    const linesPerCommit =
      summary.stats.totalCommits > 0
        ? Math.round(
            (summary.stats.totalInsertions + summary.stats.totalDeletions) /
              summary.stats.totalCommits
          )
        : 0;
    const commitFrequency =
      summary.stats.activeDays > 0
        ? (summary.stats.totalCommits / summary.stats.activeDays).toFixed(1)
        : "0";

    log.output(
      `  Lines Changed/Commit: ${linesPerCommit.toLocaleString()}`,
      this.CONTEXT
    );
    log.output(`  Commits/Active Day: ${commitFrequency}\n`, this.CONTEXT);
  }

  static formatTimePatterns(
    timePatterns: TimePatterns,
    totalCommits: number
  ): void {
    log.output("⏰ Time Patterns:", this.CONTEXT);
    log.output(
      `  Working Hours (9-18): ${timePatterns.workingHoursCommits} commits (${timePatterns.workingHoursPercent}%)`,
      this.CONTEXT
    );
    log.output(
      `  Weekend Commits: ${timePatterns.weekendCommits} commits (${timePatterns.weekendPercent}%)`,
      this.CONTEXT
    );
    const afterHoursCommits = totalCommits - timePatterns.workingHoursCommits;
    log.output(
      `  After Hours: ${afterHoursCommits} commits (${100 - timePatterns.workingHoursPercent}%)\n`,
      this.CONTEXT
    );
  }

  static formatCommitSizes(metrics: CommitSizeMetrics): void {
    log.output("📏 Commit Sizes:", this.CONTEXT);
    log.output(`  Median lines changed: ${metrics.median}`, this.CONTEXT);
    log.output(
      `  Small commits (≤${COMMIT_SIZE_THRESHOLDS.SMALL} lines): ${metrics.small} (${metrics.smallPercentage}%)`,
      this.CONTEXT
    );
    log.output(
      `  Medium commits (${COMMIT_SIZE_THRESHOLDS.SMALL + 1}-${COMMIT_SIZE_THRESHOLDS.MEDIUM} lines): ${metrics.medium} (${metrics.mediumPercentage}%)`,
      this.CONTEXT
    );
    log.output(
      `  Large commits (>${COMMIT_SIZE_THRESHOLDS.MEDIUM} lines): ${metrics.large} (${metrics.largePercentage}%)\n`,
      this.CONTEXT
    );
  }

  static formatTopLanguages(topLanguages: any[]): void {
    if (!topLanguages || topLanguages.length === 0) return;

    const totalChanges = topLanguages.reduce(
      (sum: number, lang: any) => sum + lang.changes,
      0
    );
    log.output("💻 Top Languages:", this.CONTEXT);

    for (const lang of topLanguages.slice(0, DISPLAY_LIMITS.TOP_LANGUAGES)) {
      const percentage =
        totalChanges > 0 ? Math.round((lang.changes / totalChanges) * 100) : 0;
      const bar = "█".repeat(Math.max(1, Math.round(percentage / 5)));
      log.output(
        `  ${lang.language.padEnd(12)} ${lang.changes.toLocaleString().padStart(6)} changes (${percentage}%) ${bar}`,
        this.CONTEXT
      );
    }
    log.output("", this.CONTEXT);
  }

  static formatRepositoryBreakdown(summary: any, verbose: boolean): void {
    if (!verbose || summary.repositories.length <= 1) return;

    log.output("📁 Repository Breakdown:", this.CONTEXT);
    for (const repo of summary.repositories) {
      const repoCommits =
        summary.commits?.filter((c: any) => c.repoId === repo.id).length || 0;
      const repoLines =
        summary.commits
          ?.filter((c: any) => c.repoId === repo.id)
          .reduce(
            (sum: number, c: any) => sum + c.insertions + c.deletions,
            0
          ) || 0;

      log.output(`  📂 ${repo.name}`, this.CONTEXT);
      log.output(`     ${repo.path}`, this.CONTEXT);
      log.output(
        `     ${repoCommits} commits, ${repoLines.toLocaleString()} lines changed`,
        this.CONTEXT
      );
      if (repo.remoteUrl) {
        log.output(`     🔗 ${repo.remoteUrl}`, this.CONTEXT);
      }
    }
    log.output("", this.CONTEXT);
  }

  static formatTopFiles(topFiles: any[], verbose: boolean): void {
    if (!verbose || !topFiles || topFiles.length === 0) return;

    log.output("📄 Most Active Files:", this.CONTEXT);
    for (const file of topFiles.slice(0, DISPLAY_LIMITS.TOP_FILES)) {
      const activity = file.changes === 1 ? "change" : "changes";
      log.output(
        `  📝 ${file.file} (${file.changes} ${activity})`,
        this.CONTEXT
      );
    }
    log.output("", this.CONTEXT);
  }

  static formatActivityInsights(metrics: ActivityMetrics): void {
    log.output("🔥 Activity Insights:", this.CONTEXT);
    log.output(
      `  Longest streak: ${metrics.longestStreak} consecutive days`,
      this.CONTEXT
    );
    log.output(
      `  Most productive day: ${metrics.mostProductiveDay}`,
      this.CONTEXT
    );
    log.output(
      `  Consistency score: ${metrics.consistencyScore}%\n`,
      this.CONTEXT
    );
  }

  static formatWeeklyPattern(
    weeklyPattern: WeeklyPattern[],
    verbose: boolean
  ): void {
    if (!verbose || weeklyPattern.length === 0) return;

    log.output("📅 Weekly Activity Pattern:", this.CONTEXT);
    for (const day of weeklyPattern) {
      log.output(
        `  ${day.dayName} │${day.bar}│ ${day.commits} commits`,
        this.CONTEXT
      );
    }
    log.output("", this.CONTEXT);
  }

  static formatAchievements(achievements: string[]): void {
    log.output("🏆 Summary & Achievements:", this.CONTEXT);

    if (achievements.length > 0) {
      achievements.forEach((achievement) =>
        log.output(`  ${achievement}`, this.CONTEXT)
      );
    } else {
      log.output("  Keep coding to unlock achievements! 💪", this.CONTEXT);
    }
    log.output("", this.CONTEXT);
  }
}

/**
 * Main function to print detailed text summary to console
 */
export function printTextSummary(summary: any, verbose = false): void {
  SummaryFormatter.formatHeader(summary);
  SummaryFormatter.formatOverallStats(summary);

  if (summary.commits && summary.commits.length > 0) {
    const timePatterns = TimePatternCalculator.calculate(summary.commits);
    SummaryFormatter.formatTimePatterns(timePatterns, summary.commits.length);

    const commitMetrics = CommitSizeCalculator.calculate(summary.commits);
    SummaryFormatter.formatCommitSizes(commitMetrics);

    SummaryFormatter.formatTopLanguages(summary.stats.topLanguages);
    SummaryFormatter.formatRepositoryBreakdown(summary, verbose);
    SummaryFormatter.formatTopFiles(summary.stats.topFiles, verbose);

    const activityMetrics = ActivityCalculator.calculateMetrics(
      summary.commits,
      summary.period
    );
    SummaryFormatter.formatActivityInsights(activityMetrics);

    const weeklyPattern = WeeklyPatternGenerator.generate(summary.commits);
    SummaryFormatter.formatWeeklyPattern(weeklyPattern, verbose);

    const achievements = AchievementGenerator.generate(
      summary.stats,
      timePatterns,
      summary.repositories
    );
    SummaryFormatter.formatAchievements(achievements);
  }
}
