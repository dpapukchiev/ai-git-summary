import { DatabaseManager } from "../storage/database";
import { Commit, WorkSummary, TimePeriod } from "../types";
import { DateUtils } from "../utils/date-utils";
import { LanguageDetector } from "../utils/language-detector";

// Constants for better maintainability
const FILE_FILTERING_RULES = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 100,
  EXCLUDED_PREFIXES: ["http"],
  EXCLUDED_CHARACTERS: ["@"],
} as const;

// Single Responsibility: Language detection and statistics
class LanguageStatsCalculator {
  constructor(private db: DatabaseManager) {}

  calculateFromCommits(
    commits: Commit[],
    repositoryIds: number[]
  ): Map<string, number> {
    // Get file changes for the period covered by these commits
    if (commits.length === 0) {
      return new Map();
    }

    const dates = commits.map((c) => c.date);
    const startDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const endDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    // Get all file changes for this period and repositories
    const fileChanges = this.db.getFileChangesByDateRange(
      startDate,
      endDate,
      repositoryIds.length > 0 ? repositoryIds : undefined
    );

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
   * Get detailed breakdown of file changes for debugging purposes
   */
  getFilePathBreakdown(
    commits: Commit[],
    repositoryIds: number[]
  ): Array<{ filePath: string; changes: number }> {
    if (commits.length === 0) {
      return [];
    }

    const dates = commits.map((c) => c.date);
    const startDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const endDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    const fileChanges = this.db.getFileChangesByDateRange(
      startDate,
      endDate,
      repositoryIds.length > 0 ? repositoryIds : undefined
    );

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

// Single Responsibility: File statistics calculation
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
      /([a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-/.]+)/g,
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
      filePath.includes(".") &&
      filePath.length >= FILE_FILTERING_RULES.MIN_LENGTH &&
      filePath.length <= FILE_FILTERING_RULES.MAX_LENGTH &&
      !this.hasExcludedPrefixes(filePath) &&
      !this.hasExcludedCharacters(filePath)
    );
  }

  private hasExcludedPrefixes(filePath: string): boolean {
    return FILE_FILTERING_RULES.EXCLUDED_PREFIXES.some((prefix) =>
      filePath.startsWith(prefix)
    );
  }

  private hasExcludedCharacters(filePath: string): boolean {
    return FILE_FILTERING_RULES.EXCLUDED_CHARACTERS.some((char) =>
      filePath.includes(char)
    );
  }

  private incrementFileStats(normalizedPath: string): void {
    const currentCount = this.fileStats.get(normalizedPath) || 0;
    this.fileStats.set(normalizedPath, currentCount + 1);
  }
}

// Single Responsibility: Repository filtering logic
class RepositoryFilter {
  constructor(private db: DatabaseManager) {}

  getFilteredRepositories(repositoryPaths?: string[]) {
    const allRepositories = this.db.getAllRepositories();

    if (!repositoryPaths || repositoryPaths.length === 0) {
      return allRepositories;
    }

    return allRepositories.filter((repo) =>
      this.matchesAnyPath(repo, repositoryPaths)
    );
  }

  private matchesAnyPath(repo: any, paths: string[]): boolean {
    return paths.some((path) => repo.path.includes(path) || repo.name === path);
  }

  extractRepositoryIds(repositories: any[]): number[] {
    return repositories
      .map((repo) => repo.id!)
      .filter((id) => id !== undefined);
  }
}

// Single Responsibility: Statistics calculation
class CommitStatsCalculator {
  constructor(private db: DatabaseManager) {}

  calculateStats(
    commits: Commit[],
    period: TimePeriod,
    repositoryIds: number[],
    includeDebugInfo: boolean = false
  ) {
    const basicStats = this.calculateBasicStats(commits);
    const timeStats = this.calculateTimeStats(commits, period);
    const languageCalculator = new LanguageStatsCalculator(this.db);
    const languageStats = languageCalculator.calculateFromCommits(
      commits,
      repositoryIds
    );

    let debugInfo = {};
    if (includeDebugInfo) {
      const filePathBreakdown = languageCalculator.getFilePathBreakdown(
        commits,
        repositoryIds
      );
      debugInfo = {
        otherFilesAnalysis:
          LanguageDetector.analyzeOtherFiles(filePathBreakdown),
      };
    }

    const fileStats = new FileStatsCalculator().calculateFromCommits(commits);

    return {
      ...basicStats,
      ...timeStats,
      topLanguages: this.formatTopLanguages(languageStats, 10),
      topFiles: this.formatTopFiles(fileStats, 20),
      ...debugInfo,
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

// Main class with focused responsibility: Data aggregation orchestration
export class DataAggregator {
  private repositoryFilter: RepositoryFilter;
  private statsCalculator: CommitStatsCalculator;

  constructor(private db: DatabaseManager) {
    this.repositoryFilter = new RepositoryFilter(db);
    this.statsCalculator = new CommitStatsCalculator(db);
  }

  async generateWorkSummary(
    period: TimePeriod,
    repositoryPaths?: string[],
    author?: string,
    verbose: boolean = false
  ): Promise<WorkSummary> {
    const repositories = this.getRepositoriesForAnalysis(repositoryPaths);
    const commits = this.getCommitsForPeriod(period, repositories, author);
    const repositoryIds =
      this.repositoryFilter.extractRepositoryIds(repositories);
    const stats = this.statsCalculator.calculateStats(
      commits,
      period,
      repositoryIds,
      verbose
    );

    return {
      period,
      repositories,
      stats,
      commits,
    };
  }

  async getCommitTrends(
    period: TimePeriod,
    repositoryPaths?: string[],
    author?: string
  ): Promise<Map<string, number>> {
    const repositories = this.getRepositoriesForAnalysis(repositoryPaths);
    const commits = this.getCommitsForPeriod(period, repositories, author);

    return DateUtils.getCommitsByDay(commits);
  }

  async getAuthorStats(
    period: TimePeriod,
    repositoryPaths?: string[],
    author?: string
  ): Promise<
    Array<{
      author: string;
      commits: number;
      insertions: number;
      deletions: number;
    }>
  > {
    const repositories = this.getRepositoriesForAnalysis(repositoryPaths);
    const commits = this.getCommitsForPeriod(period, repositories, author);

    return this.calculateAuthorStatistics(commits);
  }

  private getRepositoriesForAnalysis(repositoryPaths?: string[]) {
    const repositories =
      this.repositoryFilter.getFilteredRepositories(repositoryPaths);

    if (repositories.length === 0) {
      throw new Error("No repositories found for analysis");
    }

    return repositories;
  }

  private getCommitsForPeriod(
    period: TimePeriod,
    repositories: any[],
    author?: string
  ): Commit[] {
    const repoIds = this.repositoryFilter.extractRepositoryIds(repositories);
    return this.db.getCommitsByDateRange(
      period.startDate,
      period.endDate,
      repoIds,
      author
    );
  }

  private calculateAuthorStatistics(commits: Commit[]) {
    const authorStats = new Map<
      string,
      {
        commits: number;
        insertions: number;
        deletions: number;
      }
    >();

    for (const commit of commits) {
      const currentStats = authorStats.get(commit.author) || {
        commits: 0,
        insertions: 0,
        deletions: 0,
      };

      authorStats.set(commit.author, {
        commits: currentStats.commits + 1,
        insertions: currentStats.insertions + commit.insertions,
        deletions: currentStats.deletions + commit.deletions,
      });
    }

    return Array.from(authorStats.entries())
      .map(([author, stats]) => ({ author, ...stats }))
      .sort((a, b) => b.commits - a.commits);
  }
}
