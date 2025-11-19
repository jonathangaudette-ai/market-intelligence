/**
 * Logger - Gestion des logs (console + fichiers)
 */

import fs from 'fs';
import path from 'path';
import type { LogEntry } from '../types';
import { PATHS, LOGGING_CONFIG } from '../config';

export class Logger {
  private competitorId: string;
  private logFile: string;
  private errorLogFile: string;
  private logEntries: LogEntry[] = [];

  constructor(competitorId: string) {
    this.competitorId = competitorId;

    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    this.logFile = path.join(PATHS.logsDir, `${competitorId}-${timestamp}.log`);
    this.errorLogFile = path.join(
      PATHS.logsDir,
      `${competitorId}-${timestamp}-errors.log`
    );
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  /**
   * Log an info message
   */
  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, data?: any): void {
    this.log('error', message, data, error);
  }

  /**
   * Internal log method
   */
  private log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: any,
    error?: Error
  ): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      competitorId: this.competitorId,
      message,
      data,
      error,
    };

    this.logEntries.push(entry);

    // Console logging
    if (LOGGING_CONFIG.console.enabled) {
      if (this.shouldLogToConsole(level)) {
        const formattedMessage = this.formatMessage(entry);
        this.outputToConsole(level, formattedMessage);
      }
    }

    // File logging
    if (LOGGING_CONFIG.file.enabled) {
      if (this.shouldLogToFile(level)) {
        this.writeToFile(this.logFile, entry);
      }
    }

    // Error file logging
    if (LOGGING_CONFIG.errorFile.enabled && level === 'error') {
      this.writeToFile(this.errorLogFile, entry);
    }
  }

  /**
   * Check if should log to console based on level
   */
  private shouldLogToConsole(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = LOGGING_CONFIG.console.level;
    return levels.indexOf(level) >= levels.indexOf(configLevel);
  }

  /**
   * Check if should log to file based on level
   */
  private shouldLogToFile(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = LOGGING_CONFIG.file.level;
    return levels.indexOf(level) >= levels.indexOf(configLevel);
  }

  /**
   * Format log message
   */
  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const competitor = `[${entry.competitorId}]`;
    const message = entry.message;

    let formatted = `${timestamp} ${level} ${competitor} ${message}`;

    if (entry.data) {
      formatted += `\nData: ${JSON.stringify(entry.data, null, 2)}`;
    }

    if (entry.error) {
      formatted += `\nError: ${entry.error.message}`;
      if (entry.error.stack) {
        formatted += `\nStack: ${entry.error.stack}`;
      }
    }

    return formatted;
  }

  /**
   * Output to console with appropriate color
   */
  private outputToConsole(level: string, message: string): void {
    switch (level) {
      case 'debug':
        console.log(`\x1b[90m${message}\x1b[0m`); // Gray
        break;
      case 'info':
        console.log(message);
        break;
      case 'warn':
        console.warn(`\x1b[33m${message}\x1b[0m`); // Yellow
        break;
      case 'error':
        console.error(`\x1b[31m${message}\x1b[0m`); // Red
        break;
    }
  }

  /**
   * Write log entry to file
   */
  private writeToFile(filePath: string, entry: LogEntry): void {
    try {
      const message = this.formatMessage(entry) + '\n';
      fs.appendFileSync(filePath, message, 'utf-8');
    } catch (error) {
      console.error(`Failed to write to log file: ${error}`);
    }
  }

  /**
   * Get all log entries
   */
  getEntries(): LogEntry[] {
    return this.logEntries;
  }

  /**
   * Get log entries by level
   */
  getEntriesByLevel(level: 'debug' | 'info' | 'warn' | 'error'): LogEntry[] {
    return this.logEntries.filter((entry) => entry.level === level);
  }

  /**
   * Clear log entries from memory
   */
  clear(): void {
    this.logEntries = [];
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    debug: number;
    info: number;
    warn: number;
    error: number;
  } {
    return {
      total: this.logEntries.length,
      debug: this.getEntriesByLevel('debug').length,
      info: this.getEntriesByLevel('info').length,
      warn: this.getEntriesByLevel('warn').length,
      error: this.getEntriesByLevel('error').length,
    };
  }
}
