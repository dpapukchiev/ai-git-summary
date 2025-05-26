import { DatabaseManager } from '../../src/storage/database';
import { Commit, FileChange, Repository } from '../../src/types';
import {
  CommitBuilder,
  FileChangeBuilder,
  RepositoryBuilder,
} from './test-builders';

/**
 * Scenario-based test helpers that encapsulate common test patterns
 */
export class TestScenarios {
  constructor(private db: DatabaseManager) {}

  /**
   * Creates a typical development scenario with multiple commits from different authors
   */
  createDevelopmentTeamScenario(): {
    repositories: Repository[];
    commits: Commit[];
    repositoryIds: number[];
  } {
    // Create repositories
    const frontendRepo = RepositoryBuilder.create()
      .withName('frontend-app')
      .withPath('/path/to/frontend')
      .build();

    const backendRepo = RepositoryBuilder.create()
      .withName('backend-api')
      .withPath('/path/to/backend')
      .build();

    const frontendRepoId = this.db.addRepository(frontendRepo);
    const backendRepoId = this.db.addRepository(backendRepo);

    // Create commits from different team members
    const commits = [
      // John's feature work on frontend
      CommitBuilder.create()
        .withRepoId(frontendRepoId)
        .withHash('frontend-feat-1')
        .withAuthor('John Doe', 'john@company.com')
        .withDate(new Date('2024-01-15T09:00:00Z'))
        .asFeatureCommit()
        .withMessage('feat: add user authentication component')
        .build(),

      // Jane's API work on backend
      CommitBuilder.create()
        .withRepoId(backendRepoId)
        .withHash('backend-api-1')
        .withAuthor('Jane Smith', 'jane@company.com')
        .withDate(new Date('2024-01-15T11:30:00Z'))
        .asFeatureCommit()
        .withMessage('feat: implement user authentication API')
        .withStats(4, 80, 15)
        .build(),

      // John's bug fix
      CommitBuilder.create()
        .withRepoId(frontendRepoId)
        .withHash('frontend-fix-1')
        .withAuthor('John Doe', 'john@company.com')
        .withDate(new Date('2024-01-16T14:00:00Z'))
        .asBugfixCommit()
        .withMessage('fix: resolve login validation issue')
        .build(),

      // Documentation update
      CommitBuilder.create()
        .withRepoId(frontendRepoId)
        .withHash('docs-update-1')
        .withAuthor('Alice Johnson', 'alice@company.com')
        .withDate(new Date('2024-01-17T10:00:00Z'))
        .asDocumentationCommit()
        .withMessage('docs: update component usage examples')
        .build(),
    ];

    // Add commits to database
    const commitIds: number[] = [];
    commits.forEach(commit => {
      const commitId = this.db.addCommit(commit);
      commit.id = commitId;
      commitIds.push(commitId);
    });

    // Add some file changes for the commits
    if (commitIds[0]) {
      this.addFileChangesForCommit(commitIds[0], [
        FileChangeBuilder.create()
          .withCommitId(commitIds[0])
          .asTypeScriptFile('components/Auth.tsx')
          .asAddedFile()
          .build(),
        FileChangeBuilder.create()
          .withCommitId(commitIds[0])
          .asTypeScriptFile('types/auth.ts')
          .asAddedFile()
          .build(),
      ]);
    }

    return {
      repositories: [frontendRepo, backendRepo],
      commits,
      repositoryIds: [frontendRepoId, backendRepoId],
    };
  }

  /**
   * Creates a single developer working on multiple features scenario
   */
  createSingleDeveloperScenario(author: string = 'Solo Developer'): {
    repository: Repository;
    commits: Commit[];
    repositoryId: number;
  } {
    const repo = RepositoryBuilder.create()
      .withName('solo-project')
      .withPath('/path/to/solo-project')
      .build();

    const repoId = this.db.addRepository(repo);

    const commits = [
      // Initial feature
      CommitBuilder.create()
        .withRepoId(repoId)
        .withHash('initial-feat')
        .withAuthor(author)
        .withDate(new Date('2024-01-10T09:00:00Z'))
        .asFeatureCommit()
        .withMessage('feat: initial project setup')
        .withStats(10, 200, 0)
        .build(),

      // Bug fix
      CommitBuilder.create()
        .withRepoId(repoId)
        .withHash('quick-fix')
        .withAuthor(author)
        .withDate(new Date('2024-01-12T15:30:00Z'))
        .asBugfixCommit()
        .withMessage('fix: resolve startup issue')
        .build(),

      // Refactoring
      CommitBuilder.create()
        .withRepoId(repoId)
        .withHash('refactor-code')
        .withAuthor(author)
        .withDate(new Date('2024-01-14T11:00:00Z'))
        .asRefactorCommit()
        .withMessage('refactor: improve code organization')
        .build(),

      // Documentation
      CommitBuilder.create()
        .withRepoId(repoId)
        .withHash('add-docs')
        .withAuthor(author)
        .withDate(new Date('2024-01-16T16:00:00Z'))
        .asDocumentationCommit()
        .withMessage('docs: add comprehensive README')
        .build(),
    ];

    // Add commits to database
    commits.forEach(commit => {
      const commitId = this.db.addCommit(commit);
      commit.id = commitId;
    });

    return {
      repository: repo,
      commits,
      repositoryId: repoId,
    };
  }

