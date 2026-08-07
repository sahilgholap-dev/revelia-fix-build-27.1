/**
 * Simple logger utility with timestamps
 * Respects environment for debug/info logging
 */
class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = this.getTimestamp();
    const argsStr = args.length > 0 ? ' ' + JSON.stringify(args, null, 2) : '';
    return `[${timestamp}] [${level}] ${message}${argsStr}`;
  }

  /**
   * Log info message
   * Only logs in development to reduce production noise
   */
  info(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.log(this.formatMessage('INFO', message, ...args));
    }
  }

  /**
   * Log error message
   * Always logs in all environments
   */
  error(message: string, ...args: any[]): void {
    console.error(this.formatMessage('ERROR', message, ...args));
  }

  /**
   * Log warning message
   * Only logs in development to reduce production noise
   */
  warn(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.warn(this.formatMessage('WARN', message, ...args));
    }
  }

  /**
   * Log debug message
   * Only logs in development
   */
  debug(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('DEBUG', message, ...args));
    }
  }
}

export const logger = new Logger();
