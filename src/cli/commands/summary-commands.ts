import { Command } from 'commander';
import { DataAggregator } from '../../core/data-aggregator';
import { formatSummary, OutputFormat } from '../../formatters';
import { formatRepositoryDetail } from '../../formatters/repository-detail-formatter';
import { NarrativeStyle, PeriodType, SummaryContext } from '../../types';
import { DateUtils } from '../../utils/date-utils';
import { GitUtils } from '../../utils/git-utils';
import { log } from '../../utils/logger';

/**
 * Validate AI context parameter
 */
function validateContext(context: string): SummaryContext {
  const validContexts: SummaryContext[] = [
    'standup',
    'retrospective',
    'performance-review',
    'general',
  ];
  if (!validContexts.includes(context as SummaryContext)) {
    log.error(
      `Invalid context '${context}'. Valid options: ${validContexts.join(', ')}`,
      undefined,
      'cli'
    );
    process.exit(1);
  }
  return context as SummaryContext;
}

/**
 * Validate AI style parameter
 */
function validateStyle(style: string): NarrativeStyle {
  const validStyles: NarrativeStyle[] = [
    'professional',
    'casual',
    'detailed',
    'concise',
  ];
  if (!validStyles.includes(style as NarrativeStyle)) {
    log.error(
      `Invalid style '${style}'. Valid options: ${validStyles.join(', ')}`,
      undefined,
      'cli'
    );
    process.exit(1);
  }
  return style as NarrativeStyle;
}

/**
 * Generate summary with optional AI enhancement
 */
async function generateSummaryWithOptionalAI(
  dataAggregator: DataAggregator,
  timePeriod: any,
  repos: string[] | undefined,
  author: string | undefined,
  aiSummary: boolean,
  context: string,
  style: string,
  verbose: boolean
) {
  if (aiSummary) {
    // Check if AI is available
    if (!dataAggregator.isAIAvailable()) {
      log.warn(
        '🤖 AI service not available. Please check your OpenAI API key configuration.',
        'cli'
      );
      log.info('💡 Falling back to standard summary...', 'cli');
    } else {
      if (verbose) {
        log.info(
          `🤖 Generating AI-powered summary (context: ${context}, style: ${style})...`,
          'cli'
        );
      }

      const validatedContext = validateContext(context);
      const validatedStyle = validateStyle(style);

      return await dataAggregator.generateWorkSummaryWithAI(
        timePeriod,
        repos,
        author,
        {
          context: validatedContext,
          style: validatedStyle,
        }
      );
    }
  }

  // Generate standard summary
  return await dataAggregator.generateWorkSummary(timePeriod, repos, author);
}

/**
 * Add summary commands to the CLI program
 */
