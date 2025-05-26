import { DatabaseManager } from '../../src/storage/database';
import { Commit, Repository, TimePeriod, WorkSummary } from '../../src/types';

export const createTestDatabase = (): DatabaseManager => {
  // Use in-memory database for tests
  return new DatabaseManager(':memory:');
};

/**
 * Test fixtures for creating realistic test data
 */
export class TestFixtures {
  /**
   * Create a test commit with sensible defaults
   */
  static createCommit(overrides: Partial<Commit> = {}): Commit {
    const defaults: Commit = {
      id: 1,
      repoId: 1,
      hash: 'abc123',
      author: 'John Doe',
      email: 'john@example.com',
      date: new Date('2024-01-15T10:30:00Z'),
      message: 'Add new feature',
      filesChanged: 3,
      insertions: 25,
      deletions: 5,
      branch: 'main',
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Create multiple commits with varied patterns for testing
   */
  static createCommitSet(): Commit[] {
    const baseDate = new Date('2024-01-01T00:00:00Z');

    return [
      // Small commits (under 50 lines)
      this.createCommit({
        id: 1,
        hash: 'commit1',
        date: new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000), // Day 1
        insertions: 10,
        deletions: 5,
        author: 'Alice',
        email: 'alice@example.com',
      }),
      this.createCommit({
        id: 2,
        hash: 'commit2',
        date: new Date(
          baseDate.getTime() + 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
        ), // Day 1, 2 hours later
        insertions: 20,
        deletions: 10,
        author: 'Alice',
        email: 'alice@example.com',
      }),

      // Medium commits (50-200 lines)
      this.createCommit({
        id: 3,
        hash: 'commit3',
        date: new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000), // Day 2
        insertions: 80,
        deletions: 20,
        author: 'Bob',
        email: 'bob@example.com',
      }),
      this.createCommit({
        id: 4,
        hash: 'commit4',
        date: new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000), // Day 3
        insertions: 120,
        deletions: 30,
        author: 'Alice',
        email: 'alice@example.com',
      }),

      // Large commits (over 200 lines)
      this.createCommit({
        id: 5,
        hash: 'commit5',
        date: new Date(baseDate.getTime() + 4 * 24 * 60 * 60 * 1000), // Day 4
        insertions: 300,
        deletions: 50,
        author: 'Charlie',
        email: 'charlie@example.com',
      }),

      // Weekend commits
      this.createCommit({
        id: 6,
        hash: 'commit6',
        date: new Date('2024-01-06T14:00:00Z'), // Saturday
        insertions: 40,
        deletions: 10,
        author: 'Alice',
        email: 'alice@example.com',
      }),
      this.createCommit({
        id: 7,
        hash: 'commit7',
        date: new Date('2024-01-07T16:00:00Z'), // Sunday
        insertions: 60,
        deletions: 15,
        author: 'Bob',
        email: 'bob@example.com',
      }),

      // Different time patterns
      this.createCommit({
        id: 8,
        hash: 'commit8',
        date: new Date('2024-01-08T06:30:00Z'), // Early morning
        insertions: 25,
        deletions: 5,
        author: 'Alice',
        email: 'alice@example.com',
      }),
      this.createCommit({
        id: 9,
        hash: 'commit9',
        date: new Date('2024-01-08T22:00:00Z'), // Night owl
        insertions: 35,
        deletions: 8,
        author: 'Charlie',
        email: 'charlie@example.com',
      }),
      this.createCommit({
        id: 10,
        hash: 'commit10',
        date: new Date('2024-01-09T14:30:00Z'), // Working hours
        insertions: 45,
        deletions: 12,
        author: 'Bob',
        email: 'bob@example.com',
      }),
    ];
  }

  /**
   * Create commits for streak testing
   */
  static createStreakCommits(): Commit[] {
    const baseDate = new Date('2024-01-01T10:00:00Z');
    const commits: Commit[] = [];

    // Create a 5-day streak
    for (let i = 0; i < 5; i++) {
      commits.push(
        this.createCommit({
          id: i + 1,
          hash: `streak${i + 1}`,
          date: new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000),
          author: 'Streaker',
          email: 'streaker@example.com',
        })
      );
    }

    // Gap of 2 days, then another 3-day streak
    for (let i = 0; i < 3; i++) {
      commits.push(
        this.createCommit({
          id: i + 6,
          hash: `streak${i + 6}`,
          date: new Date(baseDate.getTime() + (i + 7) * 24 * 60 * 60 * 1000),
          author: 'Streaker',
          email: 'streaker@example.com',
        })
      );
    }

    return commits;
  }

  /**
   * Create test repository
   */
  static createRepository(overrides: Partial<Repository> = {}): Repository {
    const defaults: Repository = {
      id: 1,
      name: 'test-repo',
      path: '/path/to/test-repo',
      remoteUrl: 'https://github.com/test/test-repo.git',
      lastSynced: new Date(),
      weight: 1,
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Create multiple repositories
   */
  static createRepositories(): Repository[] {
    return [
      this.createRepository({
        id: 1,
        name: 'frontend-app',
        path: '/path/to/frontend-app',
        remoteUrl: 'https://github.com/company/frontend-app.git',
      }),
      this.createRepository({
        id: 2,
        name: 'backend-api',
        path: '/path/to/backend-api',
        remoteUrl: 'https://github.com/company/backend-api.git',
      }),
      this.createRepository({
        id: 3,
        name: 'shared-utils',
        path: '/path/to/shared-utils',
        remoteUrl: 'https://github.com/company/shared-utils.git',
      }),
    ];
  }

  /**
   * Create test time period
   */
  static createTimePeriod(overrides: Partial<TimePeriod> = {}): TimePeriod {
    const defaults: TimePeriod = {
      type: 'month',
      startDate: new Date('2024-01-01T00:00:00Z'),
      endDate: new Date('2024-01-31T23:59:59Z'),
      label: 'January 2024',
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Create comprehensive work summary for testing
   */
  static createWorkSummary(overrides: Partial<WorkSummary> = {}): WorkSummary {
    const commits = this.createCommitSet();
    const repositories = this.createRepositories();
    const period = this.createTimePeriod();

    const defaults: WorkSummary = {
      period,
      repositories,
      commits,
      stats: {
        totalCommits: commits.length,
        totalFilesChanged: commits.reduce((sum, c) => sum + c.filesChanged, 0),
        totalInsertions: commits.reduce((sum, c) => sum + c.insertions, 0),
        totalDeletions: commits.reduce((sum, c) => sum + c.deletions, 0),
        activeDays: 7,
        averageCommitsPerDay: 1.4,
        topLanguages: [
          { language: 'TypeScript', changes: 450 },
          { language: 'JavaScript', changes: 200 },
          { language: 'CSS', changes: 100 },
        ],
        topFiles: [
          { file: 'src/main.ts', changes: 150 },
          { file: 'src/utils.ts', changes: 100 },
          { file: 'README.md', changes: 50 },
        ],
      },
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Create empty work summary for edge case testing
   */
  static createEmptyWorkSummary(): WorkSummary {
    return {
      period: this.createTimePeriod(),
      repositories: [],
      commits: [],
      stats: {
        totalCommits: 0,
        totalFilesChanged: 0,
        totalInsertions: 0,
        totalDeletions: 0,
        activeDays: 0,
        averageCommitsPerDay: 0,
        topLanguages: [],
        topFiles: [],
      },
    };
  }
}
