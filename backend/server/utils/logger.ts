/**
 * Simple logging utility for the backend
 * In production, this could be extended to use a proper logging library
 * like Winston, Pino, or cloud logging services
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerOptions {
  prefix?: string;
}

// Determine environment directly to avoid circular dependency
const IS_DEV = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';

class Logger {
  private prefix: string;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix ? `[${options.prefix}]` : "";
  }

  private formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
    const timestamp = new Date().toISOString();
    return `${timestamp} ${level.toUpperCase()} ${this.prefix} ${message}`;
  }

  /**
   * Debug logs - only shown in development
   */
  debug(message: string, ...args: unknown[]): void {
    if (IS_DEV) {
      console.log(this.formatMessage("debug", message), ...args);
    }
  }

  /**
   * Info logs - shown in all environments
   */
  info(message: string, ...args: unknown[]): void {
    console.log(this.formatMessage("info", message), ...args);
  }

  /**
   * Warning logs - shown in all environments
   */
  warn(message: string, ...args: unknown[]): void {
    console.warn(this.formatMessage("warn", message), ...args);
  }

  /**
   * Error logs - shown in all environments
   */
  error(message: string, ...args: unknown[]): void {
    console.error(this.formatMessage("error", message), ...args);
  }
}

// Create singleton instances for different modules
export const serverLogger = new Logger({ prefix: "Server" });
export const authLogger = new Logger({ prefix: "Auth" });
export const gstLogger = new Logger({ prefix: "GST" });
export const sellerLogger = new Logger({ prefix: "Seller" });
export const userLogger = new Logger({ prefix: "User" });
export const warehouseLogger = new Logger({ prefix: "Warehouse" });
export const seedLogger = new Logger({ prefix: "Seed" });

// Default export for general use
export const logger = new Logger();

export default logger;
