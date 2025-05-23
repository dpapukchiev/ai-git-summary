import { DatabaseManager } from "../storage/database";
import { Commit, WorkSummary, TimePeriod } from "../types";
import { DateUtils } from "../utils/date-utils";

// Constants for better maintainability
const FILE_EXTENSION_PATTERNS = {
  TypeScript: /\.ts|typescript/gi,
  JavaScript: /\.js|javascript/gi,
  Python: /\.py|python/gi,
  "Java/Kotlin": /\.java|\.kt|kotlin/gi,
  Go: /\.go|golang/gi,
  Rust: /\.rs|rust/gi,
  "C++": /\.cpp|\.c\+\+|\.cc|\.cxx/gi,
  C: /\.c(?!\+)|\.h(?!pp)/gi,
  "C#": /\.cs|c#/gi,
  Ruby: /\.rb|ruby/gi,
  PHP: /\.php/gi,
  Swift: /\.swift/gi,
  HTML: /\.html|\.htm/gi,
  CSS: /\.css|\.scss|\.sass/gi,
  JSON: /\.json/gi,
  XML: /\.xml/gi,
  Markdown: /\.md|markdown/gi,
  SQL: /\.sql/gi,
  Shell: /\.sh|bash|shell/gi,
  YAML: /\.yml|\.yaml/gi,
  Docker: /dockerfile/gi,
} as const;

const FILE_FILTERING_RULES = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 100,
  EXCLUDED_PREFIXES: ["http"],
  EXCLUDED_CHARACTERS: ["@"],
} as const;

// Single Responsibility: Language detection and statistics
class LanguageStatsCalculator {
  private languageStats = new Map<string, number>();

  calculateFromCommits(commits: Commit[]): Map<string, number> {
    this.languageStats.clear();

    for (const commit of commits) {
      this.processCommitForLanguages(commit);
    }

    return new Map(this.languageStats);
  }

  private processCommitForLanguages(commit: Commit): void {
    const message = commit.message.toLowerCase();
    const language = this.detectLanguageFromMessage(message);
    const changeCount = commit.insertions + commit.deletions;

    this.incrementLanguageStats(language, changeCount);
  }

  private detectLanguageFromMessage(message: string): string {
    for (const [language, pattern] of Object.entries(FILE_EXTENSION_PATTERNS)) {
      if (pattern.test(message)) {
        return language;
      }
    }
    return "Other";
  }

  private incrementLanguageStats(language: string, changeCount: number): void {
    const currentCount = this.languageStats.get(language) || 0;
    this.languageStats.set(language, currentCount + changeCount);
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
  calculateStats(commits: Commit[], period: TimePeriod) {
    const basicStats = this.calculateBasicStats(commits);
    const timeStats = this.calculateTimeStats(commits, period);
    const languageStats = new LanguageStatsCalculator().calculateFromCommits(
      commits
    );
    const fileStats = new FileStatsCalculator().calculateFromCommits(commits);

    return {
      ...basicStats,
      ...timeStats,
      topLanguages: this.formatTopLanguages(languageStats, 10),
      topFiles: this.formatTopFiles(fileStats, 20),
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
    return Array.from(languageStats.entries())
      .map(([language, changes]) => ({ language, changes }))
      .sort((a, b) => b.changes - a.changes)
      .slice(0, limit);
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
    this.statsCalculator = new CommitStatsCalculator();
  }

  async generateWorkSummary(
    period: TimePeriod,
    repositoryPaths?: string[],
    author?: string
  ): Promise<WorkSummary> {
    const repositories = this.getRepositoriesForAnalysis(repositoryPaths);
    const commits = this.getCommitsForPeriod(period, repositories, author);
    const stats = this.statsCalculator.calculateStats(commits, period);

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
