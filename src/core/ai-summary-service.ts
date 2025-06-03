import OpenAI from 'openai';
import {
  AISummaryConfig,
  AISummaryOptions,
  AISummaryResult,
  NarrativeStructure,
  NarrativeStyle,
  SummaryContext,
  WorkSummary,
  WorkTheme,
} from '../types';
import { ConfigManager } from '../utils/config';
import { log } from '../utils/logger';

/**
 * AI-powered summary service that generates compelling narratives from git data
 */
export class AISummaryService {
  private openai: OpenAI | null = null;
  private config: AISummaryConfig;

  constructor() {
    this.config = ConfigManager.getAIConfig();

    if (this.config.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: this.config.openaiApiKey,
      });
    }
  }

  /**
   * Check if AI summaries are available
   */
  isAvailable(): boolean {
    return this.openai !== null && Boolean(this.config.openaiApiKey);
  }

  /**
   * Generate an AI-powered narrative summary
   */
  async generateSummary(
    workSummary: WorkSummary,
    options: AISummaryOptions
  ): Promise<AISummaryResult> {
    if (!this.isAvailable()) {
      throw new Error(
        'AI summary service not available. Please configure OPENAI_API_KEY.'
      );
    }

    log.info(
      `Generating ${options.context} summary with ${options.style} style`,
      'ai-service'
    );

    try {
      // Extract work themes and structure data
      const narrativeStructure = this.analyzeWorkThemes(workSummary, options);

      // Generate the narrative using OpenAI
      const prompt = this.buildPrompt(workSummary, narrativeStructure, options);

      const response = await this.openai!.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(options.context, options.style),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });

      const narrative = response.choices[0]?.message?.content || '';
      const tokensUsed = response.usage?.total_tokens || 0;

      log.info(`Generated summary using ${tokensUsed} tokens`, 'ai-service');

      return {
        narrative,
        tokensUsed,
        model: this.config.model,
        generatedAt: new Date(),
        context: options.context,
        style: options.style,
      };
    } catch (error) {
      log.error('Failed to generate AI summary', error as Error, 'ai-service');
      throw new Error(
        `AI summary generation failed: ${(error as Error).message}`
      );
    }
  }

  /**
   * Analyze work data to extract themes and patterns
   */
  private analyzeWorkThemes(
    workSummary: WorkSummary,
    options: AISummaryOptions
  ): NarrativeStructure {
    const themes: WorkTheme[] = [];

    if (options.groupByFeatures) {
      // Group commits by feature patterns
      const featureGroups = this.groupCommitsByFeatures(workSummary.commits);

      for (const [feature, commits] of featureGroups) {
        themes.push({
          title: feature,
          description: `Work on ${feature}`,
          commits: commits.map(c => c.message),
          impact: this.calculateFeatureImpact(commits),
          timeSpent: this.calculateTimeSpent(commits),
        });
      }
    } else {
      // Group by time periods or repositories
      const repoGroups = this.groupCommitsByRepository(
        workSummary.commits,
        workSummary.repositories
      );

      for (const [repoName, commits] of repoGroups) {
        themes.push({
          title: repoName,
          description: `Development work on ${repoName}`,
          commits: commits.map(c => c.message),
          impact: this.calculateFeatureImpact(commits),
          timeSpent: this.calculateTimeSpent(commits),
        });
      }
    }

    return {
      overview: this.generateOverview(workSummary),
      themes,
      achievements: this.extractAchievements(workSummary),
      impact: this.calculateOverallImpact(workSummary),
    };
  }

  /**
   * Group commits by feature patterns (branch names, issue numbers, keywords)
   */
  private groupCommitsByFeatures(commits: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();

    for (const commit of commits) {
      const feature = this.extractFeatureName(commit.message);

      if (!groups.has(feature)) {
        groups.set(feature, []);
      }
      groups.get(feature)!.push(commit);
    }

    return groups;
  }

  /**
   * Extract feature name from commit message
   */
  private extractFeatureName(message: string): string {
    // Look for patterns like "feat:", "fix:", "PROJ-123", etc.
    const patterns = [
      /^(feat|feature|fix|refactor|docs|test|chore|style)(?:\([^)]+\))?:\s*(.+)/i,
      /^([A-Z]+-\d+)[\s:]/,
      /^(\w+(?:-\w+)*):/, // General prefix pattern
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1] || 'General Development';
      }
    }

    // Fallback to extracting meaningful words
    const words = message.split(' ').slice(0, 3);
    return words.join(' ') || 'Development Work';
  }

  /**
   * Group commits by repository
   */
  private groupCommitsByRepository(
    commits: any[],
    repositories: any[]
  ): Map<string, any[]> {
    const groups = new Map<string, any[]>();
    const repoMap = new Map(repositories.map(r => [r.id, r.name]));

    for (const commit of commits) {
      const repoName = repoMap.get(commit.repoId) || 'Unknown Repository';

      if (!groups.has(repoName)) {
        groups.set(repoName, []);
      }
      groups.get(repoName)!.push(commit);
    }

    return groups;
  }

  /**
   * Calculate impact metrics for a feature/theme
   */
  private calculateFeatureImpact(commits: any[]): string {
    const totalChanges = commits.reduce(
      (sum, c) => sum + c.insertions + c.deletions,
      0
    );
    const fileCount = commits.reduce((sum, c) => sum + c.filesChanged, 0);

    return `${commits.length} commits, ${totalChanges} lines changed, ${fileCount} files affected`;
  }

  /**
   * Calculate time spent estimation
   */
  private calculateTimeSpent(commits: any[]): string {
    const days = new Set(commits.map(c => c.date.toDateString())).size;
    return `${days} day${days !== 1 ? 's' : ''} of work`;
  }

  /**
   * Generate overview text
   */
  private generateOverview(workSummary: WorkSummary): string {
    const { stats, period } = workSummary;
    return `During ${period.label}, completed ${stats.totalCommits} commits across ${workSummary.repositories.length} repositories, with ${stats.totalInsertions + stats.totalDeletions} lines of code changes.`;
  }

  /**
   * Extract achievements from work summary
   */
  private extractAchievements(workSummary: WorkSummary): string[] {
    const achievements: string[] = [];
    const { stats } = workSummary;

    if (stats.totalCommits > 50) {
      achievements.push('High development velocity');
    }

    if (stats.topLanguages.length > 3) {
      achievements.push('Multi-language development');
    }

    if (stats.activeDays > 10) {
      achievements.push('Consistent development activity');
    }

    return achievements;
  }

  /**
   * Calculate overall impact
   */
  private calculateOverallImpact(workSummary: WorkSummary): string {
    const { stats } = workSummary;
    return `Total impact: ${stats.totalCommits} commits, ${stats.totalInsertions + stats.totalDeletions} lines changed, ${stats.totalFilesChanged} files modified`;
  }

  /**
   * Build the main prompt for AI generation
   */
  private buildPrompt(
    workSummary: WorkSummary,
    structure: NarrativeStructure,
    options: AISummaryOptions
  ): string {
    const contextInstructions = this.getContextInstructions(options.context);
    const lengthGuidance = this.getLengthGuidance(options.maxLength);

    return `
${contextInstructions}

## Work Period
${structure.overview}

## Key Work Themes
${structure.themes
  .map(
    theme => `
**${theme.title}**
- ${theme.description}
- ${theme.impact}
- ${theme.timeSpent}
- Key commits: ${theme.commits.slice(0, 3).join('; ')}
`
  )
  .join('\n')}

## Overall Impact
${structure.impact}

## Achievements
${structure.achievements.join(', ')}

## Technical Details
- Languages: ${workSummary.stats.topLanguages.map(l => l.language).join(', ')}
- Most active files: ${workSummary.stats.topFiles
      .slice(0, 3)
      .map(f => f.file)
      .join(', ')}

${lengthGuidance}

Please create a compelling narrative that showcases value and impact.
    `.trim();
  }

  /**
   * Get system prompt based on context and style
   */
  private getSystemPrompt(
    context: SummaryContext,
    style: NarrativeStyle
  ): string {
    const basePrompt =
      'You are an expert technical writer who creates compelling narratives from software development data.';

    const contextPrompts = {
      standup:
        'Focus on recent accomplishments, current progress, and next steps. Keep it concise and team-focused.',
      retrospective:
        'Analyze patterns, lessons learned, and team improvements. Include both successes and challenges.',
      'performance-review':
        'Emphasize business impact, technical growth, and professional achievements. Highlight leadership and innovation.',
      general:
        'Create a balanced overview of technical work and contributions.',
    };

    const stylePrompts = {
      professional:
        'Use formal, business-appropriate language with clear metrics and outcomes.',
      casual: 'Use conversational tone while maintaining professional content.',
      detailed:
        'Provide comprehensive analysis with specific examples and technical details.',
      concise: 'Keep explanations brief and focus on key highlights.',
    };

    return `${basePrompt} ${contextPrompts[context]} ${stylePrompts[style]}`;
  }

  /**
   * Get context-specific instructions
   */
  private getContextInstructions(context: SummaryContext): string {
    const instructions = {
      standup:
        "Create a standup-ready summary focusing on what was accomplished, what's in progress, and any blockers or next steps.",
      retrospective:
        'Create a retrospective summary analyzing the work period, including successes, challenges, patterns, and improvement opportunities.',
      'performance-review':
        'Create a performance review summary emphasizing professional growth, business impact, technical contributions, and career development.',
      general:
        'Create a comprehensive work summary highlighting key accomplishments and technical contributions.',
    };

    return instructions[context];
  }

  /**
   * Get length guidance based on max length
   */
  private getLengthGuidance(maxLength: number): string {
    if (maxLength <= 200) {
      return 'Keep the summary very brief - 2-3 sentences maximum.';
    } else if (maxLength <= 500) {
      return 'Keep the summary concise - 1-2 short paragraphs.';
    } else if (maxLength <= 1000) {
      return 'Provide a detailed summary - 3-4 paragraphs with specific examples.';
    } else {
      return 'Create a comprehensive narrative with detailed explanations and examples.';
    }
  }
}
