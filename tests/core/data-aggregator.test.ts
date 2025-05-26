import { DataAggregator } from '../../src/core/data-aggregator';
import { DatabaseManager } from '../../src/storage/database';
import { TimePeriod } from '../../src/types';
import { CommitBuilder, RepositoryBuilder } from '../helpers/test-builders';
import { createTestDatabase } from '../helpers/test-fixtures';

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
      const repo = RepositoryBuilder.create()
        .withName('test-project')
        .withPath('/path/to/test-project')
        .build();
      const repoId = db.addRepository(repo);

      // Add commits with different characteristics
      const commits = [
        CommitBuilder.create()
          .withRepoId(repoId)
          .withHash('commit1')
          .withAuthor('John Doe', 'john@example.com')
          .withDate(new Date('2024-01-15T09:00:00Z'))
          .withMessage('feat: add user authentication')
          .withStats(3, 50, 10)
          .build(),
        CommitBuilder.create()
          .withRepoId(repoId)
          .withHash('commit2')
          .withAuthor('John Doe', 'john@example.com')
          .withDate(new Date('2024-01-16T14:30:00Z'))
          .withMessage('fix: resolve login bug in auth.js')
          .withStats(1, 5, 2)
          .build(),
        CommitBuilder.create()
          .withRepoId(repoId)
          .withHash('commit3')
          .withAuthor('Jane Smith', 'jane@example.com')
          .withDate(new Date('2024-01-17T11:15:00Z'))
          .withMessage('docs: update README.md with setup instructions')
          .withStats(1, 20, 0)
          .build(),
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
      const repo = RepositoryBuilder.create().build();
      const repoId = db.addRepository(repo);

      const commits = [
        CommitBuilder.create()
          .withRepoId(repoId)
          .withHash('commit1')
          .withAuthor('John Doe', 'john@example.com')
          .withMessage('feat: add feature A')
          .withStats(2, 30, 5)
          .build(),
        CommitBuilder.create()
          .withRepoId(repoId)
          .withHash('commit2')
          .withAuthor('Jane Smith', 'jane@example.com')
          .withMessage('feat: add feature B')
          .withStats(2, 20, 3)
          .build(),
        CommitBuilder.create()
          .withRepoId(repoId)
          .withHash('commit3')
          .withAuthor('John Doe', 'john@example.com')
          .withMessage('fix: bug fix')
          .withStats(2, 10, 2)
          .build(),
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
      const repo1 = RepositoryBuilder.create()
        .withName('frontend-app')
        .withPath('/path/to/frontend')
        .build();
      const repo2 = RepositoryBuilder.create()
        .withName('backend-api')
        .withPath('/path/to/backend')
        .build();

      const repo1Id = db.addRepository(repo1);
      const repo2Id = db.addRepository(repo2);

      // Add commits to both repositories
      const commits = [
        CommitBuilder.create()
          .withRepoId(repo1Id)
          .withHash('frontend1')
          .withMessage('feat: add React component')
          .withStats(2, 100, 0)
          .build(),
        CommitBuilder.create()
          .withRepoId(repo2Id)
          .withHash('backend1')
          .withMessage('feat: add API endpoint')
          .withStats(2, 50, 5)
          .build(),
        CommitBuilder.create()
          .withRepoId(repo1Id)
          .withHash('frontend2')
          .withMessage('style: update CSS')
          .withStats(2, 20, 10)
          .build(),
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
      const repo1 = RepositoryBuilder.create()
        .withName('included-repo')
        .withPath('/path/to/included')
        .build();
      const repo2 = RepositoryBuilder.create()
        .withName('excluded-repo')
        .withPath('/path/to/excluded')
        .build();

      const repo1Id = db.addRepository(repo1);
      const repo2Id = db.addRepository(repo2);

      // Add commits to both repositories
      const commits = [
        CommitBuilder.create()
          .withRepoId(repo1Id)
          .withHash('included1')
          .withMessage('included commit')
          .withStats(2, 30, 5)
          .build(),
        CommitBuilder.create()
          .withRepoId(repo2Id)
          .withHash('excluded1')
          .withMessage('excluded commit')
          .withStats(2, 50, 5)
          .build(),
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
      const repo = RepositoryBuilder.create().build();
      const repoId = db.addRepository(repo);

      // Add commit outside the time period
      db.addCommit(
        CommitBuilder.create()
          .withRepoId(repoId)
          .withDate(new Date('2023-12-01T00:00:00Z')) // Outside period
          .build()
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
      const repo = RepositoryBuilder.create().build();
      const repoId = db.addRepository(repo);

      // Add commit
      const commit = CommitBuilder.create()
        .withRepoId(repoId)
        .withHash('commit1')
        .withMessage('feat: add TypeScript files')
        .withStats(2, 100, 10)
        .build();
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
      const repo = RepositoryBuilder.create().build();
      const repoId = db.addRepository(repo);

      const commits = [
        CommitBuilder.create()
          .withRepoId(repoId)
          .withHash('day1-commit1')
          .withDate(new Date('2024-01-15T09:00:00Z'))
          .build(),
        CommitBuilder.create()
          .withRepoId(repoId)
          .withHash('day1-commit2')
          .withDate(new Date('2024-01-15T15:00:00Z'))
          .build(),
        CommitBuilder.create()
          .withRepoId(repoId)
          .withHash('day2-commit1')
          .withDate(new Date('2024-01-16T10:00:00Z'))
          .build(),
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
      const repo = RepositoryBuilder.create().build();
      const repoId = db.addRepository(repo);

      const commits = [
        CommitBuilder.create()
          .withRepoId(repoId)
          .withHash('john1')
          .withAuthor('John Doe')
          .withStats(2, 100, 10)
          .build(),
        CommitBuilder.create()
          .withRepoId(repoId)
          .withHash('john2')
          .withAuthor('John Doe')
          .withStats(2, 50, 5)
          .build(),
        CommitBuilder.create()
          .withRepoId(repoId)
          .withHash('jane1')
          .withAuthor('Jane Smith')
          .withStats(2, 75, 15)
          .build(),
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
      const repo = RepositoryBuilder.create().build();
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
