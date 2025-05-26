import { Commit, TimePeriod } from '../types';
import { DateUtils } from '../utils/date-utils';
import {
  ActivityMetrics,
  COMMIT_SIZE_THRESHOLDS,
  CommitSizeMetrics,
  DISPLAY_LIMITS,
  TimePatterns,
  WeeklyPattern,
} from './types';

/**
 * Helper function to find most productive day
 */
export function getMostProductiveDay(commits: Commit[]): string {
  if (!commits || commits.length === 0) return 'N/A';

  const dayCommits = new Map<string, number>();
  commits.forEach(commit => {
    const day = DateUtils.formatDate(commit.date);
    dayCommits.set(day, (dayCommits.get(day) || 0) + 1);
  });

  let maxDay = '';
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
  static calculate(commits: Commit[]): CommitSizeMetrics {
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
      .map(c => c.insertions + c.deletions)
      .sort((a: number, b: number) => a - b);

    const median = commitSizes[Math.floor(commitSizes.length / 2)] || 0;
    const small = commitSizes.filter(
      size => size <= COMMIT_SIZE_THRESHOLDS.SMALL
    ).length;
    const medium = commitSizes.filter(
      size =>
        size > COMMIT_SIZE_THRESHOLDS.SMALL &&
        size <= COMMIT_SIZE_THRESHOLDS.MEDIUM
    ).length;
    const large = commitSizes.filter(
      size => size > COMMIT_SIZE_THRESHOLDS.MEDIUM
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
 * Calculator for time-based patterns with enhanced granular analysis
 */
export class TimePatternCalculator {
  static calculate(commits: Commit[]): TimePatterns {
    if (!commits || commits.length === 0) {
      return {
        workingHoursCommits: 0,
        weekendCommits: 0,
        workingHoursPercent: 0,
        weekendPercent: 0,
        hourlyPattern: [],
        timePeriods: [],
        peakHour: { hour: 0, commits: 0, label: 'N/A' },
        earlyBird: { commits: 0, percentage: 0 },
        nightOwl: { commits: 0, percentage: 0 },
        totalCommits: 0,
      };
    }

    const totalCommits = commits.length;

    // Legacy calculations for backward compatibility
    const workingHoursCommits = commits.filter(c =>
      DateUtils.isWorkingHours(c.date)
    ).length;

    const weekendCommits = commits.filter(c =>
      DateUtils.isWeekend(c.date)
    ).length;

    // Enhanced hourly pattern analysis
    const hourlyCommitMap = DateUtils.getHourlyCommitPattern(commits);
    const maxHourlyCommits = Math.max(...hourlyCommitMap.values());

    const hourlyPattern = Array.from(hourlyCommitMap.entries()).map(
      ([hour, commits]) => {
        const percentage =
          totalCommits > 0 ? Math.round((commits / totalCommits) * 100) : 0;
        const barPercentage =
          maxHourlyCommits > 0
            ? Math.round((commits / maxHourlyCommits) * 100)
            : 0;
        const barLength = Math.max(1, Math.round(barPercentage / 5)); // Scale to reasonable length
        const bar =
          '▓'.repeat(barLength) + '░'.repeat(Math.max(0, 20 - barLength));

        return {
          hour,
          commits,
          percentage,
          bar,
          label: DateUtils.formatHourLabel(hour),
        };
      }
    );

    // Find peak hour
    const peakHour = Array.from(hourlyCommitMap.entries()).reduce(
      (peak, [hour, commits]) =>
        commits > peak.commits
          ? { hour, commits, label: DateUtils.formatHourLabel(hour) }
          : peak,
      { hour: 0, commits: 0, label: 'N/A' }
    );

    // Time period analysis
    const timePeriods = this.calculateTimePeriods(commits, totalCommits);

    // Early bird and night owl analysis
    const earlyBirdCommits = commits.filter(c =>
      DateUtils.isEarlyBird(c.date)
    ).length;
    const nightOwlCommits = commits.filter(c =>
      DateUtils.isNightOwl(c.date)
    ).length;

    return {
      // Legacy fields
      workingHoursCommits,
      weekendCommits,
      workingHoursPercent: Math.round(
        (workingHoursCommits / totalCommits) * 100
      ),
      weekendPercent: Math.round((weekendCommits / totalCommits) * 100),

      // Enhanced fields
      hourlyPattern,
      timePeriods,
      peakHour,
      earlyBird: {
        commits: earlyBirdCommits,
        percentage: Math.round((earlyBirdCommits / totalCommits) * 100),
      },
      nightOwl: {
        commits: nightOwlCommits,
        percentage: Math.round((nightOwlCommits / totalCommits) * 100),
      },
      totalCommits,
    };
  }

  private static calculateTimePeriods(commits: Commit[], totalCommits: number) {
    const periodMap = new Map<
      string,
      { commits: number; range: string; isWorking: boolean }
    >();

    // Initialize periods
    const periods = [
      { name: 'Early Morning', range: '6AM-9AM', isWorking: false },
      { name: 'Morning', range: '9AM-12PM', isWorking: true },
      { name: 'Lunch Time', range: '12PM-2PM', isWorking: true },
      { name: 'Afternoon', range: '2PM-6PM', isWorking: true },
      { name: 'Evening', range: '6PM-9PM', isWorking: false },
      { name: 'Night', range: '9PM-2AM', isWorking: false },
      { name: 'Late Night', range: '2AM-6AM', isWorking: false },
    ];

    periods.forEach(period => {
      periodMap.set(period.name, {
        commits: 0,
        range: period.range,
        isWorking: period.isWorking,
      });
    });

    // Count commits by period
    commits.forEach((commit: Commit) => {
      const hour = commit.date.getHours();
      const periodName = DateUtils.getTimePeriodName(hour);
      const period = periodMap.get(periodName);
      if (period) {
        period.commits++;
      }
    });

    // Convert to array with percentages
    return Array.from(periodMap.entries()).map(([name, data]) => ({
      name,
      timeRange: data.range,
      commits: data.commits,
      percentage:
        totalCommits > 0 ? Math.round((data.commits / totalCommits) * 100) : 0,
      isWorkingTime: data.isWorking,
    }));
  }
}

/**
 * Calculator for activity metrics and streaks
 */
export class ActivityCalculator {
  static calculateMetrics(
    commits: Commit[],
    period: TimePeriod
  ): ActivityMetrics {
    if (!commits || commits.length === 0) {
      return {
        longestStreak: 0,
        mostProductiveDay: 'N/A',
        consistencyScore: 0,
      };
    }

    const longestStreak = this.calculateLongestStreak(commits);
    const mostProductiveDay = getMostProductiveDay(commits);
    const activeDays = [
      ...new Set(commits.map(c => DateUtils.formatDate(c.date))),
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

  private static calculateLongestStreak(commits: Commit[]): number {
    const commitDays = [
      ...new Set(commits.map(c => DateUtils.formatDate(c.date))),
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
  static generate(commits: Commit[]): WeeklyPattern[] {
    if (!commits || commits.length === 0) {
      return [];
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayCommits = new Array(7).fill(0);

    commits.forEach(commit => {
      dayCommits[commit.date.getDay()]++;
    });

    const maxDayCommits = Math.max(...dayCommits);

    return dayNames.map((dayName, index) => {
      const count = dayCommits[index];
      const percentage =
        maxDayCommits > 0 ? Math.round((count / maxDayCommits) * 100) : 0;
      const barLength = Math.max(1, Math.round(percentage / 10));
      const bar =
        '▓'.repeat(barLength) +
        '░'.repeat(Math.max(0, DISPLAY_LIMITS.WEEKLY_BAR_LENGTH - barLength));

      return {
        dayName,
        commits: count,
        percentage,
        bar,
      };
    });
  }
}
