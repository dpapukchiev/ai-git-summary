import { DefaultLogFields } from 'simple-git';
import { CommitProcessor } from '../../src/core/commit-processor';
import { CommitStatsService } from '../../src/core/commit-stats-service';
import { DatabaseManager } from '../../src/storage/database';
import { createTestDatabase } from '../helpers/test-fixtures';

// Mock the logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Simple fake for CommitStatsService - much easier than complex mocking
class FakeCommitStatsService extends CommitStatsService {
  private responses: Map<string, any> = new Map();
  private errors: Map<string, Error> = new Map();

  constructor() {
    super(null as any); // We won't use the git operations
  }

  setResponse(hash: string, stats: any): void {
    this.responses.set(hash, stats);
  }

  setError(hash: string, error: Error): void {
    this.errors.set(hash, error);
  }

  override async getCommitStats(hash: string): Promise<any> {
    if (this.errors.has(hash)) {
      throw this.errors.get(hash);
    }

    const response = this.responses.get(hash);
    if (!response) {
      throw new Error(`No response configured for ${hash}`);
    }

    return response;
  }
}

describe('CommitProcessor', () => {
  let db: DatabaseManager;
  let fakeStatsService: FakeCommitStatsService;
  let commitProcessor: CommitProcessor;

  beforeEach(() => {
    db = createTestDatabase();
    fakeStatsService = new FakeCommitStatsService();
    commitProcessor = new CommitProcessor(db, fakeStatsService);
  });

  afterEach(() => {
    db.close();
  });

  describe('processCommit', () => {
    const mockLogEntry: DefaultLogFields = {
      hash: 'abc123',
      author_name: 'John Doe',
      author_email: 'john@example.com',
      date: '2024-01-15T10:30:00Z',
      message: 'feat: add user authentication',
      refs: '',
      body: '',
    };

    it('should successfully process a commit', async () => {
      // Setup: Configure fake stats response - much simpler than mocking!
      fakeStatsService.setResponse('abc123', {
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

      // Add a repository first
      const repoId = db.addRepository({
        name: 'test-repo',
        path: '/path/to/repo',
        remoteUrl: 'https://github.com/test/repo.git',
        lastSynced: new Date(),
      });

      // Act: Process the commit - no git parameter needed!
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
      // Setup: Configure empty stats response
      fakeStatsService.setResponse('empty123', {
        filesChanged: 0,
        insertions: 0,
        deletions: 0,
        fileChanges: [],
      });

      const repoId = db.addRepository({
        name: 'test-repo',
        path: '/path/to/repo',
        remoteUrl: 'https://github.com/test/repo.git',
        lastSynced: new Date(),
      });

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
      // Setup: Configure stats service to throw error
      fakeStatsService.setError('error123', new Error('Stats service failed'));

      const repoId = db.addRepository({
        name: 'test-repo',
        path: '/path/to/repo',
        remoteUrl: 'https://github.com/test/repo.git',
        lastSynced: new Date(),
      });

      const errorLogEntry: DefaultLogFields = {
        ...mockLogEntry,
        hash: 'error123',
      };

      // Act & Assert: Should throw error
      await expect(
        commitProcessor.processCommit(repoId, errorLogEntry)
      ).rejects.toThrow('Stats service failed');

      // Verify no commit was added
      const commits = db.getCommitsByRepository(repoId);
      expect(commits).toHaveLength(0);
    });

    it('should handle invalid commit ID gracefully', async () => {
      // Setup: Mock database to return invalid commit ID
      const mockDb = {
        addCommit: jest.fn().mockReturnValue(0), // Invalid ID
        addFileChange: jest.fn(),
      } as unknown as DatabaseManager;

      const processor = new CommitProcessor(mockDb, fakeStatsService);

      fakeStatsService.setResponse('invalid123', {
        filesChanged: 0,
        insertions: 0,
        deletions: 0,
        fileChanges: [],
      });

      const invalidLogEntry: DefaultLogFields = {
        ...mockLogEntry,
        hash: 'invalid123',
      };

      // Act & Assert: Should throw error for invalid commit ID
      await expect(processor.processCommit(1, invalidLogEntry)).rejects.toThrow(
        'Failed to add commit invalid123 - invalid commit ID: 0'
      );
    });
  });
});
