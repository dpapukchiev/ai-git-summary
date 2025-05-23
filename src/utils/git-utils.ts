import { execSync } from "child_process";

/**
 * Git utilities for working with git configuration and user information
 */
export class GitUtils {
  /**
   * Get the current git user name from git config
   */
  static getCurrentUserName(): string | null {
    try {
      const userName = execSync("git config user.name", {
        encoding: "utf8",
      }).trim();
      return userName || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get the current git user email from git config
   */
  static getCurrentUserEmail(): string | null {
    try {
      const userEmail = execSync("git config user.email", {
        encoding: "utf8",
      }).trim();
      return userEmail || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get the current git user's name or email (whichever is available)
   */
  static getCurrentUser(): string | null {
    return this.getCurrentUserName() || this.getCurrentUserEmail();
  }

  /**
   * Check if an author string matches the current git user
   */
  static isCurrentUser(author: string): boolean {
    const userName = this.getCurrentUserName();
    const userEmail = this.getCurrentUserEmail();

    return author === userName || author === userEmail;
  }
}
