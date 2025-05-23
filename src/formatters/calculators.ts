import { DateUtils } from "../utils/date-utils";
import {
  CommitSizeMetrics,
  TimePatterns,
  ActivityMetrics,
  WeeklyPattern,
  COMMIT_SIZE_THRESHOLDS,
  DISPLAY_LIMITS,
} from "./types";

/**
 * Helper function to find most productive day
 */
export function getMostProductiveDay(commits: any[]): string {
  if (!commits || commits.length === 0) return "N/A";

  const dayCommits = new Map<string, number>();
  commits.forEach((commit) => {
    const day = DateUtils.formatDate(commit.date);
    dayCommits.set(day, (dayCommits.get(day) || 0) + 1);
  });

  let maxDay = "";
  let maxCommits = 0;
  for (const [day, count] of dayCommits) {
    if (count > maxCommits) {
      maxCommits = count;
      maxDay = day;
    }
  }

  return `${maxDay} (${maxCommits} commits)`;
}

/**
 * Calculator for commit size metrics
 */
export class CommitSizeCalculator {
  static calculate(commits: any[]): CommitSizeMetrics {
    if (!commits || commits.length === 0) {
      return {
        median: 0,
        small: 0,
        medium: 0,
        large: 0,
        smallPercentage: 0,
        mediumPercentage: 0,
        largePercentage: 0,
      };
    }

    const commitSizes = commits
      .map((c: any) => c.insertions + c.deletions)
      .sort((a: number, b: number) => a - b);

    const median = commitSizes[Math.floor(commitSizes.length / 2)] || 0;
    const small = commitSizes.filter(
      (size) => size <= COMMIT_SIZE_THRESHOLDS.SMALL
    ).length;
    const medium = commitSizes.filter(
      (size) =>
        size > COMMIT_SIZE_THRESHOLDS.SMALL &&
        size <= COMMIT_SIZE_THRESHOLDS.MEDIUM
    ).length;
    const large = commitSizes.filter(
      (size) => size > COMMIT_SIZE_THRESHOLDS.MEDIUM
    ).length;

    const total = commits.length;
    return {
      median,
      small,
      medium,
      large,
      smallPercentage: Math.round((small / total) * 100),
      mediumPercentage: Math.round((medium / total) * 100),
      largePercentage: Math.round((large / total) * 100),
    };
  }
}

/**
 * Calculator for time-based patterns
 */
export class TimePatternCalculator {
  static calculate(commits: any[]): TimePatterns {
    if (!commits || commits.length === 0) {
      return {
        workingHoursCommits: 0,
        weekendCommits: 0,
        workingHoursPercent: 0,
        weekendPercent: 0,
      };
    }

    const workingHoursCommits = commits.filter((c: any) =>
      DateUtils.isWorkingHours(c.date)
    ).length;

    const weekendCommits = commits.filter((c: any) =>
      DateUtils.isWeekend(c.date)
    ).length;

    const total = commits.length;
    return {
      workingHoursCommits,
      weekendCommits,
      workingHoursPercent: Math.round((workingHoursCommits / total) * 100),
      weekendPercent: Math.round((weekendCommits / total) * 100),
    };
  }
}

/**
 * Calculator for activity metrics and streaks
 */
export class ActivityCalculator {
  static calculateMetrics(commits: any[], period: any): ActivityMetrics {
    if (!commits || commits.length === 0) {
      return {
        longestStreak: 0,
        mostProductiveDay: "N/A",
        consistencyScore: 0,
      };
    }

    const longestStreak = this.calculateLongestStreak(commits);
    const mostProductiveDay = getMostProductiveDay(commits);
    const activeDays = [
      ...new Set(commits.map((c: any) => DateUtils.formatDate(c.date))),
    ].length;
    const totalDays = DateUtils.getDaysInPeriod(
      period.startDate,
      period.endDate
    );
    const consistencyScore = Math.round((activeDays / totalDays) * 100);

    return {
      longestStreak,
      mostProductiveDay,
      consistencyScore,
    };
  }

  private static calculateLongestStreak(commits: any[]): number {
    const commitDays = [
      ...new Set(commits.map((c: any) => DateUtils.formatDate(c.date))),
    ].sort();

    let currentStreak = 0;
    let maxStreak = 0;
    let lastDate: Date | null = null;

    for (const day of commitDays) {
      const date = new Date(day as string);
      if (lastDate) {
        const daysDiff = Math.round(
          (date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff === 1) {
          currentStreak++;
        } else {
          maxStreak = Math.max(maxStreak, currentStreak);
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      lastDate = date;
    }
    return Math.max(maxStreak, currentStreak);
  }
}

/**
 * Generator for weekly activity patterns
 */
export class WeeklyPatternGenerator {
  static generate(commits: any[]): WeeklyPattern[] {
    if (!commits || commits.length === 0) {
      return [];
    }

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayCommits = new Array(7).fill(0);

    commits.forEach((commit: any) => {
      dayCommits[commit.date.getDay()]++;
    });

    const maxDayCommits = Math.max(...dayCommits);

    return dayNames.map((dayName, index) => {
      const count = dayCommits[index];
      const percentage =
        maxDayCommits > 0 ? Math.round((count / maxDayCommits) * 100) : 0;
      const barLength = Math.max(1, Math.round(percentage / 10));
      const bar =
        "▓".repeat(barLength) +
        "░".repeat(Math.max(0, DISPLAY_LIMITS.WEEKLY_BAR_LENGTH - barLength));

      return {
        dayName,
        commits: count,
        percentage,
        bar,
      };
    });
  }
}
