import { DatabaseManager } from '../../src/storage/database';
import {
  createMockCommit,
  createMockRepository,
  createTestDatabase,
} from '../helpers/test-fixtures';

describe('DatabaseManager', () => {
  let db: DatabaseManager;

  const TEST_REPO_URL = 'https://github.com/user/test-repo.git';

  beforeEach(() => {
    db = createTestDatabase();
  });

  afterEach(() => {
    db.close();
  });

  describe('repository operations', () => {
    it('should add and retrieve repositories', () => {
      // Act: Add a repository
      const mockRepo = createMockRepository({
        remoteUrl: TEST_REPO_URL,
      });

      const repoId = db.addRepository(mockRepo);

      // Assert: Repository should be stored with ID
      expect(repoId).toBeDefined();
      expect(typeof repoId).toBe('number');

      // Retrieve and verify
      const repositories = db.getAllRepositories();
      expect(repositories).toHaveLength(1);

      const repo = repositories[0]!;
      expect(repo.id).toBe(repoId);
      expect(repo.name).toBe(mockRepo.name);
      expect(repo.path).toBe(mockRepo.path);
      expect(repo.remoteUrl).toBe(TEST_REPO_URL);
    });

    it('should retrieve repository by path', () => {
      // Setup: Add a repository
      const mockRepo = createMockRepository({
        remoteUrl: TEST_REPO_URL,
      });

      db.addRepository(mockRepo);

      // Act: Retrieve by path
      const repo = db.getRepository(mockRepo.path);

      // Assert: Should find the repository
      expect(repo).toBeDefined();
      expect(repo?.path).toBe(mockRepo.path);
      expect(repo?.name).toBe(mockRepo.name);
    });

    it('should return null for non-existent repository', () => {
      // Act: Try to retrieve non-existent repository
      const repo = db.getRepository('/non/existent/path');

      // Assert: Should return null
      expect(repo).toBeNull();
    });

    it('should update repository last synced date', () => {
      // Setup: Add a repository
      const mockRepo = createMockRepository({
        remoteUrl: TEST_REPO_URL,
      });

      const repoId = db.addRepository(mockRepo);
      const syncDate = new Date('2024-01-15T10:00:00Z');

      // Act: Update last synced
      db.updateRepositoryLastSynced(repoId, syncDate);

      // Assert: Last synced should be updated
      const repo = db.getRepository(mockRepo.path);
      expect(repo?.lastSynced).toEqual(syncDate);
    });
  });

  describe('commit operations', () => {
    let repoId: number;

    beforeEach(() => {
      // Setup: Add a test repository
      const mockRepo = createMockRepository({
        remoteUrl: TEST_REPO_URL,
      });

      repoId = db.addRepository(mockRepo);
    });

    it('should add and retrieve commits', () => {
      // Setup: Create a mock commit
      const commit = createMockCommit({ repoId });

      // Act: Add commit
      const commitId = db.addCommit(commit);

      // Assert: Commit should be stored with ID
      expect(commitId).toBeDefined();
      expect(typeof commitId).toBe('number');

      // Retrieve and verify
      const commits = db.getCommitsByRepository(repoId);
      expect(commits).toHaveLength(1);

      const storedCommit = commits[0]!;
      expect(storedCommit.id).toBe(commitId);
      expect(storedCommit.hash).toBe(commit.hash);
      expect(storedCommit.author).toBe(commit.author);
      expect(storedCommit.message).toBe(commit.message);
    });

    it('should get latest commit date', () => {
      // Setup: Add commits with different dates
      const olderDate = new Date('2024-01-10T10:00:00Z');
      const newerDate = new Date('2024-01-15T10:00:00Z');

      db.addCommit(createMockCommit({ repoId, date: olderDate }));
      db.addCommit(
        createMockCommit({ repoId, date: newerDate, hash: 'newer-hash' })
      );

      // Act: Get latest commit date
      const latestDate = db.getLatestCommitDate(repoId);

      // Assert: Should return the newer date
      expect(latestDate).toEqual(newerDate);
    });

    it('should return null for repository with no commits', () => {
      // Act: Get latest commit date for repository with no commits
      const latestDate = db.getLatestCommitDate(repoId);

      // Assert: Should return null
      expect(latestDate).toBeNull();
    });
  });

  describe('database lifecycle', () => {
    it('should create in-memory database successfully', () => {
      // Assert: Database should be created and functional
      expect(db).toBeInstanceOf(DatabaseManager);

      // Should be able to perform basic operations
      const repositories = db.getAllRepositories();
      expect(Array.isArray(repositories)).toBe(true);
      expect(repositories).toHaveLength(0);
    });

    it('should close database without errors', () => {
      // Act & Assert: Should close without throwing
      expect(() => db.close()).not.toThrow();
    });
  });
});
