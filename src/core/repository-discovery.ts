import fs from "fs";
import path from "path";
import { Repository } from "../types";
import { log } from "../utils/logger";

export class RepositoryDiscovery {
  private static readonly DEFAULT_MAX_DEPTH = 3;
  private static readonly EXCLUDED_DIRECTORIES = [
    "node_modules",
    ".git",
    "dist",
    "build",
    "out",
    "coverage",
    ".next",
    ".cache",
  ];

  async discoverRepositories(searchPaths: string[]): Promise<Repository[]> {
    log.output(
      `🔍 Discovering repositories in ${searchPaths.length} search paths...`,
      "repository-discovery"
    );

    const repositories: Repository[] = [];

    for (const searchPath of searchPaths) {
      log.output(`📂 Scanning: ${searchPath}`, "repository-discovery");

      if (!this.pathExists(searchPath)) {
        log.output(
          `⚠️  Search path does not exist: ${searchPath}`,
          "repository-discovery"
        );
        continue;
      }

      const repos = await this.findGitRepositories(searchPath);
      log.output(
        `Found ${repos.length} repositories in this path`,
        "repository-discovery"
      );
      repositories.push(...repos);
    }

    log.output(
      `📊 Total repositories discovered: ${repositories.length}`,
      "repository-discovery"
    );
    return repositories;
  }

  async findGitRepositories(
    basePath: string,
    maxDepth: number = RepositoryDiscovery.DEFAULT_MAX_DEPTH
  ): Promise<Repository[]> {
    const repositories: Repository[] = [];

    await this.searchDirectory(basePath, 0, maxDepth, repositories);
    return repositories;
  }

  private async searchDirectory(
    currentPath: string,
    depth: number,
    maxDepth: number,
    repositories: Repository[]
  ): Promise<void> {
    if (depth > maxDepth) return;

    try {
      const items = fs.readdirSync(currentPath, { withFileTypes: true });

      if (this.isGitRepository(items)) {
        const repository = this.createRepositoryFromPath(currentPath);
        repositories.push(repository);
        return; // Don't search subdirectories of git repos
      }

      await this.searchSubdirectories(
        currentPath,
        items,
        depth,
        maxDepth,
        repositories
      );
    } catch (error) {
      log.warn(
        `Could not read directory ${currentPath}`,
        "repository-discovery"
      );
      log.debug(`Directory read error: ${error}`, "repository-discovery");
    }
  }

  private isGitRepository(items: fs.Dirent[]): boolean {
    return items.some((item) => item.name === ".git" && item.isDirectory());
  }

  private createRepositoryFromPath(repositoryPath: string): Repository {
    return {
      name: path.basename(repositoryPath),
      path: repositoryPath,
    };
  }

  private async searchSubdirectories(
    currentPath: string,
    items: fs.Dirent[],
    depth: number,
    maxDepth: number,
    repositories: Repository[]
  ): Promise<void> {
    const subdirectories = items.filter(
      (item) => item.isDirectory() && this.shouldSearchDirectory(item.name)
    );

    for (const directory of subdirectories) {
      const subdirectoryPath = path.join(currentPath, directory.name);
      await this.searchDirectory(
        subdirectoryPath,
        depth + 1,
        maxDepth,
        repositories
      );
    }
  }

  private shouldSearchDirectory(directoryName: string): boolean {
    return (
      !directoryName.startsWith(".") &&
      !RepositoryDiscovery.EXCLUDED_DIRECTORIES.includes(directoryName)
    );
  }

  private pathExists(searchPath: string): boolean {
    return fs.existsSync(searchPath);
  }
}
