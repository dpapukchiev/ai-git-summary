import { GitAnalyzer } from '../../../core/git-analyzer';
import { log } from '../../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export interface AddRepoOptions {
  name?: string;
}

export class AddRepoHandler {
  constructor(private gitAnalyzer: GitAnalyzer) {}

  async execute(repoPath: string, options: AddRepoOptions): Promise<void> {
    const absolutePath = path.resolve(repoPath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Repository path does not exist: ${absolutePath}`);
    }

    log.output(`Adding repository: ${absolutePath}`, 'add-repo');
    await this.gitAnalyzer.analyzeRepository(absolutePath, options.name);
    log.output('✅ Repository added and analyzed successfully!', 'add-repo');
  }
}
