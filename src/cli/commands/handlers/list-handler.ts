import { DatabaseManager } from "../../../storage/database";
import { DateUtils } from "../../../utils/date-utils";
import { log } from "../../../utils/logger";

export class ListHandler {
  constructor(private db: DatabaseManager) {}

  execute(): void {
    const repositories = this.db.getAllRepositories();

    if (repositories.length === 0) {
      log.output("No repositories are currently tracked.", "list");
      log.output(
        'Use "git-summary add-repo <path>" to add repositories.',
        "list",
      );
      return;
    }

    log.output(`\n📚 Tracked Repositories (${repositories.length}):\n`, "list");

    for (const repo of repositories) {
      log.output(`📁 ${repo.name}`, "list");
      log.output(`Path: ${repo.path}`, "list");
      if (repo.remoteUrl) {
        log.output(`Remote: ${repo.remoteUrl}`, "list");
      }
      if (repo.lastSynced) {
        log.output(
          `   Last Synced: ${DateUtils.formatDateTime(repo.lastSynced)}`,
          "list",
        );
      }
      log.output("", "list");
    }
  }
}
