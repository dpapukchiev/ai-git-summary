import { DatabaseManager } from "../storage/database";
import { Commit, WorkSummary, TimePeriod } from "../types";
import { DateUtils } from "../utils/date-utils";

export class DataAggregator {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  async generateWorkSummary(
    period: TimePeriod,
    repositoryPaths?: string[],
    author?: string
  ): Promise<WorkSummary> {
    // Get repositories to analyze
    let repositories = this.db.getAllRepositories();

    if (repositoryPaths && repositoryPaths.length > 0) {
      repositories = repositories.filter((repo) =>
        repositoryPaths.some((p) => repo.path.includes(p) || repo.name === p)
      );
    }

    if (repositories.length === 0) {
      throw new Error("No repositories found for analysis");
    }

    // Get commits for the period
    const repoIds = repositories
      .map((r) => r.id!)
      .filter((id) => id !== undefined);
    const commits = this.db.getCommitsByDateRange(
      period.startDate,
      period.endDate,
      repoIds,
      author
    );

    // Generate statistics
    const stats = this.calculateStats(commits, period);

    return {
      period,
      repositories,
      stats,
      commits,
    };
  }

  private calculateStats(commits: Commit[], period: TimePeriod) {
    const totalCommits = commits.length;
    const totalFilesChanged = commits.reduce(
      (sum, c) => sum + c.filesChanged,
      0
    );
    const totalInsertions = commits.reduce((sum, c) => sum + c.insertions, 0);
    const totalDeletions = commits.reduce((sum, c) => sum + c.deletions, 0);

    const activeDays = DateUtils.getActiveDays(commits);
    const periodDays = DateUtils.getDaysInPeriod(
      period.startDate,
      period.endDate
    );
    const averageCommitsPerDay = periodDays > 0 ? totalCommits / periodDays : 0;

    // Calculate top languages (based on file extensions)
    const languageStats = this.calculateLanguageStats(commits);
    const topLanguages = Array.from(languageStats.entries())
      .map(([language, changes]) => ({ language, changes }))
      .sort((a, b) => b.changes - a.changes)
      .slice(0, 10);

    // Calculate top files
    const fileStats = this.calculateFileStats(commits);
    const topFiles = Array.from(fileStats.entries())
      .map(([file, changes]) => ({ file, changes }))
      .sort((a, b) => b.changes - a.changes)
      .slice(0, 20);

    return {
      totalCommits,
      totalFilesChanged,
      totalInsertions,
      totalDeletions,
      activeDays,
      averageCommitsPerDay: Math.round(averageCommitsPerDay * 100) / 100,
      topLanguages,
      topFiles,
    };
  }

