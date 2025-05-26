import { CommitStatsService } from '../../src/core/commit-stats-service';
import { CommitStats, GitOperations } from '../../src/core/git-operations';

interface DiffSummaryResponse {
  filesChanged: number;
  insertions: number;
  deletions: number;
}

/**
 * Fake implementation of GitOperations for testing
 * Much simpler and more explicit than mocking
 */
export class FakeGitOperations implements GitOperations {
  private diffSummaryResponses = new Map<string, DiffSummaryResponse>();
  private diffNumstatResponses = new Map<string, string>();
  private errors = new Map<string, Error>();

  setDiffSummaryResponse(
    fromRef: string,
    toRef: string,
    response: DiffSummaryResponse
  ): void {
    const key = `${fromRef}..${toRef}`;
    this.diffSummaryResponses.set(key, response);
  }

  setDiffNumstatResponse(
    fromRef: string,
    toRef: string,
    response: string
  ): void {
    const key = `${fromRef}..${toRef}`;
    this.diffNumstatResponses.set(key, response);
  }

  setError(fromRef: string, toRef: string, error: Error): void {
    const key = `${fromRef}..${toRef}`;
    this.errors.set(key, error);
  }

  async getDiffSummary(
    fromRef: string,
    toRef: string
  ): Promise<DiffSummaryResponse> {
    const key = `${fromRef}..${toRef}`;

    if (this.errors.has(key)) {
      throw this.errors.get(key);
    }

    const response = this.diffSummaryResponses.get(key);
    if (!response) {
      throw new Error(`No diff summary response configured for ${key}`);
    }

    return response;
  }

  async getDiffNumstat(fromRef: string, toRef: string): Promise<string> {
    const key = `${fromRef}..${toRef}`;

    if (this.errors.has(key)) {
      throw this.errors.get(key);
    }

    const response = this.diffNumstatResponses.get(key);
    if (response === undefined) {
      throw new Error(`No diff numstat response configured for ${key}`);
    }

    return response;
  }

  // Helper methods for common test scenarios
  setupSuccessfulCommitStats(
    hash: string,
    stats: {
      filesChanged: number;
      insertions: number;
      deletions: number;
      fileChanges?: Array<{
        filePath: string;
        changeType: 'added' | 'deleted' | 'modified' | 'renamed';
        insertions: number;
        deletions: number;
      }>;
    }
  ): void {
    const fromRef = `${hash}^`;
    const toRef = hash;

    // Set up diff summary response
    this.setDiffSummaryResponse(fromRef, toRef, {
      filesChanged: stats.filesChanged,
      insertions: stats.insertions,
      deletions: stats.deletions,
    });

    // Set up diff numstat response
    const fileChanges = stats.fileChanges || [];
    const numstatLines = fileChanges.map(
      change => `${change.insertions}\t${change.deletions}\t${change.filePath}`
    );
    this.setDiffNumstatResponse(fromRef, toRef, numstatLines.join('\n'));
  }

  setupFirstCommitStats(
    hash: string,
    stats: {
      filesChanged: number;
      insertions: number;
      deletions: number;
      fileChanges?: Array<{
        filePath: string;
        changeType: 'added' | 'deleted' | 'modified' | 'renamed';
        insertions: number;
        deletions: number;
      }>;
    }
  ): void {
    const emptyTreeHash = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
    const fromRef = emptyTreeHash;
    const toRef = hash;

    // Set up diff summary response
    this.setDiffSummaryResponse(fromRef, toRef, {
      filesChanged: stats.filesChanged,
      insertions: stats.insertions,
      deletions: stats.deletions,
    });

    // Set up diff numstat response
    const fileChanges = stats.fileChanges || [];
    const numstatLines = fileChanges.map(
      change => `${change.insertions}\t${change.deletions}\t${change.filePath}`
    );
    this.setDiffNumstatResponse(fromRef, toRef, numstatLines.join('\n'));
  }

  setupCommitError(hash: string, error: Error): void {
    const fromRef = `${hash}^`;
    const toRef = hash;
    this.setError(fromRef, toRef, error);
  }

  reset(): void {
    this.diffSummaryResponses.clear();
    this.diffNumstatResponses.clear();
    this.errors.clear();
  }
}

/**
 * Fake implementation of CommitStatsService
 * Simpler and more explicit than the existing one in commit-processor.test.ts
 */
export class FakeCommitStatsService extends CommitStatsService {
  private responses = new Map<string, CommitStats>();
  private errors = new Map<string, Error>();

  constructor() {
    // Pass a fake GitOperations instance instead of null
    super(new FakeGitOperations());
  }

  setResponse(hash: string, stats: CommitStats): void {
    this.responses.set(hash, stats);
  }

  setError(hash: string, error: Error): void {
    this.errors.set(hash, error);
  }

  override async getCommitStats(hash: string): Promise<CommitStats> {
    if (this.errors.has(hash)) {
      throw this.errors.get(hash);
    }

    const response = this.responses.get(hash);
    if (!response) {
      throw new Error(`No response configured for ${hash}`);
    }

    return response;
  }

