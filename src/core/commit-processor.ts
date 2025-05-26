import { DefaultLogFields, SimpleGit } from 'simple-git';
import { DatabaseManager } from '../storage/database';
import { FileChange } from '../types';
import { log } from '../utils/logger';

export class CommitProcessor {
  constructor(private db: DatabaseManager) {}

  async processCommit(
    git: SimpleGit,
    repoId: number,
    logEntry: DefaultLogFields
  ): Promise<void> {
    try {
      const stats = await this.getCommitStats(git, logEntry.hash);

      const commitId = this.db.addCommit({
        repoId,
        hash: logEntry.hash,
        author: logEntry.author_name,
        email: logEntry.author_email,
        date: new Date(logEntry.date),
        message: logEntry.message,
        filesChanged: stats.filesChanged,
        insertions: stats.insertions,
        deletions: stats.deletions,
      });

      this.validateCommitId(commitId, logEntry.hash);
      await this.saveFileChanges(commitId, stats.fileChanges, logEntry.hash);
    } catch (error) {
      log.error(
        `Error processing commit ${logEntry.hash}`,
        error as Error,
        'commit-processor'
      );
      throw error;
    }
  }

  private validateCommitId(commitId: number, hash: string): void {
    if (!commitId || commitId <= 0) {
      throw new Error(
        `Failed to add commit ${hash} - invalid commit ID: ${commitId}`
      );
    }
  }

  private async saveFileChanges(
    commitId: number,
    fileChanges: Omit<FileChange, 'id' | 'commitId'>[],
    hash: string
  ): Promise<void> {
    for (const fileChange of fileChanges) {
      try {
        this.db.addFileChange({
          commitId,
          ...fileChange,
        });
      } catch (fileChangeError) {
        log.error(
          `Error adding file change for commit ${hash}, file ${fileChange.filePath}`,
          fileChangeError as Error,
          'commit-processor'
        );
      }
    }
  }

  async getCommitStats(
    git: SimpleGit,
    hash: string
  ): Promise<{
    filesChanged: number;
    insertions: number;
    deletions: number;
    fileChanges: Omit<FileChange, 'id' | 'commitId'>[];
  }> {
    try {
      return await this.getRegularCommitStats(git, hash);
    } catch {
      return await this.getFirstCommitStats(git, hash);
    }
  }

  private async getRegularCommitStats(git: SimpleGit, hash: string) {
    const diffSummary = await git.diffSummary([`${hash}^`, hash]);
    const diff = await git.diff([`${hash}^`, hash, '--numstat']);
    const fileChanges = this.parseDiffNumstat(diff);

    return {
      filesChanged: diffSummary.files.length,
      insertions: diffSummary.insertions,
      deletions: diffSummary.deletions,
      fileChanges,
    };
  }

  private async getFirstCommitStats(git: SimpleGit, hash: string) {
    try {
      const emptyTreeHash = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
      const diffSummary = await git.diffSummary([emptyTreeHash, hash]);
      const diff = await git.diff([emptyTreeHash, hash, '--numstat']);
      const fileChanges = this.parseDiffNumstat(diff);

      return {
        filesChanged: diffSummary.files.length,
        insertions: diffSummary.insertions,
        deletions: diffSummary.deletions,
        fileChanges,
      };
    } catch {
      log.warn(`Could not get stats for commit ${hash}`, 'commit-processor');
      return {
        filesChanged: 0,
        insertions: 0,
        deletions: 0,
        fileChanges: [],
      };
    }
  }

  private parseDiffNumstat(
    diffOutput: string
  ): Omit<FileChange, 'id' | 'commitId'>[] {
    const lines = diffOutput
      .trim()
      .split('\n')
      .filter(line => line.length > 0);

    return lines
      .map(line => this.parseNumstatLine(line))
      .filter(
        (change): change is Omit<FileChange, 'id' | 'commitId'> =>
          change !== null
      );
  }

  private parseNumstatLine(
    line: string
  ): Omit<FileChange, 'id' | 'commitId'> | null {
    const parts = line.split('\t');
    if (parts.length < 3) return null;

    const insertions =
      parts[0] === '-' ? 0 : parseInt(parts[0] || '0', 10) || 0;
    const deletions = parts[1] === '-' ? 0 : parseInt(parts[1] || '0', 10) || 0;
    const filePath = parts[2];

    if (!filePath) return null;

    return {
      filePath,
      changeType: this.determineChangeType(insertions, deletions, filePath),
      insertions,
      deletions,
    };
  }

  private determineChangeType(
    insertions: number,
    deletions: number,
    filePath: string
  ): FileChange['changeType'] {
    if (filePath.includes(' => ')) return 'renamed';
    if (insertions > 0 && deletions === 0) return 'added';
    if (insertions === 0 && deletions > 0) return 'deleted';
    return 'modified';
  }
}
