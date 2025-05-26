import { BranchSummary, LogResult, SimpleGit } from 'simple-git';
import { CommitFetcher } from '../../src/core/commit-fetcher';

// Mock the logger
jest.mock('../../src/utils/logger', () => ({
  log: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Test data constants
const MOCK_COMMITS = {
  COMMIT_1: {
    hash: 'abc123',
    date: '2024-01-01T10:00:00Z',
    message: 'feat: add new feature',
    author_name: 'John Doe',
    author_email: 'john@example.com',
    refs: '',
    body: '',
    diff: null,
  },
  COMMIT_2: {
    hash: 'def456',
    date: '2024-01-02T11:00:00Z',
    message: 'fix: resolve bug',
    author_name: 'Jane Smith',
    author_email: 'jane@example.com',
    refs: '',
    body: '',
    diff: null,
  },
  COMMIT_3: {
    hash: 'ghi789',
    date: '2024-01-03T12:00:00Z',
    message: 'docs: update readme',
    author_name: 'Bob Wilson',
    author_email: 'bob@example.com',
    refs: '',
    body: '',
    diff: null,
  },
};

const MOCK_BRANCH_SUMMARIES = {
  WITH_MAIN: {
    current: 'main',
    all: ['main', 'develop', 'feature/test', 'origin/main', 'origin/develop'],
    branches: {},
    detached: false,
  } as BranchSummary,
  WITH_DEVELOP: {
    current: 'develop',
    all: ['develop', 'feature/test', 'origin/develop'],
    branches: {},
    detached: false,
  } as BranchSummary,
  FEATURE_BRANCH: {
    current: 'feature/new-feature',
    all: ['feature/new-feature', 'main', 'origin/main'],
    branches: {},
    detached: false,
  } as BranchSummary,
  NO_COMMON_BRANCHES: {
    current: 'custom-branch',
    all: ['custom-branch', 'another-branch', 'origin/custom-branch'],
    branches: {},
    detached: false,
  } as BranchSummary,
  EMPTY_REPO: {
    current: '',
    all: [],
    branches: {},
    detached: false,
  } as BranchSummary,
  DETACHED_HEAD: {
    current: '',
    all: ['main', 'develop'],
    branches: {},
    detached: true,
  } as BranchSummary,
};

// Helper functions
const createMockGit = (): jest.Mocked<SimpleGit> =>
  ({
    branch: jest.fn(),
    log: jest.fn(),
  }) as any;

const createMockLogResult = (commits: any[]): LogResult => ({
  all: commits,
  latest: commits[0] || null,
  total: commits.length,
});

const expectCommitsToContain = (
  commits: LogResult['all'],
  expectedHashes: string[]
): void => {
  const actualHashes = commits.map(c => c.hash);
  expectedHashes.forEach(hash => {
    expect(actualHashes).toContain(hash);
  });
};

const expectCommitsNotToContain = (
  commits: LogResult['all'],
  unexpectedHashes: string[]
): void => {
  const actualHashes = commits.map(c => c.hash);
  unexpectedHashes.forEach(hash => {
    expect(actualHashes).not.toContain(hash);
  });
};

describe('CommitFetcher', () => {
  let fetcher: CommitFetcher;
  let mockGit: jest.Mocked<SimpleGit>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetcher = new CommitFetcher();
    mockGit = createMockGit();
  });

  describe('fetchCommits', () => {
    it('should fetch commits from main branch when available', async () => {
      mockGit.branch.mockResolvedValue(MOCK_BRANCH_SUMMARIES.WITH_MAIN);
      mockGit.log.mockResolvedValue(
        createMockLogResult([MOCK_COMMITS.COMMIT_1, MOCK_COMMITS.COMMIT_2])
      );

      const result = await fetcher.fetchCommits(mockGit);

      expect(result).toHaveLength(2);
      expectCommitsToContain(result, ['abc123', 'def456']);
      expect(mockGit.branch).toHaveBeenCalledWith(['--all']);
    });

    it('should fetch commits from develop branch when main is not available', async () => {
      mockGit.branch.mockResolvedValue(MOCK_BRANCH_SUMMARIES.WITH_DEVELOP);
      mockGit.log.mockResolvedValue(
        createMockLogResult([MOCK_COMMITS.COMMIT_2, MOCK_COMMITS.COMMIT_3])
      );

      const result = await fetcher.fetchCommits(mockGit);

      expect(result).toHaveLength(2);
      expectCommitsToContain(result, ['def456', 'ghi789']);
    });

    it('should fetch commits from current branch when no common branches exist', async () => {
      mockGit.branch.mockResolvedValue(
        MOCK_BRANCH_SUMMARIES.NO_COMMON_BRANCHES
      );
      mockGit.log.mockResolvedValue(
        createMockLogResult([MOCK_COMMITS.COMMIT_1])
      );

      const result = await fetcher.fetchCommits(mockGit);

      expect(result).toHaveLength(1);
      expectCommitsToContain(result, ['abc123']);
    });

    it('should include remote branches in search', async () => {
      const branchSummary = {
        current: 'feature/test',
        all: ['feature/test', 'origin/main', 'origin/develop'],
        branches: {},
        detached: false,
      } as BranchSummary;

      mockGit.branch.mockResolvedValue(branchSummary);
      mockGit.log.mockResolvedValue(
        createMockLogResult([MOCK_COMMITS.COMMIT_1, MOCK_COMMITS.COMMIT_2])
      );

      const result = await fetcher.fetchCommits(mockGit);

      expect(result).toHaveLength(2);
      expect(mockGit.log).toHaveBeenCalledTimes(3); // feature/test, origin/main, origin/develop
    });

    it('should filter commits by date when since parameter is provided', async () => {
      const sinceDate = new Date('2024-01-02T00:00:00Z');
      mockGit.branch.mockResolvedValue(MOCK_BRANCH_SUMMARIES.WITH_MAIN);
      mockGit.log.mockResolvedValue(
        createMockLogResult([MOCK_COMMITS.COMMIT_2, MOCK_COMMITS.COMMIT_3])
      );

      const result = await fetcher.fetchCommits(mockGit, sinceDate);

      expect(result).toHaveLength(2);
      expect(mockGit.log).toHaveBeenCalledWith(
        expect.arrayContaining([`--since=${sinceDate.toISOString()}`])
      );
    });

    it('should deduplicate commits from multiple branches', async () => {
      mockGit.branch.mockResolvedValue(MOCK_BRANCH_SUMMARIES.WITH_MAIN);

      // Mock different responses for different branches
      mockGit.log
        .mockResolvedValueOnce(
          createMockLogResult([MOCK_COMMITS.COMMIT_1, MOCK_COMMITS.COMMIT_2])
        )
        .mockResolvedValueOnce(
          createMockLogResult([MOCK_COMMITS.COMMIT_2, MOCK_COMMITS.COMMIT_3])
        )
        .mockResolvedValueOnce(createMockLogResult([MOCK_COMMITS.COMMIT_1]));

      const result = await fetcher.fetchCommits(mockGit);

      // Should have 3 unique commits despite duplicates
      expect(result).toHaveLength(3);
      expectCommitsToContain(result, ['abc123', 'def456', 'ghi789']);
    });

    it('should handle branch fetch errors gracefully', async () => {
      mockGit.branch.mockResolvedValue(MOCK_BRANCH_SUMMARIES.WITH_MAIN);

      // First call succeeds, second fails, third succeeds
      mockGit.log
        .mockResolvedValueOnce(createMockLogResult([MOCK_COMMITS.COMMIT_1]))
        .mockRejectedValueOnce(new Error('Branch not found'))
        .mockResolvedValueOnce(createMockLogResult([MOCK_COMMITS.COMMIT_3]));

      const result = await fetcher.fetchCommits(mockGit);

      expect(result).toHaveLength(2);
      expectCommitsToContain(result, ['abc123', 'ghi789']);
    });

    it('should fall back to simple log when branch detection fails', async () => {
      mockGit.branch.mockRejectedValue(new Error('Git branch command failed'));
      mockGit.log.mockResolvedValue(
        createMockLogResult([MOCK_COMMITS.COMMIT_1, MOCK_COMMITS.COMMIT_2])
      );

      const result = await fetcher.fetchCommits(mockGit);

      expect(result).toHaveLength(2);
      expectCommitsToContain(result, ['abc123', 'def456']);
    });

    it('should return empty array when fallback also fails', async () => {
      mockGit.branch.mockRejectedValue(new Error('Git branch command failed'));
      mockGit.log.mockRejectedValue(new Error('Git log command failed'));

      const result = await fetcher.fetchCommits(mockGit);

      expect(result).toHaveLength(0);
    });
  });

  describe('branch selection logic', () => {
    it('should prioritize current branch', async () => {
      mockGit.branch.mockResolvedValue(MOCK_BRANCH_SUMMARIES.FEATURE_BRANCH);
      mockGit.log.mockResolvedValue(
        createMockLogResult([MOCK_COMMITS.COMMIT_1])
      );

      await fetcher.fetchCommits(mockGit);

      // Should call log for feature branch first
      expect(mockGit.log).toHaveBeenCalledWith(
        expect.arrayContaining(['feature/new-feature'])
      );
    });

    it('should include both local and remote common branches', async () => {
      const branchSummary = {
        current: 'feature/test',
        all: [
          'feature/test',
          'main',
          'develop',
          'origin/main',
          'origin/develop',
        ],
        branches: {},
        detached: false,
      } as BranchSummary;

      mockGit.branch.mockResolvedValue(branchSummary);
      mockGit.log.mockResolvedValue(createMockLogResult([]));

      await fetcher.fetchCommits(mockGit);

      // Should call log for: feature/test, main, develop, origin/main, origin/develop
      expect(mockGit.log).toHaveBeenCalledTimes(5);
    });

    it('should handle empty repository gracefully', async () => {
      mockGit.branch.mockResolvedValue(MOCK_BRANCH_SUMMARIES.EMPTY_REPO);
      mockGit.log.mockResolvedValue(createMockLogResult([]));

      const result = await fetcher.fetchCommits(mockGit);

      expect(result).toHaveLength(0);
    });

    it('should handle detached HEAD state', async () => {
      mockGit.branch.mockResolvedValue(MOCK_BRANCH_SUMMARIES.DETACHED_HEAD);
      mockGit.log.mockResolvedValue(
        createMockLogResult([MOCK_COMMITS.COMMIT_1])
      );

      const result = await fetcher.fetchCommits(mockGit);

      expect(result).toHaveLength(1);
      // Should still try to fetch from available branches
      expect(mockGit.log).toHaveBeenCalled();
    });

    it('should limit to first 3 branches when no common branches found', async () => {
      const branchSummary = {
        current: '',
        all: ['branch1', 'branch2', 'branch3', 'branch4', 'branch5'],
        branches: {},
        detached: false,
      } as BranchSummary;

      mockGit.branch.mockResolvedValue(branchSummary);
      mockGit.log.mockResolvedValue(createMockLogResult([]));

      await fetcher.fetchCommits(mockGit);

      // Should only call log for first 3 branches
      expect(mockGit.log).toHaveBeenCalledTimes(3);
    });

    it('should fall back to current branch when no common branches exist and no current branch was initially added', async () => {
      // This test covers the specific fallback case where branchesToCheck.size === 0
      // and branches.current exists, triggering line 74
      const branchSummary = {
        current: 'custom-branch',
        all: ['custom-branch', 'remotes/origin/custom-branch'], // Only remote branches, no local common branches
        branches: {},
        detached: false,
      } as BranchSummary;

      mockGit.branch.mockResolvedValue(branchSummary);
      mockGit.log.mockResolvedValue(
        createMockLogResult([MOCK_COMMITS.COMMIT_1])
      );

      const result = await fetcher.fetchCommits(mockGit);

      expect(result).toHaveLength(1);
      // Should call log for current branch
      expect(mockGit.log).toHaveBeenCalledWith(
        expect.arrayContaining(['custom-branch'])
      );
    });

    it('should handle scenario where current branch is empty but fallback finds local branches', async () => {
      // This covers the case where branches.current is empty, so addCurrentBranch doesn't add anything,
      // and then fallback logic kicks in to add local branches
      const branchSummary = {
        current: '', // No current branch
        all: ['branch1', 'branch2', 'branch3', 'remotes/origin/main'],
        branches: {},
        detached: false,
      } as BranchSummary;

      mockGit.branch.mockResolvedValue(branchSummary);
      mockGit.log.mockResolvedValue(createMockLogResult([]));

      await fetcher.fetchCommits(mockGit);

      // Should call log for first 3 local branches (excluding remotes/)
      expect(mockGit.log).toHaveBeenCalledTimes(3);
    });
  });

  describe('commit limits and options', () => {
    it('should respect max commits per branch limit', async () => {
      mockGit.branch.mockResolvedValue(MOCK_BRANCH_SUMMARIES.WITH_MAIN);
      mockGit.log.mockResolvedValue(createMockLogResult([]));

      await fetcher.fetchCommits(mockGit);

      expect(mockGit.log).toHaveBeenCalledWith(
        expect.arrayContaining(['--max-count=1000'])
      );
    });

    it('should include branch name in log options', async () => {
      mockGit.branch.mockResolvedValue(MOCK_BRANCH_SUMMARIES.WITH_MAIN);
      mockGit.log.mockResolvedValue(createMockLogResult([]));

      await fetcher.fetchCommits(mockGit);

      expect(mockGit.log).toHaveBeenCalledWith(
        expect.arrayContaining(['main'])
      );
    });

    it('should include since date in log options when provided', async () => {
      const sinceDate = new Date('2024-01-01T00:00:00Z');
      mockGit.branch.mockResolvedValue(MOCK_BRANCH_SUMMARIES.WITH_MAIN);
      mockGit.log.mockResolvedValue(createMockLogResult([]));

      await fetcher.fetchCommits(mockGit, sinceDate);

      expect(mockGit.log).toHaveBeenCalledWith(
        expect.arrayContaining([`--since=${sinceDate.toISOString()}`])
      );
    });
  });

  describe('error scenarios', () => {
    it('should handle individual branch log failures', async () => {
      mockGit.branch.mockResolvedValue(MOCK_BRANCH_SUMMARIES.WITH_MAIN);

      // Simulate failure on one branch but success on others
      mockGit.log
        .mockResolvedValueOnce(createMockLogResult([MOCK_COMMITS.COMMIT_1]))
        .mockRejectedValueOnce(new Error('Permission denied'))
        .mockResolvedValueOnce(createMockLogResult([MOCK_COMMITS.COMMIT_2]));

      const result = await fetcher.fetchCommits(mockGit);

      expect(result).toHaveLength(2);
      expectCommitsToContain(result, ['abc123', 'def456']);
    });

    it('should handle malformed git responses', async () => {
      mockGit.branch.mockResolvedValue(MOCK_BRANCH_SUMMARIES.WITH_MAIN);
      mockGit.log.mockResolvedValue({
        all: null as any,
        latest: null,
        total: 0,
      });

      const result = await fetcher.fetchCommits(mockGit);

      expect(result).toHaveLength(0);
    });

    it('should handle network timeouts gracefully', async () => {
      mockGit.branch.mockRejectedValue(new Error('ETIMEDOUT'));
      mockGit.log.mockResolvedValue(
        createMockLogResult([MOCK_COMMITS.COMMIT_1])
      );

      const result = await fetcher.fetchCommits(mockGit);

      expect(result).toHaveLength(1);
      expectCommitsToContain(result, ['abc123']);
    });
  });

  describe('performance considerations', () => {
    it('should not fetch from remote branches that start with remotes/', async () => {
      const branchSummary = {
        current: 'main',
        all: ['main', 'remotes/origin/main', 'remotes/upstream/develop'],
        branches: {},
        detached: false,
      } as BranchSummary;

      mockGit.branch.mockResolvedValue(branchSummary);
      mockGit.log.mockResolvedValue(createMockLogResult([]));

      await fetcher.fetchCommits(mockGit);

      // Should only call log for 'main', not the remotes/ branches
      expect(mockGit.log).toHaveBeenCalledTimes(1);
      expect(mockGit.log).toHaveBeenCalledWith(
        expect.arrayContaining(['main'])
      );
    });

    it('should handle large numbers of branches efficiently', async () => {
      const manyBranches = Array.from({ length: 50 }, (_, i) => `branch-${i}`);
      const branchSummary = {
        current: 'main',
        all: ['main', ...manyBranches],
        branches: {},
        detached: false,
      } as BranchSummary;

      mockGit.branch.mockResolvedValue(branchSummary);
      mockGit.log.mockResolvedValue(createMockLogResult([]));

      await fetcher.fetchCommits(mockGit);

      // Should only process main branch since it's a common branch
      expect(mockGit.log).toHaveBeenCalledTimes(1);
    });
  });
});
