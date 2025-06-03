import { DatabaseManager } from '../storage/database';
import { Commit, TimePeriod } from '../types';
import { DateUtils } from '../utils/date-utils';
import { LanguageDetector } from '../utils/language-detector';

// Constants for better maintainability
const FILE_FILTERING_RULES = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 100,
  EXCLUDED_PREFIXES: ['http'],
  EXCLUDED_CHARACTERS: ['@'],
} as const;

/**
 * Language detection and statistics
 */
class LanguageStatsCalculator {
  constructor(private db: DatabaseManager) {}

  calculateFromCommits(commits: Commit[]): Map<string, number> {
    // Get file changes only for the specific commits we're analyzing
    if (commits.length === 0) {
      return new Map();
    }

    // Get commit IDs from the filtered commits
    const commitIds = commits
      .map(c => c.id)
      .filter(id => id !== undefined) as number[];

    if (commitIds.length === 0) {
      return new Map();
    }

    // Get file changes only for these specific commits
    const fileChanges = this.getFileChangesForCommits(commitIds);

    // Aggregate changes by file path
    const filePathStats = new Map<string, number>();
    for (const change of fileChanges) {
      const currentCount = filePathStats.get(change.filePath) || 0;
      const changeAmount = change.insertions + change.deletions;
      filePathStats.set(change.filePath, currentCount + changeAmount);
    }

    // Convert to language statistics using the enhanced detector
    const filePathArray = Array.from(filePathStats.entries()).map(
      ([filePath, changes]) => ({ filePath, changes })
    );

    return LanguageDetector.calculateLanguageStats(filePathArray);
  }

  /**
   * Get file changes for specific commits
   */
  private getFileChangesForCommits(commitIds: number[]) {
    const allFileChanges = [];
    for (const commitId of commitIds) {
      const changes = this.db.getFileChangesByCommit(commitId);
      allFileChanges.push(...changes);
    }
    return allFileChanges;
  }

  /**
   * Get detailed breakdown of file changes for debugging purposes
   */
  getFilePathBreakdown(
    commits: Commit[]
  ): Array<{ filePath: string; changes: number }> {
    if (commits.length === 0) {
      return [];
    }

    // Get commit IDs from the filtered commits
    const commitIds = commits
      .map(c => c.id)
      .filter(id => id !== undefined) as number[];

    if (commitIds.length === 0) {
      return [];
    }

    // Get file changes only for these specific commits
    const fileChanges = this.getFileChangesForCommits(commitIds);

    const filePathStats = new Map<string, number>();
    for (const change of fileChanges) {
      const currentCount = filePathStats.get(change.filePath) || 0;
      const changeAmount = change.insertions + change.deletions;
      filePathStats.set(change.filePath, currentCount + changeAmount);
    }

    return Array.from(filePathStats.entries()).map(([filePath, changes]) => ({
      filePath,
      changes,
    }));
  }
}

/**
 * File statistics calculation
 */
class FileStatsCalculator {
  private fileStats = new Map<string, number>();

  calculateFromCommits(commits: Commit[]): Map<string, number> {
    this.fileStats.clear();

    for (const commit of commits) {
      this.extractFilesFromCommitMessage(commit.message);
    }

    return new Map(this.fileStats);
  }

  private extractFilesFromCommitMessage(message: string): void {
    const fileMatches = this.findFilePatterns(message);

    for (const match of fileMatches) {
      if (this.isValidFilePath(match)) {
        this.incrementFileStats(match.toLowerCase());
      }
    }
  }

  private findFilePatterns(message: string): string[] {
    const patterns = [
      /([a-zA-Z0-9_\-/]+\.[a-zA-Z0-9]+)/g,
      /([a-zA-Z0-9_-]+\/[a-zA-Z0-9_\-/.]+)/g,
    ];

    const allMatches: string[] = [];
    for (const pattern of patterns) {
      const matches = message.match(pattern);
      if (matches) {
        allMatches.push(...matches);
      }
    }

    return allMatches;
  }

  private isValidFilePath(filePath: string): boolean {
    return (
      filePath.includes('.') &&
      filePath.length >= FILE_FILTERING_RULES.MIN_LENGTH &&
      filePath.length <= FILE_FILTERING_RULES.MAX_LENGTH &&
      !this.hasExcludedPrefixes(filePath) &&
      !this.hasExcludedCharacters(filePath)
    );
  }

  private hasExcludedPrefixes(filePath: string): boolean {
    return FILE_FILTERING_RULES.EXCLUDED_PREFIXES.some(prefix =>
      filePath.startsWith(prefix)
    );
  }

  private hasExcludedCharacters(filePath: string): boolean {
    return FILE_FILTERING_RULES.EXCLUDED_CHARACTERS.some(char =>
      filePath.includes(char)
    );
  }

  private incrementFileStats(normalizedPath: string): void {
    const currentCount = this.fileStats.get(normalizedPath) || 0;
    this.fileStats.set(normalizedPath, currentCount + 1);
  }
}

/**
 * Statistics calculation
 */
export class StatsCalculator {
  private db: DatabaseManager | null = null;

  constructor(db?: DatabaseManager) {
    this.db = db || null;
  }

  calculateStats(commits: Commit[], period: TimePeriod) {
    const basicStats = this.calculateBasicStats(commits);
    const timeStats = this.calculateTimeStats(commits, period);

    let languageStats = new Map<string, number>();
    let filePathBreakdown: Array<{ filePath: string; changes: number }> = [];

    if (this.db) {
      const languageCalculator = new LanguageStatsCalculator(this.db);
      languageStats = languageCalculator.calculateFromCommits(commits);
      filePathBreakdown = languageCalculator.getFilePathBreakdown(commits);
    }

    // Always include debug info for comprehensive analysis
    const otherFilesAnalysis =
      LanguageDetector.analyzeOtherFiles(filePathBreakdown);

    const fileStats = new FileStatsCalculator().calculateFromCommits(commits);

    return {
      ...basicStats,
      ...timeStats,
      topLanguages: this.formatTopLanguages(languageStats, 10),
      topFiles: this.formatTopFiles(fileStats, 20),
      otherFilesAnalysis,
    };
  }

  private calculateBasicStats(commits: Commit[]) {
    return {
      totalCommits: commits.length,
      totalFilesChanged: commits.reduce((sum, c) => sum + c.filesChanged, 0),
      totalInsertions: commits.reduce((sum, c) => sum + c.insertions, 0),
      totalDeletions: commits.reduce((sum, c) => sum + c.deletions, 0),
    };
  }

  private calculateTimeStats(commits: Commit[], period: TimePeriod) {
    const activeDays = DateUtils.getActiveDays(commits);
    const periodDays = DateUtils.getDaysInPeriod(
      period.startDate,
      period.endDate
    );
    const averageCommitsPerDay =
      periodDays > 0 ? commits.length / periodDays : 0;

    return {
      activeDays,
      averageCommitsPerDay: Math.round(averageCommitsPerDay * 100) / 100,
    };
  }

  private formatTopLanguages(
    languageStats: Map<string, number>,
    limit: number
  ) {
    return LanguageDetector.filterAndSortLanguages(languageStats, limit);
  }

  private formatTopFiles(fileStats: Map<string, number>, limit: number) {
    return Array.from(fileStats.entries())
      .map(([file, changes]) => ({ file, changes }))
      .sort((a, b) => b.changes - a.changes)
      .slice(0, limit);
  }
}