  // Helper methods for common scenarios
  setupSuccessfulCommit(
    hash: string,
    options: {
      filesChanged?: number;
      insertions?: number;
      deletions?: number;
      fileChanges?: Array<{
        filePath: string;
        changeType: 'added' | 'deleted' | 'modified' | 'renamed';
        insertions: number;
        deletions: number;
      }>;
    } = {}
  ): void {
    const stats: CommitStats = {
      filesChanged: options.filesChanged ?? 2,
      insertions: options.insertions ?? 10,
      deletions: options.deletions ?? 5,
      fileChanges: options.fileChanges ?? [
        {
          filePath: 'src/example.ts',
          changeType: 'modified',
          insertions: options.insertions ?? 10,
          deletions: options.deletions ?? 5,
        },
      ],
    };

    this.setResponse(hash, stats);
  }

  setupEmptyCommit(hash: string): void {
    this.setResponse(hash, {
      filesChanged: 0,
      insertions: 0,
      deletions: 0,
      fileChanges: [],
    });
  }

  setupLargeCommit(hash: string): void {
    this.setResponse(hash, {
      filesChanged: 15,
      insertions: 500,
      deletions: 200,
      fileChanges: Array.from({ length: 15 }, (_, i) => ({
        filePath: `src/file${i + 1}.ts`,
        changeType: 'modified' as const,
        insertions: 30 + i,
        deletions: 10 + i,
      })),
    });
  }

  reset(): void {
    this.responses.clear();
    this.errors.clear();
  }
}

/**
 * Fake logger that captures log calls for testing
 * Replaces the need to mock the logger module
 */
export class FakeLogger {
  public errorCalls: Array<{
    message: string;
    error?: Error;
    context?: string;
  }> = [];
  public warnCalls: Array<{ message: string; context?: string }> = [];
  public debugCalls: Array<{ message: string; context?: string }> = [];
  public infoCalls: Array<{ message: string; context?: string }> = [];

  error(message: string, error?: Error, context?: string): void {
    this.errorCalls.push({ message, error, context });
  }

  warn(message: string, context?: string): void {
    this.warnCalls.push({ message, context });
  }

  debug(message: string, context?: string): void {
    this.debugCalls.push({ message, context });
  }

  info(message: string, context?: string): void {
    this.infoCalls.push({ message, context });
  }

  reset(): void {
    this.errorCalls = [];
    this.warnCalls = [];
    this.debugCalls = [];
    this.infoCalls = [];
  }

  // Helper methods for assertions
  hasErrorWith(message: string): boolean {
    return this.errorCalls.some(call => call.message.includes(message));
  }

  hasWarnWith(message: string): boolean {
    return this.warnCalls.some(call => call.message.includes(message));
  }

  hasDebugWith(message: string): boolean {
    return this.debugCalls.some(call => call.message.includes(message));
  }

  getErrorCount(): number {
    return this.errorCalls.length;
  }

  getWarnCount(): number {
    return this.warnCalls.length;
  }
}

/**
 * Fake file system operations for testing
 * Replaces the need to mock the 'fs' module
 */
export class FakeFileSystem {
  private existingPaths = new Set<string>();
  private errors = new Map<string, Error>();

  setPathExists(path: string, exists: boolean = true): void {
    if (exists) {
      this.existingPaths.add(path);
    } else {
      this.existingPaths.delete(path);
    }
  }

  setError(path: string, error: Error): void {
    this.errors.set(path, error);
  }

  existsSync(path: string): boolean {
    if (this.errors.has(path)) {
      throw this.errors.get(path);
    }
    return this.existingPaths.has(path);
  }

  // Helper methods for common scenarios
  setupValidRepository(repoPath: string): void {
    this.setPathExists(repoPath);
    this.setPathExists(`${repoPath}/.git`);
  }

  setupInvalidRepository(repoPath: string): void {
    this.setPathExists(repoPath);
    this.setPathExists(`${repoPath}/.git`, false);
  }

  setupNonExistentPath(path: string): void {
    this.setPathExists(path, false);
  }

  reset(): void {
    this.existingPaths.clear();
    this.errors.clear();
  }
}

/**
 * Test utilities for working with fakes
 */
export class FakeTestUtils {
  /**
   * Creates a complete fake environment for testing git operations
   */
  static createGitTestEnvironment(): {
    fakeGitOps: FakeGitOperations;
    fakeStatsService: FakeCommitStatsService;
    fakeLogger: FakeLogger;
    fakeFs: FakeFileSystem;
  } {
    return {
      fakeGitOps: new FakeGitOperations(),
      fakeStatsService: new FakeCommitStatsService(),
      fakeLogger: new FakeLogger(),
      fakeFs: new FakeFileSystem(),
    };
  }

  /**
   * Resets all fakes to clean state
   */
  static resetAll(fakes: {
    fakeGitOps?: FakeGitOperations;
    fakeStatsService?: FakeCommitStatsService;
    fakeLogger?: FakeLogger;
    fakeFs?: FakeFileSystem;
  }): void {
    Object.values(fakes).forEach(fake => {
      if (fake && typeof fake.reset === 'function') {
        fake.reset();
      }
    });
  }
}
