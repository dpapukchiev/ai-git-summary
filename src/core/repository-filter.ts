import { DatabaseManager } from '../storage/database';
import { Repository } from '../types';

/**
 * Repository filtering logic
 */
export class RepositoryFilter {
  constructor(private db: DatabaseManager) {}

  /**
   * Get all repositories
   */
  getAll(): Repository[] {
    return this.db.getAllRepositories();
  }

  /**
   * Filter repositories by paths
   */
  filterByPaths(repositoryPaths: string[]): Repository[] {
    const allRepositories = this.db.getAllRepositories();

    if (!repositoryPaths || repositoryPaths.length === 0) {
      return allRepositories;
    }

    return allRepositories.filter(repo =>
      this.matchesAnyPath(repo, repositoryPaths)
    );
  }

  /**
   * Get filtered repositories (legacy method for compatibility)
   */
  getFilteredRepositories(repositoryPaths?: string[]): Repository[] {
    return this.filterByPaths(repositoryPaths || []);
  }

  /**
   * Extract repository IDs from repository objects
   */
  extractRepositoryIds(repositories: Repository[]): number[] {
    return repositories.map(repo => repo.id!).filter(id => id !== undefined);
  }

  private matchesAnyPath(repo: Repository, paths: string[]): boolean {
    return paths.some(path => repo.path.includes(path) || repo.name === path);
  }
}