  /**
   * Creates a scenario with commits spread across different time periods
   */
  createTimeSpreadScenario(): {
    repository: Repository;
    oldCommits: Commit[];
    recentCommits: Commit[];
    repositoryId: number;
  } {
    const repo = RepositoryBuilder.create()
      .withName('time-spread-project')
      .build();

    const repoId = this.db.addRepository(repo);

    // Old commits (outside typical analysis period)
    const oldCommits = [
      CommitBuilder.create()
        .withRepoId(repoId)
        .withHash('old-commit-1')
        .withDate(new Date('2023-12-01T10:00:00Z'))
        .withMessage('feat: old feature')
        .build(),
      CommitBuilder.create()
        .withRepoId(repoId)
        .withHash('old-commit-2')
        .withDate(new Date('2023-12-15T14:00:00Z'))
        .withMessage('fix: old bug fix')
        .build(),
    ];

    // Recent commits (within typical analysis period)
    const recentCommits = [
      CommitBuilder.create()
        .withRepoId(repoId)
        .withHash('recent-commit-1')
        .withDate(new Date('2024-01-15T09:00:00Z'))
        .asFeatureCommit()
        .withMessage('feat: new feature')
        .build(),
      CommitBuilder.create()
        .withRepoId(repoId)
        .withHash('recent-commit-2')
        .withDate(new Date('2024-01-16T11:00:00Z'))
        .asBugfixCommit()
        .withMessage('fix: recent bug fix')
        .build(),
    ];

    // Add all commits to database
    [...oldCommits, ...recentCommits].forEach(commit => {
      const commitId = this.db.addCommit(commit);
      commit.id = commitId;
    });

    return {
      repository: repo,
      oldCommits,
      recentCommits,
      repositoryId: repoId,
    };
  }

  /**
   * Creates a scenario with various file types and languages
   */
  createMultiLanguageScenario(): {
    repository: Repository;
    commits: Commit[];
    repositoryId: number;
  } {
    const repo = RepositoryBuilder.create()
      .withName('multi-language-project')
      .build();

    const repoId = this.db.addRepository(repo);

    const commits = [
      // TypeScript/React work
      CommitBuilder.create()
        .withRepoId(repoId)
        .withHash('ts-work')
        .withAuthor('Frontend Dev')
        .withMessage('feat: add React components')
        .withStats(5, 120, 20)
        .build(),

      // Python backend work
      CommitBuilder.create()
        .withRepoId(repoId)
        .withHash('py-work')
        .withAuthor('Backend Dev')
        .withMessage('feat: implement Python API')
        .withStats(3, 80, 10)
        .build(),

      // Documentation and config
      CommitBuilder.create()
        .withRepoId(repoId)
        .withHash('docs-config')
        .withAuthor('DevOps Engineer')
        .withMessage('chore: update documentation and config')
        .withStats(4, 60, 15)
        .build(),
    ];

    // Add commits to database
    const commitIds: number[] = [];
    commits.forEach(commit => {
      const commitId = this.db.addCommit(commit);
      commit.id = commitId;
      commitIds.push(commitId);
    });

    // Add file changes with different languages
    if (commitIds[0]) {
      this.addFileChangesForCommit(commitIds[0], [
        FileChangeBuilder.create()
          .withCommitId(commitIds[0])
          .asTypeScriptFile('components/Button.tsx')
          .asModifiedFile()
          .build(),
        FileChangeBuilder.create()
          .withCommitId(commitIds[0])
          .asTypeScriptFile('hooks/useAuth.ts')
          .asAddedFile()
          .build(),
      ]);
    }

    if (commitIds[1]) {
      this.addFileChangesForCommit(commitIds[1], [
        FileChangeBuilder.create()
          .withCommitId(commitIds[1])
          .withFilePath('src/api/auth.py')
          .asModifiedFile()
          .build(),
        FileChangeBuilder.create()
          .withCommitId(commitIds[1])
          .withFilePath('src/models/user.py')
          .asAddedFile()
          .build(),
      ]);
    }

    if (commitIds[2]) {
      this.addFileChangesForCommit(commitIds[2], [
        FileChangeBuilder.create()
          .withCommitId(commitIds[2])
          .asDocumentationFile('README.md')
          .asModifiedFile()
          .build(),
        FileChangeBuilder.create()
          .withCommitId(commitIds[2])
          .withFilePath('docker-compose.yml')
          .asModifiedFile()
          .build(),
      ]);
    }

    return {
      repository: repo,
      commits,
      repositoryId: repoId,
    };
  }

