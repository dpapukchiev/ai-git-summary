import fs from 'fs';
import { GitAnalyzer } from '../../src/core/git-analyzer';
import { DatabaseManager } from '../../src/storage/database';
import { createTestDatabase } from '../helpers/test-fixtures';

// Mock the dependencies
jest.mock('fs');

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('GitAnalyzer Integration', () => {
  let db: DatabaseManager;
  let gitAnalyzer: GitAnalyzer;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create test database
    db = createTestDatabase();

    // Create GitAnalyzer instance
    gitAnalyzer = new GitAnalyzer(db, { concurrency: 1 });
  });

  afterEach(() => {
    db.close();
  });

  describe('constructor', () => {
    it('should create GitAnalyzer instance successfully', () => {
      const analyzer = new GitAnalyzer(db);
      expect(analyzer).toBeInstanceOf(GitAnalyzer);
    });

    it('should accept custom concurrency option', () => {
      const analyzer = new GitAnalyzer(db, { concurrency: 10 });
      expect(analyzer).toBeInstanceOf(GitAnalyzer);
    });
  });

  describe('validation', () => {
    it('should handle repository validation errors', async () => {
      // Setup: Mock file system to return false for repository path
      mockedFs.existsSync.mockReturnValue(false);

      // Act & Assert: Should throw validation error
      await expect(
        gitAnalyzer.analyzeRepository('/invalid/path')
      ).rejects.toThrow('Repository path does not exist: /invalid/path');
    });

    it('should handle git repository validation errors', async () => {
      // Setup: Mock file system to return true for path but false for .git
      mockedFs.existsSync.mockImplementation(filePath => {
        const pathStr = filePath.toString();
        return !pathStr.includes('.git');
      });

      const testRepoPath = '/path/to/test-repo';

      // Act & Assert: Should throw git validation error
      await expect(gitAnalyzer.analyzeRepository(testRepoPath)).rejects.toThrow(
        `Not a git repository: ${testRepoPath}`
      );
    });
  });

  describe('database integration', () => {
    it('should work with in-memory database', () => {
      // Test that the database integration works
      expect(db).toBeInstanceOf(DatabaseManager);

      // Test basic database operations
      const repositories = db.getAllRepositories();
      expect(Array.isArray(repositories)).toBe(true);
      expect(repositories).toHaveLength(0);
    });
  });
});
