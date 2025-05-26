import { simpleGit, SimpleGit } from 'simple-git';
import { Repository } from '../types';
import { parseGitRemoteUrl, organizationMatches } from '../utils/git-utils';
import { log } from '../utils/logger';

export class GitRemoteHandler {
  async getRemoteUrl(git: SimpleGit): Promise<string | undefined> {
    try {
      const remotes = await git.getRemotes(true);
      const origin = remotes.find(r => r.name === 'origin');
      return origin?.refs?.fetch;
    } catch (error) {
      log.warn('Could not get remote URL', 'git-remote-handler');
      log.debug(`Remote URL error: ${error}`, 'git-remote-handler');
      return undefined;
    }
  }

  async filterRepositoriesByOrganization(
    repositories: Repository[],
    organizationName: string
  ): Promise<Repository[]> {
    log.output(
      `🔎 Filtering ${repositories.length} repositories for organization: ${organizationName}`,
      'git-remote-handler'
    );

    if (repositories.length === 0) {
      log.output(`⚠️  No repositories to filter`, 'git-remote-handler');
      return [];
    }

    const filteredRepositories: Repository[] = [];

    for (let i = 0; i < repositories.length; i++) {
      const repo = repositories[i];
      if (!repo) {
        log.debug(
          `⚠️  Skipping undefined repository at index ${i}`,
          'git-remote-handler'
        );
        continue;
      }

      log.debug(
        `[${i + 1}/${repositories.length}] Checking: ${repo.name}`,
        'git-remote-handler'
      );

      const isMatch = await this.checkRepositoryOrganization(
        repo,
        organizationName
      );

      if (isMatch) {
        log.output(
          `✅ MATCH! Adding to filtered results`,
          'git-remote-handler'
        );
        filteredRepositories.push(repo);
      }
    }

    this.logFilterResults(filteredRepositories, organizationName);
    return filteredRepositories;
  }

  private async checkRepositoryOrganization(
    repository: Repository,
    organizationName: string
  ): Promise<boolean> {
    try {
      const git = simpleGit(repository.path);
      const remoteUrl = await this.getRemoteUrl(git);

      if (!remoteUrl) {
        log.debug(`⚠️  No remote URL found`, 'git-remote-handler');
        return false;
      }

      log.debug(`🌐 Remote URL: ${remoteUrl}`, 'git-remote-handler');
      const remoteInfo = parseGitRemoteUrl(remoteUrl);

      if (!remoteInfo) {
        log.debug(`⚠️  Could not parse remote URL`, 'git-remote-handler');
        return false;
      }

      log.debug(
        `🏢 Parsed organization: ${remoteInfo.organization}`,
        'git-remote-handler'
      );
      log.debug(
        `📊 Repository name: ${remoteInfo.repository}`,
        'git-remote-handler'
      );

      const matches = organizationMatches(
        remoteInfo.organization,
        organizationName
      );

      if (!matches) {
        log.debug(
          `❌ No match (expected: ${organizationName})`,
          'git-remote-handler'
        );
      }

      return matches;
    } catch (error) {
      log.debug(
        `❌ Error checking remote for repository ${repository.path}`,
        'git-remote-handler'
      );
      log.debug(`Remote check error: ${error}`, 'git-remote-handler');
      return false;
    }
  }

  private logFilterResults(
    filteredRepositories: Repository[],
    organizationName: string
  ): void {
    log.output(`\n🎯 Organization filtering complete!`, 'git-remote-handler');
    log.output(
      `📊 Found ${filteredRepositories.length} repositories matching organization: ${organizationName}`,
      'git-remote-handler'
    );

    if (filteredRepositories.length > 0) {
      log.output(`📋 Matching repositories:`, 'git-remote-handler');
      filteredRepositories.forEach((repo, index) => {
        if (repo) {
          log.output(
            `   ${index + 1}. ${repo.name} (${repo.path})`,
            'git-remote-handler'
          );
        }
      });
    }
  }
}
