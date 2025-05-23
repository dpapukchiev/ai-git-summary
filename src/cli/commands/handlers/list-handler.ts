import { DatabaseManager } from "../../../storage/database";
import { DateUtils } from "../../../utils/date-utils";

export class ListHandler {
  constructor(private db: DatabaseManager) {}

  execute(): void {
    const repositories = this.db.getAllRepositories();

    if (repositories.length === 0) {
      console.log("No repositories are currently tracked.");
      console.log('Use "git-summary add-repo <path>" to add repositories.');
      return;
    }

    console.log(`\n📚 Tracked Repositories (${repositories.length}):\n`);

    for (const repo of repositories) {
      console.log(`📁 ${repo.name}`);
      console.log(`   Path: ${repo.path}`);
      if (repo.remoteUrl) {
        console.log(`   Remote: ${repo.remoteUrl}`);
      }
      if (repo.lastSynced) {
        console.log(
          `   Last Synced: ${DateUtils.formatDateTime(repo.lastSynced)}`
        );
      }
      console.log("");
    }
  }
}
