import { WorkSummary } from "../types";
import {
  CommitSizeMetrics,
  TimePatterns,
  ActivityMetrics,
  WeeklyPattern,
} from "../formatters/types";
import {
  CommitSizeCalculator,
  TimePatternCalculator,
  ActivityCalculator,
  WeeklyPatternGenerator,
} from "../formatters/calculators";
import { AchievementGenerator } from "../formatters/achievement-generator";

/**
 * Repository contribution breakdown
 */
export interface RepositoryContribution {
  id?: number;
  name: string;
  path: string;
  remoteUrl?: string;
  commits: number;
  linesChanged: number;
  insertions: number;
  deletions: number;
}

/**
 * Comprehensive analytics computed from raw work summary data
 */
export interface AnalyticsData {
  timePatterns: TimePatterns;
  commitSizeMetrics: CommitSizeMetrics;
  activityMetrics: ActivityMetrics;
  weeklyPattern: WeeklyPattern[];
  achievements: string[];
  repositoryBreakdown: RepositoryContribution[];
}

/**
 * Enhanced work summary with pre-computed analytics
 */
export interface ComprehensiveWorkSummary extends WorkSummary {
  analytics: AnalyticsData;
}

/**
 * Analytics engine that computes all metrics once from raw data
 * This ensures consistent results across all output formats
 */
export class AnalyticsEngine {
  /**
   * Compute comprehensive analytics from a work summary
   */
  static computeAnalytics(summary: WorkSummary): ComprehensiveWorkSummary {
    const analytics = this.calculateAllMetrics(summary);

    return {
      ...summary,
      analytics,
    };
  }

  /**
   * Calculate all analytics metrics in one place
   */
  private static calculateAllMetrics(summary: WorkSummary): AnalyticsData {
    const { commits, repositories, stats, period } = summary;

    // Time-based patterns and insights
    const timePatterns = TimePatternCalculator.calculate(commits);

    // Commit size distribution
    const commitSizeMetrics = CommitSizeCalculator.calculate(commits);

    // Activity insights (streaks, productivity, consistency)
    const activityMetrics = ActivityCalculator.calculateMetrics(
      commits,
      period,
    );

    // Weekly activity pattern
    const weeklyPattern = WeeklyPatternGenerator.generate(commits);

    // Repository contribution breakdown
    const repositoryBreakdown = this.calculateRepositoryBreakdown(
      repositories,
      commits,
    );

    // Achievements based on all computed metrics
    const achievements = AchievementGenerator.generate(
      stats,
      timePatterns,
      repositories,
    );

    return {
      timePatterns,
      commitSizeMetrics,
      activityMetrics,
      weeklyPattern,
      achievements,
      repositoryBreakdown,
    };
  }

  /**
   * Calculate detailed repository contribution breakdown
   */
  private static calculateRepositoryBreakdown(
    repositories: any[],
    commits: any[],
  ): RepositoryContribution[] {
    return (
      repositories
        .map((repo) => {
          const repoCommits = commits.filter((c) => c.repoId === repo.id);
          const totalInsertions = repoCommits.reduce(
            (sum, c) => sum + c.insertions,
            0,
          );
          const totalDeletions = repoCommits.reduce(
            (sum, c) => sum + c.deletions,
            0,
          );

          return {
            id: repo.id,
            name: repo.name,
            path: repo.path,
            remoteUrl: repo.remoteUrl,
            commits: repoCommits.length,
            linesChanged: totalInsertions + totalDeletions,
            insertions: totalInsertions,
            deletions: totalDeletions,
          };
        })
        // Filter out repositories with no contributions
        .filter((repo) => repo.commits > 0 || repo.linesChanged > 0)
        // Sort by contributions (commits first, then lines changed)
        .sort((a, b) => {
          if (b.commits !== a.commits) {
            return b.commits - a.commits;
          }
          return b.linesChanged - a.linesChanged;
        })
    );
  }

  /**
   * Extract specific analytics for testing or specialized use
   */
  static extractTimePatterns(summary: WorkSummary): TimePatterns {
    return TimePatternCalculator.calculate(summary.commits);
  }

  static extractCommitSizeMetrics(summary: WorkSummary): CommitSizeMetrics {
    return CommitSizeCalculator.calculate(summary.commits);
  }

  static extractActivityMetrics(summary: WorkSummary): ActivityMetrics {
    return ActivityCalculator.calculateMetrics(summary.commits, summary.period);
  }

  static extractWeeklyPattern(summary: WorkSummary): WeeklyPattern[] {
    return WeeklyPatternGenerator.generate(summary.commits);
  }
}
