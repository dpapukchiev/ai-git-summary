import { DatabaseManager } from '../../src/storage/database';
import { Commit, Repository, TimePeriod } from '../../src/types';
import {
  CommitBuilder,
  RepositoryBuilder,
  TimePeriodBuilder,
} from './test-builders';

let repoCounter = 0;

/**
 * @deprecated Use RepositoryBuilder.create() instead for more flexibility
 */
export const createMockRepository = (
  overrides: Partial<Repository> = {}
): Repository => {
  repoCounter++;
  const builder = RepositoryBuilder.create()
    .withName('test-repo')
    .withPath(`/path/to/test-repo-${repoCounter}`)
    .withRemoteUrl('https://github.com/user/test-repo.git')
    .withLastSynced(new Date());

  // Apply overrides
  if (overrides.name) builder.withName(overrides.name);
  if (overrides.path) builder.withPath(overrides.path);
  if (overrides.remoteUrl) builder.withRemoteUrl(overrides.remoteUrl);
  if (overrides.lastSynced) builder.withLastSynced(overrides.lastSynced);

  const result = builder.build();

  // Apply any remaining overrides that weren't handled by the builder
  return { ...result, ...overrides };
};

/**
 * @deprecated Use CommitBuilder.create() instead for more flexibility
 */
export const createMockCommit = (overrides: Partial<Commit> = {}): Commit => {
  const builder = CommitBuilder.create();

  // Apply overrides using builder methods where possible
  if (overrides.id) builder.withId(overrides.id);
  if (overrides.repoId) builder.withRepoId(overrides.repoId);
  if (overrides.hash) builder.withHash(overrides.hash);
  if (overrides.author) builder.withAuthor(overrides.author, overrides.email);
  if (overrides.email && !overrides.author) builder.withEmail(overrides.email);
  if (overrides.date) builder.withDate(overrides.date);
  if (overrides.message) builder.withMessage(overrides.message);
  if (overrides.branch) builder.withBranch(overrides.branch);

  if (
    overrides.filesChanged !== undefined ||
    overrides.insertions !== undefined ||
    overrides.deletions !== undefined
  ) {
    builder.withStats(
      overrides.filesChanged ?? 2,
      overrides.insertions ?? 10,
      overrides.deletions ?? 5
    );
  }

  const result = builder.build();

  // Apply any remaining overrides that weren't handled by the builder
  return { ...result, ...overrides };
};

/**
 * @deprecated Use TimePeriodBuilder.create() instead for more flexibility
 */
export const createMockTimePeriod = (
  overrides: Partial<TimePeriod> = {}
): TimePeriod => {
  const builder = TimePeriodBuilder.create().asLastWeek();

  if (overrides.type) builder.withType(overrides.type);
  if (overrides.startDate && overrides.endDate) {
    builder.withDateRange(overrides.startDate, overrides.endDate);
  }
  if (overrides.label) builder.withLabel(overrides.label);

  const result = builder.build();

  // Apply any remaining overrides
  return { ...result, ...overrides };
};

const dbCounter = 0;

export const createTestDatabase = (): DatabaseManager => {
  // Use in-memory database for tests
  return new DatabaseManager(':memory:');
};

/**
 * @deprecated Use TestDataFactory.createRepositoryWithCommits() instead
 */
export const createMockCommits = (
  count: number,
  repoId: number = 1
): Commit[] => {
  return Array.from({ length: count }, (_, index) =>
    CommitBuilder.create()
      .withId(index + 1)
      .withRepoId(repoId)
      .withHash(`commit${index + 1}hash`)
      .withAuthor(`Author ${index + 1}`, `author${index + 1}@example.com`)
      .withDate(new Date(Date.now() - (count - index) * 24 * 60 * 60 * 1000))
      .withMessage(`commit ${index + 1}: update files`)
      .build()
  );
};
