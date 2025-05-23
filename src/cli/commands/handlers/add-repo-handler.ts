import { GitAnalyzer } from "../../../core/git-analyzer";
import * as fs from "fs";
import * as path from "path";

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

    console.log(`Adding repository: ${absolutePath}`);
    await this.gitAnalyzer.analyzeRepository(absolutePath, options.name);
    console.log("✅ Repository added and analyzed successfully!");
  }
}
