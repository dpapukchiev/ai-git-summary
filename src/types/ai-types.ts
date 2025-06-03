/**
 * AI Summary related types and interfaces
 */

export interface AISummaryConfig {
  readonly openaiApiKey: string;
  readonly model: string;
  readonly maxTokens: number;
  readonly temperature: number;
}

export type SummaryContext =
  | 'standup'
  | 'retrospective'
  | 'performance-review'
  | 'general';

export type NarrativeStyle = 'professional' | 'casual' | 'detailed' | 'concise';

export interface AISummaryOptions {
  readonly context: SummaryContext;
  readonly style: NarrativeStyle;
  readonly maxLength: number;
  readonly includeMetrics: boolean;
  readonly groupByFeatures: boolean;
}

export interface AISummaryResult {
  readonly narrative: string;
  readonly tokensUsed: number;
  readonly model: string;
  readonly generatedAt: Date;
  readonly context: SummaryContext;
  readonly style: NarrativeStyle;
}

export interface WorkTheme {
  readonly title: string;
  readonly description: string;
  readonly commits: string[];
  readonly impact: string;
  readonly timeSpent: string;
}

export interface NarrativeStructure {
  readonly overview: string;
  readonly themes: WorkTheme[];
  readonly achievements: string[];
  readonly impact: string;
  readonly nextSteps?: string;
}
