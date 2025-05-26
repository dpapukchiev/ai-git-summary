import { SimpleGit } from 'simple-git';

export interface GitOperations {
  getDiffSummary(
    fromRef: string,
    toRef: string
  ): Promise<{
    filesChanged: number;
    insertions: number;
    deletions: number;
  }>;

  getDiffNumstat(fromRef: string, toRef: string): Promise<string>;
}

export interface CommitStats {
  filesChanged: number;
  insertions: number;
  deletions: number;
  fileChanges: Array<{
    filePath: string;
    changeType: 'added' | 'deleted' | 'modified' | 'renamed';
    insertions: number;
    deletions: number;
  }>;
}

export class SimpleGitOperations implements GitOperations {
  constructor(private git: SimpleGit) {}

  async getDiffSummary(
    fromRef: string,
    toRef: string
  ): Promise<{
    filesChanged: number;
    insertions: number;
    deletions: number;
  }> {
    const diffSummary = await this.git.diffSummary([fromRef, toRef]);
    return {
      filesChanged: diffSummary.files.length,
      insertions: diffSummary.insertions,
      deletions: diffSummary.deletions,
    };
  }

  async getDiffNumstat(fromRef: string, toRef: string): Promise<string> {
    return await this.git.diff([fromRef, toRef, '--numstat']);
  }
}
