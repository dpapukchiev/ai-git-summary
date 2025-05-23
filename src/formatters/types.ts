// Types for better type safety
export interface CommitSizeMetrics {
  median: number;
  small: number;
  medium: number;
  large: number;
  smallPercentage: number;
  mediumPercentage: number;
  largePercentage: number;
}

export interface TimePatterns {
  workingHoursCommits: number;
  weekendCommits: number;
  workingHoursPercent: number;
  weekendPercent: number;
}

export interface ActivityMetrics {
  longestStreak: number;
  mostProductiveDay: string;
  consistencyScore: number;
}

export interface WeeklyPattern {
  dayName: string;
  commits: number;
  percentage: number;
  bar: string;
}

// Constants
export const COMMIT_SIZE_THRESHOLDS = {
  SMALL: 50,
  MEDIUM: 200,
} as const;

export const DISPLAY_LIMITS = {
  TOP_LANGUAGES: 8,
  TOP_FILES: 12,
  WEEKLY_BAR_LENGTH: 10,
} as const;

export const ACHIEVEMENT_THRESHOLDS = {
  CENTURY_COMMITS: 100,
  CONSISTENT_COMMITS: 50,
  ACTIVE_DAYS: 20,
  LINES_ADDED: 10000,
  COMMITS_PER_DAY: 5,
  WORKING_HOURS_PERCENT: 80,
  REPOSITORIES: 5,
} as const;
