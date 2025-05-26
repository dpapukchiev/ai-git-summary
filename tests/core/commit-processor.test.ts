import { DefaultLogFields } from 'simple-git';
import { CommitProcessor } from '../../src/core/commit-processor';
import { DatabaseManager } from '../../src/storage/database';
import {
  FakeCommitStatsService,
  RepositoryBuilder,
  createTestDatabase,
} from '../helpers';

// Mock the logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('CommitProcessor', () => {
  let db: DatabaseManager;
  let fakeStatsService: FakeCommitStatsService;
  let commitProcessor: CommitProcessor;

  const mockLogEntry: DefaultLogFields = {
    hash: 'abc123',
    author_name: 'John Doe',
    author_email: 'john@example.com',
    date: '2024-01-15T10:30:00Z',
    message: 'feat: add user authentication',
    refs: '',
    body: '',
  };

  beforeEach(() => {
    db = createTestDatabase();
    fakeStatsService = new FakeCommitStatsService();
    commitProcessor = new CommitProcessor(db, fakeStatsService);
  });

  afterEach(() => {
    db.close();
    fakeStatsService.reset();
  });

  describe('processCommit', () => {
    it('should successfully process a commit', async () => {
      // Setup: Create repository using builder - much cleaner!
      const repo = RepositoryBuilder.create()
        .withName('test-repo')
        .withPath('/path/to/repo')
        .withRemoteUrl('https://github.com/test/repo.git')
        .build();
      const repoId = db.addRepository(repo);

      // Configure fake stats response using improved helper methods
      fakeStatsService.setupSuccessfulCommit('abc123', {
        filesChanged: 2,
        insertions: 28,
        deletions: 7,
        fileChanges: [
          {
            filePath: 'src/auth.ts',
            changeType: 'modified',
            insertions: 20,
            deletions: 5,
          },
          {
            filePath: 'src/types.ts',
            changeType: 'modified',
            insertions: 8,
            deletions: 2,
          },
        ],
      });

      // Act: Process the commit
      await commitProcessor.processCommit(repoId, mockLogEntry);

      // Assert: Verify commit was added to database
      const commits = db.getCommitsByRepository(repoId);
      expect(commits).toHaveLength(1);

      const commit = commits[0];
      expect(commit).toMatchObject({
        hash: 'abc123',
        author: 'John Doe',
        email: 'john@example.com',
        message: 'feat: add user authentication',
        filesChanged: 2,
        insertions: 28,
        deletions: 7,
      });

      // Verify file changes were added
      const fileChanges = db.getFileChangesByCommit(commit!.id!);
      expect(fileChanges).toHaveLength(2);
      expect(fileChanges).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            filePath: 'src/auth.ts',
            changeType: 'modified',
            insertions: 20,
            deletions: 5,
          }),
          expect.objectContaining({
            filePath: 'src/types.ts',
            changeType: 'modified',
            insertions: 8,
            deletions: 2,
          }),
        ])
      );
    });

    it('should handle commits with no file changes', async () => {
      // Setup: Create repository using builder
      const repo = RepositoryBuilder.create().withName('test-repo').build();
      const repoId = db.addRepository(repo);

      // Configure empty commit using helper method - one line instead of complex setup!
      fakeStatsService.setupEmptyCommit('empty123');

      const emptyLogEntry: DefaultLogFields = {
        ...mockLogEntry,
        hash: 'empty123',
        message: 'empty commit',
      };

      // Act: Process empty commit
      await commitProcessor.processCommit(repoId, emptyLogEntry);

      // Assert: Commit should be added with zero stats
      const commits = db.getCommitsByRepository(repoId);
      expect(commits).toHaveLength(1);
      expect(commits[0]).toMatchObject({
        hash: 'empty123',
        filesChanged: 0,
        insertions: 0,
        deletions: 0,
      });

      const fileChanges = db.getFileChangesByCommit(commits[0]!.id!);
      expect(fileChanges).toHaveLength(0);
    });

    it('should handle stats service errors gracefully', async () => {
      // Setup: Create repository using builder
      const repo = RepositoryBuilder.create().withName('test-repo').build();
      const repoId = db.addRepository(repo);

      // Configure error using clear method - much better than jest.fn().mockRejectedValue()!
      fakeStatsService.setError('error123', new Error('Stats service failed'));

      const errorLogEntry: DefaultLogFields = {
        ...mockLogEntry,
        hash: 'error123',
      };

      // Act & Assert: Should throw error
      await expect(
        commitProcessor.processCommit(repoId, errorLogEntry)
      ).rejects.toThrow('Stats service failed');

      // Verify no commit was stored
      const commits = db.getCommitsByRepository(repoId);
      expect(commits).toHaveLength(0);
    });

    it('should handle large commits efficiently', async () => {
      // Setup: Create repository using builder
      const repo = RepositoryBuilder.create().withName('large-repo').build();
      const repoId = db.addRepository(repo);

      // Configure large commit using helper - demonstrates the power of scenario-based helpers!
      fakeStatsService.setupLargeCommit('large123');

      const largeLogEntry: DefaultLogFields = {
        ...mockLogEntry,
        hash: 'large123',
        message: 'refactor: major code restructuring',
      };

      // Act: Process large commit
      await commitProcessor.processCommit(repoId, largeLogEntry);

      // Assert: Large commit should be handled correctly
      const commits = db.getCommitsByRepository(repoId);
      expect(commits).toHaveLength(1);
      expect(commits[0]).toMatchObject({
        hash: 'large123',
        filesChanged: 15,
        insertions: 500,
        deletions: 200,
      });

      const fileChanges = db.getFileChangesByCommit(commits[0]!.id!);
      expect(fileChanges).toHaveLength(15);
    });

    it('should handle duplicate commits gracefully', async () => {
      // Setup: Create repository and add a commit first
      const repo = RepositoryBuilder.create()
        .withName('constraint-repo')
        .build();
      const repoId = db.addRepository(repo);

      // Configure successful stats
      fakeStatsService.setupSuccessfulCommit('duplicate123');

      // Add the commit once
      await commitProcessor.processCommit(repoId, {
        ...mockLogEntry,
        hash: 'duplicate123',
      });

      // Act: Try to add the same commit again - should handle gracefully
      await commitProcessor.processCommit(repoId, {
        ...mockLogEntry,
        hash: 'duplicate123',
        message: 'updated message', // Different message but same hash
      });

      // Assert: Should still only have one commit (or handle update appropriately)
      const commits = db.getCommitsByRepository(repoId);
      expect(commits).toHaveLength(1);

      // The behavior might be to update the existing commit or ignore the duplicate
      // Either way, we should have exactly one commit
      expect(commits[0]?.hash).toBe('duplicate123');
    });
  });

  describe('integration scenarios', () => {
    it('should process multiple commits with different characteristics', async () => {
      // Setup: Create repository using builder
      const repo = RepositoryBuilder.create()
        .withName('multi-commit-repo')
        .build();
      const repoId = db.addRepository(repo);

      // Configure different types of commits using our helper methods
      fakeStatsService.setupSuccessfulCommit('feature1', {
        filesChanged: 3,
        insertions: 45,
        deletions: 12,
      });
      fakeStatsService.setupEmptyCommit('empty1');
      fakeStatsService.setupLargeCommit('refactor1');

      const commits = [
        { ...mockLogEntry, hash: 'feature1', message: 'feat: new feature' },
        { ...mockLogEntry, hash: 'empty1', message: 'chore: empty commit' },
        {
          ...mockLogEntry,
          hash: 'refactor1',
          message: 'refactor: big changes',
        },
      ];

      // Act: Process all commits
      for (const commit of commits) {
        await commitProcessor.processCommit(repoId, commit);
      }

      // Assert: All commits should be processed correctly
      const storedCommits = db.getCommitsByRepository(repoId);
      expect(storedCommits).toHaveLength(3);

      // Verify each commit type was handled appropriately
      const featureCommit = storedCommits.find(c => c.hash === 'feature1');
      const emptyCommit = storedCommits.find(c => c.hash === 'empty1');
      const refactorCommit = storedCommits.find(c => c.hash === 'refactor1');

      expect(featureCommit?.insertions).toBe(45);
      expect(emptyCommit?.insertions).toBe(0);
      expect(refactorCommit?.insertions).toBe(500); // From setupLargeCommit
    });
  });
});
