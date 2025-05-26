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
    totalCommits: number,
    verbose = false
  ): void {
    log.output("⏰ Time Patterns:", this.CONTEXT);

    // Overview with enhanced insights
    log.output(
      `  📊 Total Activity: ${timePatterns.totalCommits} commits analyzed`,
      this.CONTEXT
    );

    log.output(
      `  🏢 Working Hours (9AM-6PM): ${timePatterns.workingHoursCommits} commits (${timePatterns.workingHoursPercent}%)`,
      this.CONTEXT
    );

    log.output(
      `  📅 Weekend Activity: ${timePatterns.weekendCommits} commits (${timePatterns.weekendPercent}%)`,
      this.CONTEXT
    );

    // Peak activity insights
    if (timePatterns.peakHour.commits > 0) {
      log.output(
        `  🎯 Peak Hour: ${timePatterns.peakHour.label} (${timePatterns.peakHour.commits} commits)`,
        this.CONTEXT
      );
    }

    // Working patterns insights
    if (timePatterns.earlyBird.commits > 0) {
      log.output(
        `  🌅 Early Bird: ${timePatterns.earlyBird.commits} commits (${timePatterns.earlyBird.percentage}%) between 6-9AM`,
        this.CONTEXT
      );
    }

    if (timePatterns.nightOwl.commits > 0) {
      log.output(
        `  🦉 Night Owl: ${timePatterns.nightOwl.commits} commits (${timePatterns.nightOwl.percentage}%) between 9PM-2AM`,
        this.CONTEXT
      );
    }

    log.output("", this.CONTEXT);

    // Time periods breakdown
    if (timePatterns.timePeriods.length > 0) {
      log.output("📋 Activity by Time Period:", this.CONTEXT);
      for (const period of timePatterns.timePeriods) {
        if (period.commits > 0) {
          const workingIndicator = period.isWorkingTime ? "🏢" : "🏠";
          const barLength = Math.max(1, Math.round(period.percentage / 3));
          const bar =
            "▓".repeat(barLength) + "░".repeat(Math.max(0, 33 - barLength));

          log.output(
            `  ${workingIndicator} ${period.name.padEnd(13)} ${period.timeRange.padEnd(9)} │${bar}│ ${period.commits.toString().padStart(3)} commits (${period.percentage.toString().padStart(2)}%)`,
            this.CONTEXT
          );
        }
      }
      log.output("", this.CONTEXT);
    }

    // Detailed hourly breakdown (only in verbose mode)
    if (verbose && timePatterns.hourlyPattern.length > 0) {
      log.output("⏰ Hourly Activity Pattern:", this.CONTEXT);
      log.output(
        "   Hour  │Activity Distribution      │Commits│",
        this.CONTEXT
      );
      log.output(
        "   ─────┼────────────────────────────┼───────┤",
        this.CONTEXT
      );

      for (const hour of timePatterns.hourlyPattern) {
        if (hour.commits > 0) {
          const workingHour = hour.hour >= 9 && hour.hour < 18 ? "🏢" : "🏠";
          log.output(
            `   ${hour.label.padEnd(4)} │${hour.bar}│${hour.commits.toString().padStart(6)} │ ${workingHour}`,
            this.CONTEXT
          );
        }
      }
      log.output("", this.CONTEXT);
    } else if (timePatterns.hourlyPattern.length > 0) {
      log.output(
        "💡 Use --verbose to see detailed hourly breakdown",
        this.CONTEXT
      );
      log.output("", this.CONTEXT);
    }
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

  static formatTopLanguages(
    topLanguages: any[],
    verbose: boolean = false,
    otherFilesAnalysis?: any
  ): void {
    if (!topLanguages || topLanguages.length === 0) return;

    const totalChanges = topLanguages.reduce(
      (sum: number, lang: any) => sum + lang.changes,
      0
    );
    log.output("💻 Top Languages:", this.CONTEXT);

    // Show more languages if we have good detection (less "Other" dominance)
    const otherLanguage = topLanguages.find(
      (lang) => lang.language === "Other"
    );
    const hasOtherDominance =
      otherLanguage && otherLanguage.changes / totalChanges > 0.5;
    const displayLimit = hasOtherDominance
      ? DISPLAY_LIMITS.TOP_LANGUAGES
      : Math.min(12, topLanguages.length);

    for (const lang of topLanguages.slice(0, displayLimit)) {
      const percentage =
        totalChanges > 0 ? Math.round((lang.changes / totalChanges) * 100) : 0;
      const bar = "█".repeat(Math.max(1, Math.round(percentage / 5)));
      log.output(
        `  ${lang.language.padEnd(12)} ${lang.changes.toLocaleString().padStart(6)} changes (${percentage}%) ${bar}`,
        this.CONTEXT
      );
    }

    // Show helpful tip about "Other" category if it's significant
    if (otherLanguage && otherLanguage.changes / totalChanges > 0.3) {
      log.output("", this.CONTEXT);
      log.output(
        "💡 Large 'Other' category detected. This usually includes:",
        this.CONTEXT
      );
      log.output(
        "   • Binary files (images, archives, executables)",
        this.CONTEXT
      );
      log.output(
        "   • Generated files (build artifacts, dependencies)",
        this.CONTEXT
      );
      log.output(
        "   • Files without extensions or with uncommon extensions",
        this.CONTEXT
      );

      if (!verbose) {
        log.output(
          "   • Use --verbose flag for detailed breakdown",
          this.CONTEXT
        );
      } else if (otherFilesAnalysis) {
        log.output("", this.CONTEXT);
        log.output("🔍 'Other' Files Analysis:", this.CONTEXT);

        if (otherFilesAnalysis.commonExtensions?.length > 0) {
          log.output(
            "   📋 Most common unrecognized extensions:",
            this.CONTEXT
          );
          for (const ext of otherFilesAnalysis.commonExtensions.slice(0, 5)) {
            log.output(
              `      ${ext.extension}: ${ext.count} files`,
              this.CONTEXT
            );
          }
        }

        if (otherFilesAnalysis.otherFiles?.length > 0) {
          log.output("   📄 Top 'Other' files by changes:", this.CONTEXT);
          for (const file of otherFilesAnalysis.otherFiles.slice(0, 8)) {
            const fileName = file.filePath.split("/").pop() || file.filePath;
            log.output(
              `      ${fileName}: ${file.changes.toLocaleString()} changes`,
              this.CONTEXT
            );
          }
        }
      }
    }

    log.output("", this.CONTEXT);
  }

  static formatRepositoryBreakdown(summary: any, verbose: boolean): void {
    if (!verbose || summary.repositories.length <= 1) return;

    // Calculate contributions for each repository and sort by most contributions
    const reposWithContributions = summary.repositories
      .map((repo: any) => {
        const repoCommits =
          summary.commits?.filter((c: any) => c.repoId === repo.id).length || 0;
        const repoLines =
          summary.commits
            ?.filter((c: any) => c.repoId === repo.id)
            .reduce(
              (sum: number, c: any) => sum + c.insertions + c.deletions,
              0
            ) || 0;

        return {
          ...repo,
          commits: repoCommits,
          linesChanged: repoLines,
        };
      })
      // Filter out repositories with no contributions
      .filter((repo: any) => repo.commits > 0 || repo.linesChanged > 0)
      .sort((a: any, b: any) => {
        // Sort by commits first (descending), then by lines changed (descending)
        if (b.commits !== a.commits) {
          return b.commits - a.commits;
        }
        return b.linesChanged - a.linesChanged;
      });

    // Only show the breakdown if there are repositories with contributions
    if (reposWithContributions.length === 0) {
      return;
    }

    log.output(
      "📁 Repository Breakdown (sorted by contributions):",
      this.CONTEXT
    );
    for (const repo of reposWithContributions) {
      log.output(`  📂 ${repo.name}`, this.CONTEXT);
      log.output(`     ${repo.path}`, this.CONTEXT);
      log.output(
        `     ${repo.commits} commits, ${repo.linesChanged.toLocaleString()} lines changed`,
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
    SummaryFormatter.formatTimePatterns(
      timePatterns,
      summary.commits.length,
      verbose
    );

    const commitMetrics = CommitSizeCalculator.calculate(summary.commits);
    SummaryFormatter.formatCommitSizes(commitMetrics);

    SummaryFormatter.formatTopLanguages(
      summary.stats.topLanguages,
      verbose,
      summary.stats.otherFilesAnalysis
    );
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
