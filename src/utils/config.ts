import { config } from 'dotenv';
import path from 'path';
import { AISummaryConfig } from '../types';
import { log } from './logger';

// Load environment variables from .env file
config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Configuration manager for AI-related settings
 */
export class ConfigManager {
  private static readonly DEFAULT_MODEL = 'gpt-4o-mini';
  private static readonly DEFAULT_MAX_TOKENS = 2000;
  private static readonly DEFAULT_TEMPERATURE = 0.7;

  /**
   * Get AI configuration from environment variables with fallbacks
   */
  static getAIConfig(): AISummaryConfig {
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      log.warn(
        'OPENAI_API_KEY not found in environment variables. AI summaries will be disabled.',
        'config'
      );
    }

    return {
      openaiApiKey: openaiApiKey || '',
      model: process.env.OPENAI_MODEL || this.DEFAULT_MODEL,
      maxTokens:
        parseInt(process.env.OPENAI_MAX_TOKENS || '') ||
        this.DEFAULT_MAX_TOKENS,
      temperature:
        parseFloat(process.env.OPENAI_TEMPERATURE || '') ||
        this.DEFAULT_TEMPERATURE,
    };
  }

  /**
   * Check if AI features are available (API key is configured)
   */
  static isAIEnabled(): boolean {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  /**
   * Get database path configuration
   */
  static getDatabasePath(): string {
    return (
      process.env.DATABASE_PATH ||
      path.join(process.cwd(), 'data', 'git-summary.db')
    );
  }

  /**
   * Get log level configuration
   */
  static getLogLevel(): string {
    return process.env.LOG_LEVEL || 'info';
  }

  /**
   * Validate configuration and log warnings for missing required settings
   */
  static validateConfig(): void {
    const config = this.getAIConfig();

    if (!config.openaiApiKey) {
      log.warn(
        'AI summaries require an OpenAI API key. Set OPENAI_API_KEY environment variable or create a .env file.',
        'config'
      );
      log.info('Example .env file:', 'config');
      log.info('OPENAI_API_KEY=your-api-key-here', 'config');
      log.info('OPENAI_MODEL=gpt-4o-mini (optional)', 'config');
      log.info('OPENAI_MAX_TOKENS=2000 (optional)', 'config');
      log.info('OPENAI_TEMPERATURE=0.7 (optional)', 'config');
    } else {
      log.info(`AI features enabled with model: ${config.model}`, 'config');
    }
  }
}
