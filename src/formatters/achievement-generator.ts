import { TimePatterns, ACHIEVEMENT_THRESHOLDS } from './types';

/**
 * Generator for achievements based on statistics
 */
export class AchievementGenerator {
  static generate(
    stats: any,
    timePatterns: TimePatterns,
    repositories: any[]
  ): string[] {
    const achievements: string[] = [];

    if (stats.totalCommits >= ACHIEVEMENT_THRESHOLDS.CENTURY_COMMITS) {
      achievements.push('💯 Century Club - 100+ commits!');
    }

    if (stats.totalCommits >= ACHIEVEMENT_THRESHOLDS.CONSISTENT_COMMITS) {
      achievements.push('⭐ Consistent Contributor - 50+ commits!');
    }

    if (stats.activeDays >= ACHIEVEMENT_THRESHOLDS.ACTIVE_DAYS) {
      achievements.push('📅 Regular Committer - 20+ active days!');
    }

    if (stats.totalInsertions >= ACHIEVEMENT_THRESHOLDS.LINES_ADDED) {
      achievements.push('📝 Code Creator - 10K+ lines added!');
    }

    if (
      stats.activeDays > 0 &&
      stats.totalCommits / stats.activeDays >=
        ACHIEVEMENT_THRESHOLDS.COMMITS_PER_DAY
    ) {
      achievements.push('🚀 Power User - 5+ commits per active day!');
    }

    if (
      timePatterns.workingHoursPercent >=
      ACHIEVEMENT_THRESHOLDS.WORKING_HOURS_PERCENT
    ) {
      achievements.push(
        '⏰ Professional Hours - 80%+ commits during work hours!'
      );
    }

    if (repositories.length >= ACHIEVEMENT_THRESHOLDS.REPOSITORIES) {
      achievements.push('🔀 Multi-tasker - Working on 5+ repositories!');
    }

    return achievements;
  }
}
