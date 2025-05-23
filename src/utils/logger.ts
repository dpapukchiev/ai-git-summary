import winston from "winston";
import chalk from "chalk";

// Custom format for console output with colors and emojis
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(
    ({ level, message, timestamp, stack, context }): string => {
      const levelColors = {
        error: chalk.red,
        warn: chalk.yellow,
        info: chalk.blue,
        debug: chalk.magenta,
        verbose: chalk.gray,
      };

      const colorFn =
        levelColors[level as keyof typeof levelColors] || chalk.white;

      let logMessage = `${chalk.gray(timestamp)} ${colorFn(level.toUpperCase())}`;

      if (context) {
        logMessage += ` ${chalk.cyan(`[${context}]`)}`;
      }

      logMessage += `: ${message}`;

      if (stack) {
        logMessage += `\n${stack}`;
      }

      return logMessage;
    }
  )
);

// Create winston logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "ai-git-summary" },
  transports: [
    // Console transport with custom formatting
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
    }),

    // File transport for errors
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: "logs/combined.log",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
  ],
});

// Create a child logger with context
export const createLogger = (context: string) => {
  return logger.child({ context });
};

// Convenience methods for different log levels
export const log = {
  error: (message: string, error?: Error, context?: string) => {
    logger.error(message, { error: error?.stack || error, context });
  },
  warn: (message: string, context?: string) => {
    logger.warn(message, { context });
  },
  info: (message: string, context?: string) => {
    logger.info(message, { context });
  },
  debug: (message: string, context?: string) => {
    logger.debug(message, { context });
  },
  verbose: (message: string, context?: string) => {
    logger.verbose(message, { context });
  },
  // Special method for user-facing output (progress, status updates)
  output: (message: string, context?: string) => {
    // Use info level for user-facing output, winston will handle console output
    logger.info(message, { context });
  },
};

export default logger;
