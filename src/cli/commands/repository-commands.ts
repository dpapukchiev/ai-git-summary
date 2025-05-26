import { Command } from 'commander';
import { DatabaseManager } from '../../storage/database';
import { GitAnalyzer } from '../../core/git-analyzer';
import {
  AddRepoHandler,
  DiscoverHandler,
  SyncHandler,
  ListHandler,
  AddOrgHandler,
} from './handlers';
import { log } from '../../utils/logger';

/**
 * Add repository commands to the CLI program
 */
export function addRepositoryCommands(
  program: Command,
  db: DatabaseManager,
  gitAnalyzer: GitAnalyzer
) {
  // Initialize handlers
  const addRepoHandler = new AddRepoHandler(gitAnalyzer);
  const discoverHandler = new DiscoverHandler(gitAnalyzer);
  const syncHandler = new SyncHandler(db, gitAnalyzer);
  const listHandler = new ListHandler(db);
  const addOrgHandler = new AddOrgHandler(gitAnalyzer);

  // Add repository command
  program
    .command('add-repo')
    .description('Add a git repository to track')
    .argument('<path>', 'Path to the git repository')
    .option('-n, --name <name>', 'Custom name for the repository')
    .action(async (repoPath: string, options) => {
      try {
        await addRepoHandler.execute(repoPath, options);
      } catch (error) {
        log.error('Error adding repository', error as Error, 'cli');
        process.exit(1);
      }
    });

  // Discover repositories command
  program
    .command('discover')
    .description('Discover git repositories in specified directories')
    .argument('<paths...>', 'Directory paths to search for git repositories')
    .option('-d, --max-depth <depth>', 'Maximum search depth', '3')
    .option(
      '-c, --concurrency <num>',
      'Number of repositories to process concurrently',
      '3'
    )
    .action(async (searchPaths: string[], options) => {
      try {
        await discoverHandler.execute(searchPaths, options);
      } catch (error) {
        log.error('Error during discovery', error as Error, 'cli');
        process.exit(1);
      }
    });

  // Sync command
  program
    .command('sync')
    .description('Sync all tracked repositories')
    .option('-r, --repos <repos...>', 'Specific repositories to sync')
    .option(
      '-c, --concurrency <num>',
      'Number of repositories to process concurrently',
      '3'
    )
    .action(async options => {
      try {
        await syncHandler.execute(options);
      } catch (error) {
        log.error('Error during sync', error as Error, 'cli');
        process.exit(1);
      }
    });

  // List repositories command
  program
    .command('list')
    .description('List all tracked repositories')
    .action(() => {
      try {
        listHandler.execute();
      } catch (error) {
        log.error('Error listing repositories', error as Error, 'cli');
        process.exit(1);
      }
    });

  // Add organization repositories command
  program
    .command('add-org')
    .description(
      'Add all repositories from a specific organization that exist in given directories'
    )
    .argument(
      '<organization>',
      "Organization name (e.g., 'zenjob', 'microsoft')"
    )
    .argument('<paths...>', 'Directory paths to search for repositories')
    .option('-d, --max-depth <depth>', 'Maximum search depth', '3')
    .option(
      '-c, --concurrency <num>',
      'Number of repositories to process concurrently',
      '3'
    )
    .option(
      '-n, --dry-run',
      'Show what repositories would be added without actually adding them'
    )
    .action(
      async (organizationName: string, searchPaths: string[], options) => {
        try {
          await addOrgHandler.execute(organizationName, searchPaths, options);
        } catch (error) {
          log.error(
            'Error during organization repository discovery',
            error as Error,
            'cli'
          );
          process.exit(1);
        }
      }
    );
}
