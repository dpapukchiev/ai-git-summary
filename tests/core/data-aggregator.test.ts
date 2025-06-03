import { DataAggregator } from '../../src/core/data-aggregator';
import { DatabaseManager } from '../../src/storage/database';
import { TimePeriod } from '../../src/types';
import { CommitBuilder, RepositoryBuilder } from '../helpers/test-builders';

describe('DataAggregator', () => {
  let db: DatabaseManager;
  let dataAggregator: DataAggregator;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    dataAggregator = new DataAggregator(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('generateWorkSummary', () => {
    it('should generate basic work summary with no commits', async () => {
      // Setup: Create repository but no commits
      const repo = RepositoryBuilder.create().build();
      db.addRepository(repo);

      const timePeriod: TimePeriod = {
        type: 'custom',
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z'),
        label: 'January 2024',
      };

      // Act: Generate summary
      const summary = await dataAggregator.generateWorkSummary(timePeriod);

      // Assert: Should return empty summary
      expect(summary.period).toEqual(timePeriod);
      expect(summary.repositories).toHaveLength(1);
      expect(summary.stats.totalCommits).toBe(0);
      expect(summary.commits).toHaveLength(0);
    });

    it('should generate work summary with commits', async () => {
      // Setup: Create repository with commits
      const repo = RepositoryBuilder.create().build();
      const repoId = db.addRepository(repo);

      const commits = [
        CommitBuilder.create()
          .withRepoId(repoId)
          .withHash('commit1')
          .withMessage('feat: add new feature')
          .withStats(2, 100, 10)
          .build(),
        CommitBuilder.create()
          .withRepoId(repoId)
          .withHash('commit2')
          .withMessage('fix: bug fix')
          .withStats(1, 50, 5)
          .build(),
      ];

      commits.forEach(commit => db.addCommit(commit));

      const timePeriod: TimePeriod = {
        type: 'custom',
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z'),
        label: 'January 2024',
      };

      // Act: Generate summary
      const summary = await dataAggregator.generateWorkSummary(timePeriod);

      // Assert: Should include commit statistics
      expect(summary.stats.totalCommits).toBe(2);
      expect(summary.stats.totalFilesChanged).toBe(3);
      expect(summary.stats.totalInsertions).toBe(150);
      expect(summary.stats.totalDeletions).toBe(15);
      expect(summary.commits).toHaveLength(2);
    });

    it('should filter by repository paths', async () => {
      // Setup: Create multiple repositories
      const repo1 = RepositoryBuilder.create()
        .withName('project1')
        .withPath('/path/to/project1')
        .build();
      const repo2 = RepositoryBuilder.create()
        .withName('project2')
        .withPath('/path/to/project2')
        .build();

      const repoId1 = db.addRepository(repo1);
      const repoId2 = db.addRepository(repo2);

      // Add commits to both repositories
      const commit1 = CommitBuilder.create()
        .withRepoId(repoId1)
        .withHash('commit1')
        .build();
      const commit2 = CommitBuilder.create()
        .withRepoId(repoId2)
        .withHash('commit2')
        .build();

      db.addCommit(commit1);
      db.addCommit(commit2);

      const timePeriod: TimePeriod = {
        type: 'custom',
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z'),
        label: 'January 2024',
      };

      // Act: Generate summary for specific repository
      const summary = await dataAggregator.generateWorkSummary(timePeriod, [
        'project1',
      ]);

      // Assert: Should only include project1
      expect(summary.repositories).toHaveLength(1);
      expect(summary.repositories[0]?.name).toBe('project1');
      expect(summary.stats.totalCommits).toBe(1);
    });

    it('should filter by author', async () => {
      // Setup: Create repository with commits from different authors
      const repo = RepositoryBuilder.create().build();
      const repoId = db.addRepository(repo);

      const commits = [
        CommitBuilder.create()
          .withRepoId(repoId)
          .withHash('commit1')
          .withAuthor('John Doe')
          .build(),
        CommitBuilder.create()
          .withRepoId(repoId)
          .withHash('commit2')
          .withAuthor('Jane Smith')
          .build(),
      ];

      commits.forEach(commit => db.addCommit(commit));

      const timePeriod: TimePeriod = {
        type: 'custom',
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z'),
        label: 'January 2024',
      };

      // Act: Generate summary for specific author
      const summary = await dataAggregator.generateWorkSummary(
        timePeriod,
        undefined,
        'John Doe'
      );

      // Assert: Should only include John's commits
      expect(summary.stats.totalCommits).toBe(1);
      expect(summary.commits[0]?.author).toBe('John Doe');
    });

    it('should handle time period filtering', async () => {
      // Setup: Create repository with commits on different dates
      const repo = RepositoryBuilder.create().build();
      const repoId = db.addRepository(repo);

      const commits = [
        CommitBuilder.create()
          .withRepoId(repoId)
          .withHash('old-commit')
          .withDate(new Date('2023-12-31T23:59:59Z'))
          .build(),
        CommitBuilder.create()
          .withRepoId(repoId)
          .withHash('new-commit')
          .withDate(new Date('2024-01-15T12:00:00Z'))
          .build(),
      ];

      commits.forEach(commit => db.addCommit(commit));

      const timePeriod: TimePeriod = {
        type: 'custom',
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z'),
        label: 'January 2024',
      };

      // Act: Generate summary for January 2024
      const summary = await dataAggregator.generateWorkSummary(timePeriod);

      // Assert: Should only include commits from January 2024
      expect(summary.stats.totalCommits).toBe(1);
      expect(summary.commits[0]?.hash).toBe('new-commit');
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

  describe('AI Summary Integration', () => {
    it('should generate work summary without AI when not available', async () => {
      // Setup: Create repository with commits
      const repo = RepositoryBuilder.create().build();
      const repoId = db.addRepository(repo);

      const commit = CommitBuilder.create()
        .withRepoId(repoId)
        .withHash('commit1')
        .withMessage('feat: add new feature')
        .withStats(2, 100, 10)
        .build();

      db.addCommit(commit);

      const timePeriod: TimePeriod = {
        type: 'custom',
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z'),
        label: 'January 2024',
      };

      // Act: Generate summary with AI (should fallback gracefully)
      const summary =
        await dataAggregator.generateWorkSummaryWithAI(timePeriod);

      // Assert: Should return standard summary without AI
      expect(summary.stats.totalCommits).toBe(1);
      expect(summary.aiSummary).toBeUndefined();
    });

    it('should check AI availability', () => {
      // Act & Assert: Should return false when no API key is configured
      expect(dataAggregator.isAIAvailable()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle empty repository list gracefully', async () => {
      // Setup: Empty database
      const timePeriod: TimePeriod = {
        type: 'custom',
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z'),
        label: 'January 2024',
      };

      // Act: Generate summary with no repositories
      const summary = await dataAggregator.generateWorkSummary(timePeriod);

      // Assert: Should return empty summary
      expect(summary.repositories).toHaveLength(0);
      expect(summary.stats.totalCommits).toBe(0);
      expect(summary.commits).toHaveLength(0);
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

      // Act: Generate summary with non-existent path filter
      const summary = await dataAggregator.generateWorkSummary(timePeriod, [
        '/non/existent/path',
      ]);

      // Assert: Should return empty summary
      expect(summary.repositories).toHaveLength(0);
      expect(summary.stats.totalCommits).toBe(0);
      expect(summary.commits).toHaveLength(0);
    });
  });
});
