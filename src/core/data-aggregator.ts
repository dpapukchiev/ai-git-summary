import { DatabaseManager } from '../storage/database';
import {
  AISummaryOptions,
  AISummaryResult,
  Commit,
  NarrativeStyle,
  Repository,
  SummaryContext,
  TimePeriod,
  WorkSummary,
} from '../types';
import { log } from '../utils/logger';
import { AISummaryService } from './ai-summary-service';
import { RepositoryFilter } from './repository-filter';
import { StatsCalculator } from './stats-calculator';

/**
 * Aggregates data from multiple repositories and generates comprehensive work summaries
 * Now includes AI-powered narrative generation capabilities
 */
export class DataAggregator {
  private repositoryFilter: RepositoryFilter;
  private statsCalculator: StatsCalculator;
  private aiService: AISummaryService;

  constructor(private db: DatabaseManager) {
    this.repositoryFilter = new RepositoryFilter(db);
    this.statsCalculator = new StatsCalculator(db);
    this.aiService = new AISummaryService();
  }

  async generateWorkSummary(
    period: TimePeriod,
    repositoryPaths?: string[],
    author?: string
  ): Promise<WorkSummary> {
    const repositories = this.getRepositoriesForAnalysis(repositoryPaths);
    const commits = this.getCommitsForPeriod(period, repositories, author);
    const stats = this.statsCalculator.calculateStats(commits, period);

    return {
      period,
      repositories,
      stats,
      commits,
    };
  }

  /**
   * Generate work summary with AI-powered narrative
   */
  async generateWorkSummaryWithAI(
    period: TimePeriod,
    repositoryPaths?: string[],
    author?: string,
    aiOptions?: Partial<AISummaryOptions>
  ): Promise<WorkSummary> {
    // Generate the base work summary
    const workSummary = await this.generateWorkSummary(
      period,
      repositoryPaths,
      author
    );

    // Add AI summary if available and requested
    if (this.aiService.isAvailable()) {
      try {
        const fullAIOptions = this.buildAIOptions(aiOptions);
        const aiResult = await this.aiService.generateSummary(
          workSummary,
          fullAIOptions
        );

        log.info(
          `AI summary generated successfully (${aiResult.tokensUsed} tokens)`,
          'data-aggregator'
        );

        return {
          ...workSummary,
          aiSummary: aiResult.narrative,
        };
      } catch (error) {
        log.warn(
          `Failed to generate AI summary: ${(error as Error).message}`,
          'data-aggregator'
        );
        // Return work summary without AI summary on error
        return workSummary;
      }
    } else {
      log.info(
        'AI summary service not available, returning standard summary',
        'data-aggregator'
      );
      return workSummary;
    }
  }

  /**
   * Generate AI summary for different contexts
   */
  async generateAISummaryForContext(
    period: TimePeriod,
    context: SummaryContext,
    repositoryPaths?: string[],
    author?: string,
    style: NarrativeStyle = 'professional'
  ): Promise<AISummaryResult | null> {
    if (!this.aiService.isAvailable()) {
      log.warn('AI summary service not available', 'data-aggregator');
      return null;
    }

    try {
      const workSummary = await this.generateWorkSummary(
        period,
        repositoryPaths,
        author
      );
      const aiOptions = this.getContextSpecificOptions(context, style);

      return await this.aiService.generateSummary(workSummary, aiOptions);
    } catch (error) {
      log.error(
        'Failed to generate AI summary for context',
        error as Error,
        'data-aggregator'
      );
      return null;
    }
  }

  /**
   * Check if AI summaries are available
   */
  isAIAvailable(): boolean {
    return this.aiService.isAvailable();
  }

  /**
   * Build complete AI options with defaults
   */
  private buildAIOptions(
    options?: Partial<AISummaryOptions>
  ): AISummaryOptions {
    return {
      context: options?.context || 'general',
      style: options?.style || 'professional',
      maxLength: options?.maxLength || 1000,
      includeMetrics: options?.includeMetrics ?? true,
      groupByFeatures: options?.groupByFeatures ?? true,
    };
  }

  /**
   * Get context-specific AI options
   */
  private getContextSpecificOptions(
    context: SummaryContext,
    style: NarrativeStyle
  ): AISummaryOptions {
    const baseOptions = {
      context,
      style,
      includeMetrics: true,
      groupByFeatures: true,
    };

    switch (context) {
      case 'standup':
        return {
          ...baseOptions,
          maxLength: 300,
          groupByFeatures: false, // Focus on chronological order for standups
        };

      case 'retrospective':
        return {
          ...baseOptions,
          maxLength: 800,
          groupByFeatures: true, // Group by features for better analysis
        };

      case 'performance-review':
        return {
          ...baseOptions,
          maxLength: 1500,
          groupByFeatures: true, // Show comprehensive feature work
        };

      case 'general':
      default:
        return {
          ...baseOptions,
          maxLength: 1000,
          groupByFeatures: true,
        };
    }
  }

  private getRepositoriesForAnalysis(repositoryPaths?: string[]): Repository[] {
    if (repositoryPaths && repositoryPaths.length > 0) {
      return this.repositoryFilter.filterByPaths(repositoryPaths);
    }
    return this.repositoryFilter.getAll();
  }

  private getCommitsForPeriod(
    period: TimePeriod,
    repositories: Repository[],
    author?: string
  ): Commit[] {
    if (repositories.length === 0) {
      return [];
    }

    const repositoryIds = repositories.map(r => r.id!).filter(Boolean);
    return this.db.getCommitsByDateRange(
      period.startDate,
      period.endDate,
      repositoryIds,
      author
    );
  }
}
