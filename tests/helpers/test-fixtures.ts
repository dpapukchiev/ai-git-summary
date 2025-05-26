import { DatabaseManager } from '../../src/storage/database';
import { Commit, Repository, TimePeriod } from '../../src/types';

let repoCounter = 0;

export const createMockRepository = (
  overrides: Partial<Repository> = {}
): Repository => {
  repoCounter++;
  return {
    id: 1,
    name: 'test-repo',
    path: `/path/to/test-repo-${repoCounter}`,
    remoteUrl: 'https://github.com/user/test-repo.git',
    lastSynced: new Date(),
    ...overrides,
  };
};

export const createMockCommit = (overrides: Partial<Commit> = {}): Commit => ({
  id: 1,
  repoId: 1,
  hash: 'abc123def456',
  author: 'Test Author',
  email: 'test@example.com',
  date: new Date('2024-01-15T10:00:00Z'),
  message: 'feat: add new feature',
  filesChanged: 2,
  insertions: 10,
  deletions: 5,
  branch: 'main',
  ...overrides,
});

export const createMockTimePeriod = (
  overrides: Partial<TimePeriod> = {}
): TimePeriod => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 7);

  return {
    type: 'week',
    startDate,
    endDate,
    label: 'Last Week',
    ...overrides,
  };
};

let dbCounter = 0;

export const createTestDatabase = (): DatabaseManager => {
  // Create a truly unique in-memory database for each test
  dbCounter++;
  const uniqueName = `:memory:test_${dbCounter}_${Date.now()}_${Math.random()}`;
  return new DatabaseManager(uniqueName);
};

export const createMockCommits = (
  count: number,
  repoId: number = 1
): Commit[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockCommit({
      id: index + 1,
      repoId,
      hash: `commit${index + 1}hash`,
      author: `Author ${index + 1}`,
      email: `author${index + 1}@example.com`,
      date: new Date(Date.now() - (count - index) * 24 * 60 * 60 * 1000), // Spread over days
      message: `commit ${index + 1}: update files`,
    })
  );
};