export function addSummaryCommands(
  program: Command,
  dataAggregator: DataAggregator
) {
  // Create predefined summary commands
  const summaryPeriods: Array<{ period: PeriodType; description: string }> = [
    { period: '1week', description: 'Last week summary' },
    { period: '1month', description: 'Last month summary' },
    { period: '1year', description: 'Last year summary' },
    { period: 'ytd', description: 'Year to date summary' },
  ];

  for (const { period, description } of summaryPeriods) {
    program
      .command(period.replace(/\d+/, ''))
      .description(description)
      .option('-r, --repos <repos...>', 'Specific repositories to analyze')
      .option(
        '-f, --format <format>',
        'Output format (text, json, markdown)',
        'text'
      )
      .option('-a, --author <author>', 'Filter commits by author name or email')
      .option('--me', 'Filter commits by current git user')
      .option('--ai-summary', 'Generate AI-powered summary')
      .option(
        '--context <context>',
        'AI summary context (standup, retrospective, performance-review, general)',
        'general'
      )
      .option(
        '--style <style>',
        'AI narrative style (professional, casual, detailed, concise)',
        'professional'
      )
      .option('-v, --verbose', 'Verbose output')
      .action(async options => {
        try {
          if (options.verbose) {
            log.info(`📊 Generating ${description.toLowerCase()}...`, 'cli');
          }

          // Handle author filtering
          let author = options.author;
          if (options.me) {
            const currentUser = GitUtils.getCurrentUser();
            if (!currentUser) {
              log.error(
                'Could not determine current git user. Please set git config user.name or user.email',
                undefined,
                'cli'
              );
              process.exit(1);
            }
            author = currentUser;
            if (options.verbose) {
              log.info(
                `🔍 Filtering commits by current user: ${author}`,
                'cli'
              );
            }
          }

          const timePeriod = DateUtils.getPeriod(period);
          const summary = await generateSummaryWithOptionalAI(
            dataAggregator,
            timePeriod,
            options.repos,
            author,
            options.aiSummary,
            options.context,
            options.style,
            options.verbose
          );

          formatSummary(
            summary,
            options.format as OutputFormat,
            options.verbose
          );
        } catch (error) {
          log.error('Error generating summary', error as Error, 'cli');
          process.exit(1);
        }
      });
  }

  // Special months command that accepts a numeric argument
  program
    .command('months')
    .description('Generate summary for specified number of months')
    .argument('[count]', 'Number of months (default: 3)', '3')
    .option('-r, --repos <repos...>', 'Specific repositories to analyze')
    .option(
      '-f, --format <format>',
      'Output format (text, json, markdown)',
      'text'
    )
    .option('-a, --author <author>', 'Filter commits by author name or email')
    .option('--me', 'Filter commits by current git user')
    .option('--ai-summary', 'Generate AI-powered summary')
    .option(
      '--context <context>',
      'AI summary context (standup, retrospective, performance-review, general)',
      'general'
    )
    .option(
      '--style <style>',
      'AI narrative style (professional, casual, detailed, concise)',
      'professional'
    )
    .option('-v, --verbose', 'Verbose output')
    .action(async (count: string, options) => {
      try {
        const monthCount = parseInt(count, 10);
        if (isNaN(monthCount) || monthCount <= 0) {
          log.error(
            'Invalid month count. Please provide a positive number.',
            undefined,
            'cli'
          );
          process.exit(1);
        }

        const description = `Last ${monthCount} month${monthCount === 1 ? '' : 's'} summary`;

        if (options.verbose) {
          log.info(`📊 Generating ${description.toLowerCase()}...`, 'cli');
        }

        // Handle author filtering
        let author = options.author;
        if (options.me) {
          const currentUser = GitUtils.getCurrentUser();
          if (!currentUser) {
            log.error(
              'Could not determine current git user. Please set git config user.name or user.email',
              undefined,
              'cli'
            );
            process.exit(1);
          }
          author = currentUser;
          if (options.verbose) {
            log.info(`🔍 Filtering commits by current user: ${author}`, 'cli');
          }
        }

        // Create custom time period for the specified number of months
        const now = new Date();
        const startDate = new Date(now);
        startDate.setMonth(now.getMonth() - monthCount);

        const timePeriod = DateUtils.getPeriod('custom', startDate, now);
        // Override the label to reflect the actual period
        timePeriod.label = `Last ${monthCount} Month${monthCount === 1 ? '' : 's'}`;

        const summary = await generateSummaryWithOptionalAI(
          dataAggregator,
          timePeriod,
          options.repos,
          author,
          options.aiSummary,
          options.context,
          options.style,
          options.verbose
        );

        formatSummary(summary, options.format as OutputFormat, options.verbose);
      } catch (error) {
        log.error('Error generating summary', error as Error, 'cli');
        process.exit(1);
      }
    });

  // Custom period command
  program
    .command('period')
    .description('Generate summary for custom date range')
    .requiredOption('--from <date>', 'Start date (YYYY-MM-DD)')
    .requiredOption('--to <date>', 'End date (YYYY-MM-DD)')
    .option('-r, --repos <repos...>', 'Specific repositories to analyze')
    .option(
      '-f, --format <format>',
      'Output format (text, json, markdown)',
      'text'
    )
    .option('-a, --author <author>', 'Filter commits by author name or email')
    .option('--me', 'Filter commits by current git user')
    .option('--ai-summary', 'Generate AI-powered summary')
    .option(
      '--context <context>',
      'AI summary context (standup, retrospective, performance-review, general)',
      'general'
    )
    .option(
      '--style <style>',
      'AI narrative style (professional, casual, detailed, concise)',
      'professional'
    )
    .option('-v, --verbose', 'Verbose output')
    .action(async options => {
      try {
        const startDate = new Date(options.from);
        const endDate = new Date(options.to);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          log.error(
            'Invalid date format. Use YYYY-MM-DD format.',
            undefined,
            'cli'
          );
          process.exit(1);
        }

        if (startDate >= endDate) {
          log.error('Start date must be before end date.', undefined, 'cli');
          process.exit(1);
        }

        if (options.verbose) {
          log.info(
            `📊 Generating summary for ${options.from} to ${options.to}...`,
            'cli'
          );
        }

        // Handle author filtering
        let author = options.author;
        if (options.me) {
          const currentUser = GitUtils.getCurrentUser();
          if (!currentUser) {
            log.error(
              'Could not determine current git user. Please set git config user.name or user.email',
              undefined,
              'cli'
            );
            process.exit(1);
          }
          author = currentUser;
          if (options.verbose) {
            log.info(`🔍 Filtering commits by current user: ${author}`, 'cli');
          }
        }

        const timePeriod = DateUtils.getPeriod('1week', startDate, endDate);
        const summary = await generateSummaryWithOptionalAI(
          dataAggregator,
          timePeriod,
          options.repos,
          author,
          options.aiSummary,
          options.context,
          options.style,
          options.verbose
        );

        formatSummary(summary, options.format as OutputFormat, options.verbose);
      } catch (error) {
        log.error('Error generating summary', error as Error, 'cli');
        process.exit(1);
      }
    });

  // Repository detail command
  program
    .command('repo-detail')
    .description('Analyze a specific repository in detail')
    .requiredOption('-r, --repo <repo>', 'Repository name or path to analyze')
    .option(
      '--period <period>',
      'Time period (1week, 1month, 3months, 6months, 1year, ytd)',
      '1month'
    )
    .option('--from <date>', 'Start date (YYYY-MM-DD) for custom period')
    .option('--to <date>', 'End date (YYYY-MM-DD) for custom period')
    .option('-a, --author <author>', 'Filter commits by author name or email')
    .option('--me', 'Filter commits by current git user')
    .option(
      '-f, --format <format>',
      'Output format (text, json, markdown)',
      'text'
    )
    .option('--ai-summary', 'Generate AI-powered summary')
    .option(
      '--context <context>',
      'AI summary context (standup, retrospective, performance-review, general)',
      'general'
    )
    .option(
      '--style <style>',
      'AI narrative style (professional, casual, detailed, concise)',
      'professional'
    )
    .option('-v, --verbose', 'Verbose output')
    .action(async options => {
      try {
        if (options.verbose) {
          log.info(`🔍 Analyzing repository: ${options.repo}...`, 'cli');
        }

        // Handle author filtering
        let author = options.author;
        if (options.me) {
          const currentUser = GitUtils.getCurrentUser();
          if (!currentUser) {
            log.error(
              'Could not determine current git user. Please set git config user.name or user.email',
              undefined,
              'cli'
            );
            process.exit(1);
          }
          author = currentUser;
          if (options.verbose) {
            log.info(`🔍 Filtering commits by current user: ${author}`, 'cli');
          }
        }

        // Determine time period
        let timePeriod;
        if (options.from && options.to) {
          const startDate = new Date(options.from);
          const endDate = new Date(options.to);

          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            log.error(
              'Invalid date format. Use YYYY-MM-DD format.',
              undefined,
              'cli'
            );
            process.exit(1);
          }

          if (startDate >= endDate) {
            log.error('Start date must be before end date.', undefined, 'cli');
            process.exit(1);
          }

          timePeriod = DateUtils.getPeriod('1week', startDate, endDate);
        } else {
          timePeriod = DateUtils.getPeriod(options.period as PeriodType);
        }

        // Generate summary for the specific repository
        const summary = await generateSummaryWithOptionalAI(
          dataAggregator,
          timePeriod,
          [options.repo],
          author,
          options.aiSummary,
          options.context,
          options.style,
          options.verbose
        );

        // Format and display the detailed repository analysis
        await formatRepositoryDetail(
          summary,
          options.format as OutputFormat,
          options.verbose
        );
      } catch (error) {
        log.error('Error analyzing repository', error as Error, 'cli');
        process.exit(1);
      }
    });

  // AI status command
  program
    .command('ai-status')
    .description('Check AI service availability and configuration')
    .option('-v, --verbose', 'Show detailed configuration info')
    .action(async options => {
      try {
        const isAvailable = dataAggregator.isAIAvailable();

        if (isAvailable) {
          log.info('✅ AI service is available and configured', 'cli');

          if (options.verbose) {
            log.info('🤖 Available AI features:', 'cli');
            log.info('  • --ai-summary: Generate intelligent summaries', 'cli');
            log.info(
              '  • --context: standup, retrospective, performance-review, general',
              'cli'
            );
            log.info(
              '  • --style: professional, casual, detailed, concise',
              'cli'
            );
            log.info('', 'cli');
            log.info('💡 Example usage:', 'cli');
            log.info(
              '  git-summary week --ai-summary --context standup --style concise',
              'cli'
            );
            log.info(
              '  git-summary month --ai-summary --context performance-review --style detailed',
              'cli'
            );
          }
        } else {
          log.warn('❌ AI service is not available', 'cli');
          log.info('', 'cli');
          log.info('🔧 To enable AI features:', 'cli');
          log.info('  1. Create a .env file in your project root', 'cli');
          log.info(
            '  2. Add your OpenAI API key: OPENAI_API_KEY=your_key_here',
            'cli'
          );
          log.info(
            '  3. Optionally configure: OPENAI_MODEL=gpt-4 (default: gpt-3.5-turbo)',
            'cli'
          );
          log.info('', 'cli');
          log.info(
            '📖 Get your API key at: https://platform.openai.com/api-keys',
            'cli'
          );
        }
      } catch (error) {
        log.error('Error checking AI status', error as Error, 'cli');
        process.exit(1);
      }
    });
}
