import { DefaultLogFields } from 'simple-git';
import { DatabaseManager } from '../storage/database';
import { log } from '../utils/logger';
import { CommitStatsService } from './commit-stats-service';

export class CommitProcessor {
  constructor(
    private db: DatabaseManager,
    private statsService: CommitStatsService
  ) {}

  async processCommit(
    repoId: number,
    logEntry: DefaultLogFields
  ): Promise<void> {
    try {
      const stats = await this.statsService.getCommitStats(logEntry.hash);

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
    fileChanges: Array<{
      filePath: string;
      changeType: 'added' | 'deleted' | 'modified' | 'renamed';
      insertions: number;
      deletions: number;
    }>,
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
}
