import { log } from '../utils/logger';
import { CommitStats, GitOperations } from './git-operations';

export class CommitStatsService {
  constructor(private gitOps: GitOperations) {}

  async getCommitStats(hash: string): Promise<CommitStats> {
    try {
      return await this.getRegularCommitStats(hash);
    } catch (regularError) {
      log.debug(
        `Regular commit stats failed for ${hash}: ${(regularError as Error).message}`,
        'commit-stats'
      );
      try {
        return await this.getFirstCommitStats(hash);
      } catch (firstCommitError) {
        log.debug(
          `First commit stats failed for ${hash}: ${(firstCommitError as Error).message}`,
          'commit-stats'
        );
        return this.getZeroStats();
      }
    }
  }

  private async getRegularCommitStats(hash: string): Promise<CommitStats> {
    const fromRef = `${hash}^`;
    const toRef = hash;

    const [summary, numstat] = await Promise.all([
      this.gitOps.getDiffSummary(fromRef, toRef),
      this.gitOps.getDiffNumstat(fromRef, toRef),
    ]);

    const fileChanges = this.parseDiffNumstat(numstat);

    return {
      filesChanged: summary.filesChanged,
      insertions: summary.insertions,
      deletions: summary.deletions,
      fileChanges,
    };
  }

  private async getFirstCommitStats(hash: string): Promise<CommitStats> {
    const emptyTreeHash = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
    const fromRef = emptyTreeHash;
    const toRef = hash;

    const [summary, numstat] = await Promise.all([
      this.gitOps.getDiffSummary(fromRef, toRef),
      this.gitOps.getDiffNumstat(fromRef, toRef),
    ]);

    const fileChanges = this.parseDiffNumstat(numstat);

    return {
      filesChanged: summary.filesChanged,
      insertions: summary.insertions,
      deletions: summary.deletions,
      fileChanges,
    };
  }

  private getZeroStats(): CommitStats {
    return {
      filesChanged: 0,
      insertions: 0,
      deletions: 0,
      fileChanges: [],
    };
  }

  private parseDiffNumstat(diffOutput: string): Array<{
    filePath: string;
    changeType: 'added' | 'deleted' | 'modified' | 'renamed';
    insertions: number;
    deletions: number;
  }> {
    const lines = diffOutput
      .trim()
      .split('\n')
      .filter(line => line.length > 0);

    return lines
      .map(line => this.parseNumstatLine(line))
      .filter(
        (change): change is NonNullable<typeof change> => change !== null
      );
  }

  private parseNumstatLine(line: string): {
    filePath: string;
    changeType: 'added' | 'deleted' | 'modified' | 'renamed';
    insertions: number;
    deletions: number;
  } | null {
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
  ): 'added' | 'deleted' | 'modified' | 'renamed' {
    if (filePath.includes(' => ')) return 'renamed';
    if (insertions > 0 && deletions === 0) return 'added';
    if (insertions === 0 && deletions > 0) return 'deleted';
    return 'modified';
  }
}