  private calculateLanguageStats(commits: Commit[]): Map<string, number> {
    const languageStats = new Map<string, number>();

    // For now, we'll infer languages from commit messages and file paths
    // This is a simplified approach - in a full implementation, we'd analyze file changes
    for (const commit of commits) {
      // Extract potential file extensions from commit messages
      const message = commit.message.toLowerCase();

      // Simple pattern matching for common file types
      const patterns = [
        { pattern: /\.ts|typescript/gi, language: "TypeScript" },
        { pattern: /\.js|javascript/gi, language: "JavaScript" },
        { pattern: /\.py|python/gi, language: "Python" },
        { pattern: /\.java|\.kt|kotlin/gi, language: "Java/Kotlin" },
        { pattern: /\.go|golang/gi, language: "Go" },
        { pattern: /\.rs|rust/gi, language: "Rust" },
        { pattern: /\.cpp|\.c\+\+|\.cc|\.cxx/gi, language: "C++" },
        { pattern: /\.c(?!\+)|\.h(?!pp)/gi, language: "C" },
        { pattern: /\.cs|c#/gi, language: "C#" },
        { pattern: /\.rb|ruby/gi, language: "Ruby" },
        { pattern: /\.php/gi, language: "PHP" },
        { pattern: /\.swift/gi, language: "Swift" },
        { pattern: /\.html|\.htm/gi, language: "HTML" },
        { pattern: /\.css|\.scss|\.sass/gi, language: "CSS" },
        { pattern: /\.json/gi, language: "JSON" },
        { pattern: /\.xml/gi, language: "XML" },
        { pattern: /\.md|markdown/gi, language: "Markdown" },
        { pattern: /\.sql/gi, language: "SQL" },
        { pattern: /\.sh|bash|shell/gi, language: "Shell" },
        { pattern: /\.yml|\.yaml/gi, language: "YAML" },
        { pattern: /dockerfile/gi, language: "Docker" },
      ];

      let matched = false;
      for (const { pattern, language } of patterns) {
        if (pattern.test(message)) {
          const current = languageStats.get(language) || 0;
          languageStats.set(
            language,
            current + commit.insertions + commit.deletions
          );
          matched = true;
          break;
        }
      }

      if (!matched) {
        // Generic code change
        const current = languageStats.get("Other") || 0;
        languageStats.set(
          "Other",
          current + commit.insertions + commit.deletions
        );
      }
    }

    return languageStats;
  }

  private calculateFileStats(commits: Commit[]): Map<string, number> {
    const fileStats = new Map<string, number>();

    // Extract file paths from commit messages (simplified approach)
    for (const commit of commits) {
      const message = commit.message;

      // Look for common file path patterns in commit messages
      const filePatterns = [
        /([a-zA-Z0-9_\-/]+\.[a-zA-Z0-9]+)/g, // Basic file.ext pattern
        /([a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-/.]+)/g, // Path-like patterns
      ];

      for (const pattern of filePatterns) {
        const matches = message.match(pattern);
        if (matches) {
          for (const match of matches) {
            // Filter out common non-file patterns
            if (
              match.includes(".") &&
              !match.startsWith("http") &&
              !match.includes("@") &&
              match.length > 3 &&
              match.length < 100
            ) {
              const normalized = match.toLowerCase();
              const current = fileStats.get(normalized) || 0;
              fileStats.set(normalized, current + 1);
            }
          }
        }
      }
    }

    return fileStats;
  }

  async getCommitTrends(
    period: TimePeriod,
    repositoryPaths?: string[],
    author?: string
  ): Promise<Map<string, number>> {
    let repositories = this.db.getAllRepositories();

    if (repositoryPaths && repositoryPaths.length > 0) {
      repositories = repositories.filter((repo) =>
        repositoryPaths.some((p) => repo.path.includes(p) || repo.name === p)
      );
    }

    const repoIds = repositories
      .map((r) => r.id!)
      .filter((id) => id !== undefined);
    const commits = this.db.getCommitsByDateRange(
      period.startDate,
      period.endDate,
      repoIds,
      author
    );

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
    let repositories = this.db.getAllRepositories();

    if (repositoryPaths && repositoryPaths.length > 0) {
      repositories = repositories.filter((repo) =>
        repositoryPaths.some((p) => repo.path.includes(p) || repo.name === p)
      );
    }

    const repoIds = repositories
      .map((r) => r.id!)
      .filter((id) => id !== undefined);
    const commits = this.db.getCommitsByDateRange(
      period.startDate,
      period.endDate,
      repoIds,
      author
    );

    const authorStats = new Map<
      string,
      { commits: number; insertions: number; deletions: number }
    >();

    for (const commit of commits) {
      const author = commit.author;
      const current = authorStats.get(author) || {
        commits: 0,
        insertions: 0,
        deletions: 0,
      };

      authorStats.set(author, {
        commits: current.commits + 1,
        insertions: current.insertions + commit.insertions,
        deletions: current.deletions + commit.deletions,
      });
    }

    return Array.from(authorStats.entries())
      .map(([author, stats]) => ({ author, ...stats }))
      .sort((a, b) => b.commits - a.commits);
  }
}
