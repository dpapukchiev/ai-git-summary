// Modern test builders (recommended)
export {
  CommitBuilder,
  FileChangeBuilder,
  RepositoryBuilder,
  TimePeriodBuilder,
} from './test-builders';

// Scenario-based test helpers
export { TestDataFactory, TestScenarios } from './test-scenarios';

// Fake implementations (replaces complex mocks)
export {
  FakeCommitStatsService,
  FakeFileSystem,
  FakeGitOperations,
  FakeLogger,
  FakeTestUtils,
} from './test-fakes';

// Legacy test fixtures (deprecated but maintained for compatibility)
export {
  createMockCommit,
  createMockCommits,
  createMockRepository,
  createMockTimePeriod,
  createTestDatabase,
} from './test-fixtures';
