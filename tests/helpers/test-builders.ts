import { Commit, FileChange, Repository, TimePeriod } from '../../src/types';

/**
 * Fluent builder for creating test repositories with sensible defaults
 */
export class RepositoryBuilder {
  private repository: Partial<Repository> = {
    id: 1,
    name: 'test-repo',
    path: '/path/to/test-repo',
    remoteUrl: 'https://github.com/user/test-repo.git',
    lastSynced: new Date('2024-01-15T10:00:00Z'),
  };

  static create(): RepositoryBuilder {
    return new RepositoryBuilder();
  }

  withId(id: number): RepositoryBuilder {
    this.repository.id = id;
    return this;
  }

  withName(name: string): RepositoryBuilder {
    this.repository.name = name;
    this.repository.path = `/path/to/${name}`;
    this.repository.remoteUrl = `https://github.com/user/${name}.git`;
    return this;
  }

  withPath(path: string): RepositoryBuilder {
    this.repository.path = path;
    return this;
  }

  withRemoteUrl(url: string): RepositoryBuilder {
    this.repository.remoteUrl = url;
    return this;
  }

  withLastSynced(date: Date): RepositoryBuilder {
    this.repository.lastSynced = date;
    return this;
  }

  build(): Repository {
    return { ...this.repository } as Repository;
  }
}

/**
 * Fluent builder for creating test commits with sensible defaults
 */
export class CommitBuilder {
  private commit: Partial<Commit> = {
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
  };

  static create(): CommitBuilder {
    return new CommitBuilder();
  }

  withId(id: number): CommitBuilder {
    this.commit.id = id;
    return this;
  }

  withRepoId(repoId: number): CommitBuilder {
    this.commit.repoId = repoId;
    return this;
  }

  withHash(hash: string): CommitBuilder {
    this.commit.hash = hash;
    return this;
  }

  withAuthor(author: string, email?: string): CommitBuilder {
    this.commit.author = author;
    if (email) {
      this.commit.email = email;
    }
    return this;
  }

  withEmail(email: string): CommitBuilder {
    this.commit.email = email;
    return this;
  }

  withDate(date: Date): CommitBuilder {
    this.commit.date = date;
    return this;
  }

  withMessage(message: string): CommitBuilder {
    this.commit.message = message;
    return this;
  }

  withStats(
    filesChanged: number,
    insertions: number,
    deletions: number
  ): CommitBuilder {
    this.commit.filesChanged = filesChanged;
    this.commit.insertions = insertions;
    this.commit.deletions = deletions;
    return this;
  }

  withBranch(branch: string): CommitBuilder {
    this.commit.branch = branch;
    return this;
  }

  // Convenience methods for common scenarios
  asFeatureCommit(): CommitBuilder {
    return this.withMessage('feat: add new feature').withStats(3, 50, 10);
  }

  asBugfixCommit(): CommitBuilder {
    return this.withMessage('fix: resolve critical bug').withStats(1, 5, 2);
  }

  asDocumentationCommit(): CommitBuilder {
    return this.withMessage('docs: update README').withStats(1, 20, 0);
  }

  asRefactorCommit(): CommitBuilder {
    return this.withMessage('refactor: improve code structure').withStats(
      5,
      30,
      25
    );
  }

  build(): Commit {
    return { ...this.commit } as Commit;
  }
}

/**
 * Builder for creating time periods with sensible defaults
 */
export class TimePeriodBuilder {
  private period: Partial<TimePeriod> = {
    type: 'custom',
    startDate: new Date('2024-01-01T00:00:00Z'),
    endDate: new Date('2024-01-31T23:59:59Z'),
    label: 'Test Period',
  };

  static create(): TimePeriodBuilder {
    return new TimePeriodBuilder();
  }

  withType(type: TimePeriod['type']): TimePeriodBuilder {
    this.period.type = type;
    return this;
  }

  withDateRange(startDate: Date, endDate: Date): TimePeriodBuilder {
    this.period.startDate = startDate;
    this.period.endDate = endDate;
    return this;
  }

  withLabel(label: string): TimePeriodBuilder {
    this.period.label = label;
    return this;
  }

  // Convenience methods for common periods
  asLastWeek(): TimePeriodBuilder {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    return this.withType('rolling')
      .withDateRange(startDate, endDate)
      .withLabel('Last Week');
  }

  asLastMonth(): TimePeriodBuilder {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - 1);

    return this.withType('rolling')
      .withDateRange(startDate, endDate)
      .withLabel('Last Month');
  }

  asJanuary2024(): TimePeriodBuilder {
    return this.withType('custom')
      .withDateRange(
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-31T23:59:59Z')
      )
      .withLabel('January 2024');
  }

  build(): TimePeriod {
    return { ...this.period } as TimePeriod;
  }
}

/**
 * Builder for creating file changes
 */
export class FileChangeBuilder {
  private fileChange: Partial<FileChange> = {
    id: 1,
    commitId: 1,
    filePath: 'src/example.ts',
    changeType: 'modified',
    insertions: 10,
    deletions: 5,
  };

  static create(): FileChangeBuilder {
    return new FileChangeBuilder();
  }

  withId(id: number): FileChangeBuilder {
    this.fileChange.id = id;
    return this;
  }

  withCommitId(commitId: number): FileChangeBuilder {
    this.fileChange.commitId = commitId;
    return this;
  }

  withFilePath(filePath: string): FileChangeBuilder {
    this.fileChange.filePath = filePath;
    return this;
  }

  withChangeType(changeType: FileChange['changeType']): FileChangeBuilder {
    this.fileChange.changeType = changeType;
    return this;
  }

  withStats(insertions: number, deletions: number): FileChangeBuilder {
    this.fileChange.insertions = insertions;
    this.fileChange.deletions = deletions;
    return this;
  }

  // Convenience methods for common file types
  asTypeScriptFile(fileName: string = 'example.ts'): FileChangeBuilder {
    return this.withFilePath(`src/${fileName}`);
  }

  asTestFile(fileName: string = 'example.test.ts'): FileChangeBuilder {
    return this.withFilePath(`tests/${fileName}`);
  }

  asDocumentationFile(fileName: string = 'README.md'): FileChangeBuilder {
    return this.withFilePath(fileName);
  }

  asAddedFile(): FileChangeBuilder {
    return this.withChangeType('added').withStats(20, 0);
  }

  asDeletedFile(): FileChangeBuilder {
    return this.withChangeType('deleted').withStats(0, 15);
  }

  asModifiedFile(): FileChangeBuilder {
    return this.withChangeType('modified').withStats(10, 5);
  }

  build(): FileChange {
    return { ...this.fileChange } as FileChange;
  }
}