  /**
   * Creates an empty scenario for testing edge cases
   */
  createEmptyScenario(): {
    repository: Repository;
    repositoryId: number;
  } {
    const repo = RepositoryBuilder.create().withName('empty-project').build();

    const repoId = this.db.addRepository(repo);

    return {
      repository: repo,
      repositoryId: repoId,
    };
  }

  /**
   * Helper method to add file changes for a commit
   */
  private addFileChangesForCommit(
    commitId: number,
    fileChanges: FileChange[]
  ): void {
    fileChanges.forEach(fileChange => {
      this.db.addFileChange(fileChange);
    });
  }
}

/**
 * Factory for creating common test data combinations
 */
export class TestDataFactory {
  /**
   * Creates a complete repository with commits and file changes
   */
  static createRepositoryWithCommits(
    db: DatabaseManager,
    options: {
      repositoryName?: string;
      commitCount?: number;
      author?: string;
      dateRange?: { start: Date; end: Date };
    } = {}
  ): { repositoryId: number; commits: Commit[] } {
    const {
      repositoryName = 'test-repo',
      commitCount = 3,
      author = 'Test Author',
      dateRange = {
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-31T23:59:59Z'),
      },
    } = options;

    // Create repository
    const repo = RepositoryBuilder.create().withName(repositoryName).build();
    const repositoryId = db.addRepository(repo);

    // Create commits spread across the date range
    const commits: Commit[] = [];
    const timeSpan = dateRange.end.getTime() - dateRange.start.getTime();
    const timeIncrement = timeSpan / (commitCount - 1);

    for (let i = 0; i < commitCount; i++) {
      const commitDate = new Date(
        dateRange.start.getTime() + i * timeIncrement
      );

      const commit = CommitBuilder.create()
        .withRepoId(repositoryId)
        .withHash(`commit-${i + 1}`)
        .withAuthor(author)
        .withDate(commitDate)
        .withMessage(`commit ${i + 1}: update files`)
        .withStats(2, 10 + i * 5, 2 + i)
        .build();

      const commitId = db.addCommit(commit);
      commit.id = commitId;
      commits.push(commit);
    }

    return { repositoryId, commits };
  }

  /**
   * Creates test data for author comparison scenarios
   */
  static createAuthorComparisonData(
    db: DatabaseManager,
    authors: string[]
  ): { repositoryId: number; commitsByAuthor: Map<string, Commit[]> } {
    const repo = RepositoryBuilder.create()
      .withName('author-comparison-repo')
      .build();
    const repositoryId = db.addRepository(repo);

    const commitsByAuthor = new Map<string, Commit[]>();

    authors.forEach((author, authorIndex) => {
      const authorCommits: Commit[] = [];

      // Each author gets 2-4 commits with different characteristics
      const commitCount = 2 + (authorIndex % 3);

      for (let i = 0; i < commitCount; i++) {
        const commit = CommitBuilder.create()
          .withRepoId(repositoryId)
          .withHash(`${author.toLowerCase().replace(' ', '-')}-${i + 1}`)
          .withAuthor(author)
          .withDate(new Date(`2024-01-${15 + authorIndex + i}T${9 + i}:00:00Z`))
          .withMessage(`${author}'s commit ${i + 1}`)
          .withStats(1 + i, 10 + authorIndex * 10 + i * 5, 2 + i)
          .build();

        const commitId = db.addCommit(commit);
        commit.id = commitId;
        authorCommits.push(commit);
      }

      commitsByAuthor.set(author, authorCommits);
    });

    return { repositoryId, commitsByAuthor };
  }
}
