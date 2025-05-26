import { execSync } from 'child_process';

/**
 * Git utilities for working with git configuration and user information
 */
export class GitUtils {
  /**
   * Get the current git user's name or email (whichever is available)
   */
  static getCurrentUser(): string | null {
    return this.getCurrentUserName() || this.getCurrentUserEmail();
  }

  /**
   * Get the current git user name from git config
   */
  private static getCurrentUserName(): string | null {
    try {
      const userName = execSync('git config user.name', {
        encoding: 'utf8',
      }).trim();
      return userName || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get the current git user email from git config
   */
  private static getCurrentUserEmail(): string | null {
    try {
      const userEmail = execSync('git config user.email', {
        encoding: 'utf8',
      }).trim();
      return userEmail || null;
    } catch (error) {
      return null;
    }
  }
}

/**
 * Git utility functions for extracting organization information
 */

export interface GitRemoteInfo {
  provider: 'github' | 'gitlab' | 'bitbucket' | 'other';
  organization: string;
  repository: string;
  url: string;
}

/**
 * Extract organization and repository information from a git remote URL
 */
export function parseGitRemoteUrl(remoteUrl: string): GitRemoteInfo | null {
  if (!remoteUrl) {
    return null;
  }

  // Normalize the URL
  let url = remoteUrl.trim();

  // Remove .git suffix if present
  if (url.endsWith('.git')) {
    url = url.slice(0, -4);
  }

  // Handle SSH URLs (git@github.com:owner/repo)
  const sshMatch = url.match(/^git@([^:]+):([^/]+)\/(.+)$/);
  if (sshMatch && sshMatch.length >= 4) {
    const host = sshMatch[1];
    const owner = sshMatch[2];
    const repo = sshMatch[3];
    if (host && owner && repo) {
      return {
        provider: getGitProvider(host),
        organization: owner,
        repository: repo,
        url: remoteUrl,
      };
    }
  }

  // Handle HTTPS URLs (https://github.com/owner/repo)
  const httpsMatch = url.match(/^https?:\/\/([^/]+)\/([^/]+)\/(.+)$/);
  if (httpsMatch && httpsMatch.length >= 4) {
    const host = httpsMatch[1];
    const owner = httpsMatch[2];
    const repo = httpsMatch[3];
    if (host && owner && repo) {
      return {
        provider: getGitProvider(host),
        organization: owner,
        repository: repo,
        url: remoteUrl,
      };
    }
  }

  return null;
}

/**
 * Determine the git provider based on hostname
 */
function getGitProvider(hostname: string): GitRemoteInfo['provider'] {
  const host = hostname.toLowerCase();

  if (host.includes('github')) {
    return 'github';
  } else if (host.includes('gitlab')) {
    return 'gitlab';
  } else if (host.includes('bitbucket')) {
    return 'bitbucket';
  } else {
    return 'other';
  }
}

/**
 * Check if two organization names match (case-insensitive)
 */
export function organizationMatches(
  orgName1: string,
  orgName2: string
): boolean {
  return orgName1.toLowerCase() === orgName2.toLowerCase();
}
