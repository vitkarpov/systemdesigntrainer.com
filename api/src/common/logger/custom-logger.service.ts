import { ConsoleLogger, Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import * as util from 'util';

/**
 * Custom logger that formats objects inline for better production log readability.
 *
 * Instead of multi-line pretty-printed objects, this logger serializes objects
 * to single-line JSON strings, making logs easier to parse and search in
 * production logging systems.
 *
 * Logs are automatically sent to Sentry via Sentry.logger for structured log
 * monitoring and analysis when enableLogs is enabled in instrument.ts.
 */
@Injectable()
export class CustomLoggerService extends ConsoleLogger {
  /**
   * Format log arguments to inline JSON strings
   */
  private formatLogMessage(message: any, context?: string | object): string {
    let formattedMessage = this.stringifyIfNeeded(message);

    if (context && typeof context === 'object') {
      formattedMessage += ` ${this.stringifyIfNeeded(context)}`;
    }

    return formattedMessage;
  }

  /**
   * Convert value to string, serializing objects as inline JSON
   */
  private stringifyIfNeeded(value: any): string {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'object' && value !== null) {
      // Use JSON.stringify for inline formatting
      try {
        return JSON.stringify(value);
      } catch (err) {
        // Fallback to util.inspect with compact settings if JSON.stringify fails
        return util.inspect(value, {
          depth: 2,
          breakLength: Infinity,
          compact: true,
        });
      }
    }

    return String(value);
  }

  /**
   * Override log method to format inline
   */
  log(message: any, context?: string | object) {
    const messageStr = this.stringifyIfNeeded(message);
    const attributes: Record<string, unknown> =
      typeof context === 'object'
        ? (context as Record<string, unknown>)
        : context
          ? { context }
          : {};

    Sentry.logger.info(messageStr, attributes);

    if (typeof context === 'object') {
      super.log(this.formatLogMessage(message, context));
    } else {
      super.log(this.formatLogMessage(message), context);
    }
  }

  /**
   * Override error method to format inline
   */
  error(message: any, stackOrContext?: string | object, context?: string) {
    const messageStr = this.stringifyIfNeeded(message);
    const attributes: Record<string, unknown> = {};

    if (stackOrContext && typeof stackOrContext === 'object') {
      Object.assign(attributes, stackOrContext as Record<string, unknown>);
    } else if (stackOrContext) {
      attributes.stack = stackOrContext;
    }

    if (context) {
      attributes.context = context;
    }

    Sentry.logger.error(messageStr, attributes);

    if (stackOrContext && typeof stackOrContext === 'object') {
      super.error(this.formatLogMessage(message, stackOrContext));
    } else {
      super.error(this.formatLogMessage(message), stackOrContext, context);
    }
  }

  /**
   * Override warn method to format inline
   */
  warn(message: any, context?: string | object) {
    const messageStr = this.stringifyIfNeeded(message);
    const attributes: Record<string, unknown> =
      typeof context === 'object'
        ? (context as Record<string, unknown>)
        : context
          ? { context }
          : {};

    Sentry.logger.warn(messageStr, attributes);

    if (typeof context === 'object') {
      super.warn(this.formatLogMessage(message, context));
    } else {
      super.warn(this.formatLogMessage(message), context);
    }
  }

  /**
   * Override debug method to format inline
   */
  debug(message: any, context?: string | object) {
    const messageStr = this.stringifyIfNeeded(message);
    const attributes: Record<string, unknown> =
      typeof context === 'object'
        ? (context as Record<string, unknown>)
        : context
          ? { context }
          : {};

    Sentry.logger.debug(messageStr, attributes);

    if (typeof context === 'object') {
      super.debug(this.formatLogMessage(message, context));
    } else {
      super.debug(this.formatLogMessage(message), context);
    }
  }

  /**
   * Override verbose method to format inline
   */
  verbose(message: any, context?: string | object) {
    const messageStr = this.stringifyIfNeeded(message);
    const attributes: Record<string, unknown> =
      typeof context === 'object'
        ? (context as Record<string, unknown>)
        : context
          ? { context }
          : {};

    Sentry.logger.trace(messageStr, attributes);

    if (typeof context === 'object') {
      super.verbose(this.formatLogMessage(message, context));
    } else {
      super.verbose(this.formatLogMessage(message), context);
    }
  }
}
