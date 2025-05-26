import { DataAggregator } from '../../src/core/data-aggregator';
import { DatabaseManager } from '../../src/storage/database';
import { TimePeriod } from '../../src/types';
import {
  createMockCommit,
  createMockRepository,
  createTestDatabase,
} from '../helpers/test-fixtures';

describe('DataAggregator Integration', () => {
  let db: DatabaseManager;
  let dataAggregator: DataAggregator;

  beforeEach(() => {
    db = createTestDatabase();
    dataAggregator = new DataAggregator(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('generateWorkSummary', () => {
    it('should generate accurate work summary for single repository', async () => {
      // Setup: Create a repository with commits
      const repo = createMockRepository({
        name: 'test-project',
        path: '/path/to/test-project',
      });
      const repoId = db.addRepository(repo);

      // Add commits with different characteristics
      const commits = [
        createMockCommit({
          repoId,
          hash: 'commit1',
          author: 'John Doe',
          email: 'john@example.com',
          date: new Date('2024-01-15T09:00:00Z'),
          message: 'feat: add user authentication',
          filesChanged: 3,
          insertions: 50,
          deletions: 10,
        }),
        createMockCommit({
          repoId,
          hash: 'commit2',
          author: 'John Doe',
          email: 'john@example.com',
          date: new Date('2024-01-16T14:30:00Z'),
          message: 'fix: resolve login bug in auth.js',
          filesChanged: 1,
          insertions: 5,
          deletions: 2,
        }),
        createMockCommit({
          repoId,
          hash: 'commit3',
          author: 'Jane Smith',
          email: 'jane@example.com',
          date: new Date('2024-01-17T11:15:00Z'),
          message: 'docs: update README.md with setup instructions',
          filesChanged: 1,
          insertions: 20,
          deletions: 0,
        }),
      ];

      commits.forEach(commit => db.addCommit(commit));

      // Create time period covering all commits
      const timePeriod: TimePeriod = {
        type: 'custom',
        startDate: new Date('2024-01-14T00:00:00Z'),
        endDate: new Date('2024-01-18T23:59:59Z'),
        label: 'Test Period',
      };

      // Act: Generate work summary
      const summary = await dataAggregator.generateWorkSummary(timePeriod);

      // Assert: Verify summary structure and data
      expect(summary).toBeDefined();
      expect(summary.period).toEqual(timePeriod);
      expect(summary.repositories).toHaveLength(1);
      expect(summary.repositories[0]?.name).toBe('test-project');

      // Verify commit statistics
      expect(summary.commits).toHaveLength(3);
      expect(summary.stats.totalCommits).toBe(3);
      expect(summary.stats.totalInsertions).toBe(75); // 50 + 5 + 20
      expect(summary.stats.totalDeletions).toBe(12); // 10 + 2 + 0
      expect(summary.stats.totalFilesChanged).toBe(5); // 3 + 1 + 1

      // Verify activity metrics
      expect(summary.stats.activeDays).toBeGreaterThan(0);
      expect(summary.stats.averageCommitsPerDay).toBeGreaterThan(0);

      // Verify language and file statistics are included
      expect(summary.stats.topLanguages).toBeDefined();
      expect(Array.isArray(summary.stats.topLanguages)).toBe(true);
      expect(summary.stats.topFiles).toBeDefined();
      expect(Array.isArray(summary.stats.topFiles)).toBe(true);
    });

    it('should filter commits by author correctly', async () => {
      // Setup: Create repository with commits from different authors
      const repo = createMockRepository();
      const repoId = db.addRepository(repo);

      const commits = [
        createMockCommit({
          repoId,
          hash: 'commit1',
          author: 'John Doe',
          email: 'john@example.com',
          message: 'feat: add feature A',
          insertions: 30,
          deletions: 5,
        }),
        createMockCommit({
          repoId,
          hash: 'commit2',
          author: 'Jane Smith',
          email: 'jane@example.com',
          message: 'feat: add feature B',
          insertions: 20,
          deletions: 3,
        }),
        createMockCommit({
          repoId,
          hash: 'commit3',
          author: 'John Doe',
          email: 'john@example.com',
          message: 'fix: bug fix',
          insertions: 10,
          deletions: 2,
        }),
      ];

      commits.forEach(commit => db.addCommit(commit));

      const timePeriod: TimePeriod = {
        type: 'custom',
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z'),
        label: 'January 2024',
      };

      // Act: Generate summary filtered by John Doe
      const summary = await dataAggregator.generateWorkSummary(
        timePeriod,
        undefined,
        'John Doe'
      );

      // Assert: Should only include John's commits
      expect(summary.commits).toHaveLength(2);
      expect(summary.stats.totalCommits).toBe(2);
      expect(summary.stats.totalInsertions).toBe(40); // 30 + 10
      expect(summary.stats.totalDeletions).toBe(7); // 5 + 2

      // Verify all commits are from John Doe
      summary.commits.forEach(commit => {
        expect(commit.author).toBe('John Doe');
      });
    });

    it('should handle multiple repositories correctly', async () => {
      // Setup: Create multiple repositories
      const repo1 = createMockRepository({
        name: 'frontend-app',
        path: '/path/to/frontend',
      });
      const repo2 = createMockRepository({
        name: 'backend-api',
        path: '/path/to/backend',
      });

      const repo1Id = db.addRepository(repo1);
      const repo2Id = db.addRepository(repo2);

      // Add commits to both repositories
      const commits = [
        createMockCommit({
          repoId: repo1Id,
          hash: 'frontend1',
          message: 'feat: add React component',
          insertions: 100,
          deletions: 0,
        }),
        createMockCommit({
          repoId: repo2Id,
          hash: 'backend1',
          message: 'feat: add API endpoint',
          insertions: 50,
          deletions: 5,
        }),
        createMockCommit({
          repoId: repo1Id,
          hash: 'frontend2',
          message: 'style: update CSS',
          insertions: 20,
          deletions: 10,
        }),
      ];

      commits.forEach(commit => db.addCommit(commit));

      const timePeriod: TimePeriod = {
        type: 'custom',
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z'),
        label: 'January 2024',
      };

      // Act: Generate summary for all repositories
      const summary = await dataAggregator.generateWorkSummary(timePeriod);

      // Assert: Should include both repositories
      expect(summary.repositories).toHaveLength(2);
      expect(summary.commits).toHaveLength(3);
      expect(summary.stats.totalCommits).toBe(3);
      expect(summary.stats.totalInsertions).toBe(170); // 100 + 50 + 20
      expect(summary.stats.totalDeletions).toBe(15); // 0 + 5 + 10

      // Verify repository names are included
      const repoNames = summary.repositories.map(r => r.name);
      expect(repoNames).toContain('frontend-app');
      expect(repoNames).toContain('backend-api');
    });

    it('should filter by specific repositories when provided', async () => {
      // Setup: Create multiple repositories
      const repo1 = createMockRepository({
        name: 'included-repo',
        path: '/path/to/included',
      });
      const repo2 = createMockRepository({
        name: 'excluded-repo',
        path: '/path/to/excluded',
      });

      const repo1Id = db.addRepository(repo1);
      const repo2Id = db.addRepository(repo2);

      // Add commits to both repositories
      const commits = [
        createMockCommit({
          repoId: repo1Id,
          hash: 'included1',
          message: 'included commit',
          insertions: 30,
        }),
        createMockCommit({
          repoId: repo2Id,
          hash: 'excluded1',
          message: 'excluded commit',
          insertions: 50,
        }),
      ];

      commits.forEach(commit => db.addCommit(commit));

      const timePeriod: TimePeriod = {
        type: 'custom',
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z'),
        label: 'January 2024',
      };

      // Act: Generate summary for specific repository
      const summary = await dataAggregator.generateWorkSummary(timePeriod, [
        '/path/to/included',
      ]);

      // Assert: Should only include the specified repository
      expect(summary.repositories).toHaveLength(1);
      expect(summary.repositories[0]?.name).toBe('included-repo');
      expect(summary.commits).toHaveLength(1);
      expect(summary.stats.totalInsertions).toBe(30);
    });

    it('should handle empty results gracefully', async () => {
      // Setup: Create repository but no commits in the time period
      const repo = createMockRepository();
      const repoId = db.addRepository(repo);

      // Add commit outside the time period
      db.addCommit(
        createMockCommit({
          repoId,
          date: new Date('2023-12-01T00:00:00Z'), // Outside period
        })
      );

      const timePeriod: TimePeriod = {
        type: 'custom',
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z'),
        label: 'January 2024',
      };

      // Act: Generate summary
      const summary = await dataAggregator.generateWorkSummary(timePeriod);

      // Assert: Should handle empty results gracefully
      expect(summary.commits).toHaveLength(0);
      expect(summary.stats.totalCommits).toBe(0);
      expect(summary.stats.totalInsertions).toBe(0);
      expect(summary.stats.totalDeletions).toBe(0);
      expect(summary.repositories).toHaveLength(1); // Repository exists but no commits
    });

    it('should calculate language statistics from file changes', async () => {
      // Setup: Create repository with commits that have file changes
      const repo = createMockRepository();
      const repoId = db.addRepository(repo);

      // Add commit
      const commit = createMockCommit({
        repoId,
        hash: 'commit1',
        message: 'feat: add TypeScript files',
        insertions: 100,
        deletions: 10,
      });
      const commitId = db.addCommit(commit);

      // Add file changes for the commit
      db.addFileChange({
        commitId,
        filePath: 'src/components/Button.tsx',
        changeType: 'added',
        insertions: 50,
        deletions: 5,
      });
      db.addFileChange({
        commitId,
        filePath: 'src/utils/helpers.ts',
        changeType: 'modified',
        insertions: 30,
        deletions: 3,
      });
      db.addFileChange({
        commitId,
        filePath: 'README.md',
        changeType: 'modified',
        insertions: 20,
        deletions: 2,
      });

      const timePeriod: TimePeriod = {
        type: 'custom',
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z'),
        label: 'January 2024',
      };

      // Act: Generate summary
      const summary = await dataAggregator.generateWorkSummary(timePeriod);

      // Assert: Should include language statistics
      expect(summary.stats.topLanguages).toBeDefined();
      expect(summary.stats.topLanguages.length).toBeGreaterThan(0);

      // Should detect TypeScript and Markdown
      const languages = summary.stats.topLanguages.map(lang => lang.language);
      expect(languages).toContain('TypeScript');
      expect(languages).toContain('Markdown');
    });
  });

  describe('getCommitTrends', () => {
    it('should calculate daily commit trends', async () => {
      // Setup: Create repository with commits on different days
      const repo = createMockRepository();
      const repoId = db.addRepository(repo);

      const commits = [
        createMockCommit({
          repoId,
          hash: 'day1-commit1',
          date: new Date('2024-01-15T09:00:00Z'),
        }),
        createMockCommit({
          repoId,
          hash: 'day1-commit2',
          date: new Date('2024-01-15T15:00:00Z'),
        }),
        createMockCommit({
          repoId,
          hash: 'day2-commit1',
          date: new Date('2024-01-16T10:00:00Z'),
        }),
      ];

      commits.forEach(commit => db.addCommit(commit));

      const timePeriod: TimePeriod = {
        type: 'custom',
        startDate: new Date('2024-01-15T00:00:00Z'),
        endDate: new Date('2024-01-17T23:59:59Z'),
        label: 'Test Period',
      };

      // Act: Get commit trends
      const trends = await dataAggregator.getCommitTrends(timePeriod);

      // Assert: Should show daily breakdown
      expect(trends).toBeInstanceOf(Map);
      expect(trends.size).toBeGreaterThan(0);

      // Should have entries for days with commits
      const trendsArray = Array.from(trends.entries());
      expect(trendsArray.some(([date]) => date.includes('2024-01-15'))).toBe(
        true
      );
      expect(trendsArray.some(([date]) => date.includes('2024-01-16'))).toBe(
        true
      );
    });
  });

  describe('getAuthorStats', () => {
    it('should calculate detailed author statistics', async () => {
      // Setup: Create repository with commits from multiple authors
      const repo = createMockRepository();
      const repoId = db.addRepository(repo);

      const commits = [
        createMockCommit({
          repoId,
          hash: 'john1',
          author: 'John Doe',
          insertions: 100,
          deletions: 10,
        }),
        createMockCommit({
          repoId,
          hash: 'john2',
          author: 'John Doe',
          insertions: 50,
          deletions: 5,
        }),
        createMockCommit({
          repoId,
          hash: 'jane1',
          author: 'Jane Smith',
          insertions: 75,
          deletions: 15,
        }),
      ];

      commits.forEach(commit => db.addCommit(commit));

      const timePeriod: TimePeriod = {
        type: 'custom',
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z'),
        label: 'January 2024',
      };

      // Act: Get author statistics
      const authorStats = await dataAggregator.getAuthorStats(timePeriod);

      // Assert: Should return detailed author breakdown
      expect(authorStats).toHaveLength(2);

      const johnStats = authorStats.find(stat => stat.author === 'John Doe');
      const janeStats = authorStats.find(stat => stat.author === 'Jane Smith');

      expect(johnStats).toBeDefined();
      expect(johnStats?.commits).toBe(2);
      expect(johnStats?.insertions).toBe(150);
      expect(johnStats?.deletions).toBe(15);

      expect(janeStats).toBeDefined();
      expect(janeStats?.commits).toBe(1);
      expect(janeStats?.insertions).toBe(75);
      expect(janeStats?.deletions).toBe(15);
    });
  });

  describe('error handling', () => {
    it('should throw error when no repositories are found', async () => {
      // Setup: Empty database
      const timePeriod: TimePeriod = {
        type: 'custom',
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z'),
        label: 'January 2024',
      };

      // Act & Assert: Should throw error
      await expect(
        dataAggregator.generateWorkSummary(timePeriod)
      ).rejects.toThrow('No repositories found for analysis');
    });

    it('should handle filtering by non-existent repository path', async () => {
      // Setup: Create a repository
      const repo = createMockRepository();
      db.addRepository(repo);

      const timePeriod: TimePeriod = {
        type: 'custom',
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z'),
        label: 'January 2024',
      };

      // Act & Assert: Should throw error when filtering by non-existent path
      await expect(
        dataAggregator.generateWorkSummary(timePeriod, ['/non/existent/path'])
      ).rejects.toThrow('No repositories found for analysis');
    });
  });
});
