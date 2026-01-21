import { ConsoleLogger, Injectable } from '@nestjs/common';
import * as util from 'util';
import * as Sentry from '@sentry/nestjs';

/**
 * Custom logger that formats objects inline for better production log readability.
 *
 * Instead of multi-line pretty-printed objects, this logger serializes objects
 * to single-line JSON strings, making logs easier to parse and search in
 * production logging systems.
 *
 * Also integrates with Sentry by sending all logs as messages to Sentry.
 */
@Injectable()
export class CustomLoggerService extends ConsoleLogger {
  /**
   * Format log arguments to inline JSON strings
   */
  private formatLogMessage(
    message: any,
    contextOrObject?: string | object,
  ): string {
    let formattedMessage = this.stringifyIfNeeded(message);

    // If context is provided and it's an object, serialize it inline
    if (contextOrObject && typeof contextOrObject === 'object') {
      formattedMessage += ` ${JSON.stringify(contextOrObject)}`;
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
  log(message: any, context?: string) {
    const formattedMessage = this.stringifyIfNeeded(message);
    const data: Record<string, any> = {};

    if (typeof context === 'object') {
      // Context is an object, format it inline
      Object.assign(data, context);
      super.log(this.formatLogMessage(message, context));
    } else {
      // Context is a string or undefined
      if (context) {
        data.context = context;
      }
      super.log(this.formatLogMessage(message), context);
    }

    // Send to Sentry as a log message
    Sentry.captureMessage(formattedMessage, {
      level: 'info',
      extra: data,
    });
  }

  /**
   * Override error method to format inline
   */
  error(message: any, stackOrContext?: string, context?: string) {
    const formattedMessage = this.stringifyIfNeeded(message);
    const data: Record<string, any> = {};

    if (stackOrContext && typeof stackOrContext === 'object') {
      // stackOrContext is actually a context object
      Object.assign(data, stackOrContext);
      super.error(this.formatLogMessage(message, stackOrContext));
    } else {
      // Standard error with stack trace
      if (stackOrContext) {
        data.stack = stackOrContext;
      }
      if (context) {
        data.context = context;
      }
      super.error(this.formatLogMessage(message), stackOrContext, context);
    }

    // Capture errors in Sentry
    if (message instanceof Error) {
      Sentry.captureException(message, { extra: data });
    } else {
      Sentry.captureMessage(formattedMessage, {
        level: 'error',
        extra: data,
      });
    }
  }

  /**
   * Override warn method to format inline
   */
  warn(message: any, context?: string) {
    const formattedMessage = this.stringifyIfNeeded(message);
    const data: Record<string, any> = {};

    if (typeof context === 'object') {
      // Context is an object, format it inline
      Object.assign(data, context);
      super.warn(this.formatLogMessage(message, context));
    } else {
      // Context is a string or undefined
      if (context) {
        data.context = context;
      }
      super.warn(this.formatLogMessage(message), context);
    }

    // Send to Sentry as a log message
    Sentry.captureMessage(formattedMessage, {
      level: 'warning',
      extra: data,
    });
  }

  /**
   * Override debug method to format inline
   */
  debug(message: any, context?: string) {
    const formattedMessage = this.stringifyIfNeeded(message);
    const data: Record<string, any> = {};

    if (typeof context === 'object') {
      // Context is an object, format it inline
      Object.assign(data, context);
      super.debug(this.formatLogMessage(message, context));
    } else {
      // Context is a string or undefined
      if (context) {
        data.context = context;
      }
      super.debug(this.formatLogMessage(message), context);
    }

    // Send to Sentry as a log message
    Sentry.captureMessage(formattedMessage, {
      level: 'debug',
      extra: data,
    });
  }

  /**
   * Override verbose method to format inline
   */
  verbose(message: any, context?: string) {
    const formattedMessage = this.stringifyIfNeeded(message);
    const data: Record<string, any> = {};

    if (typeof context === 'object') {
      // Context is an object, format it inline
      Object.assign(data, context);
      super.verbose(this.formatLogMessage(message, context));
    } else {
      // Context is a string or undefined
      if (context) {
        data.context = context;
      }
      super.verbose(this.formatLogMessage(message), context);
    }

    // Send to Sentry as a log message
    Sentry.captureMessage(formattedMessage, {
      level: 'log',
      extra: data,
    });
  }
}
