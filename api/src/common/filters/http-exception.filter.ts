import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';

/**
 * Custom exception filter that filters out client-side errors before logging to Sentry.
 *
 * Specifically filters out ECONNABORTED errors which occur when clients disconnect
 * (close browser tab, navigate away, network issues) before the request completes.
 * These are not actionable server errors and should not pollute error tracking.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private readonly sentryFilter: SentryGlobalFilter;

  constructor() {
    this.sentryFilter = new SentryGlobalFilter();
  }

  catch(exception: any, host: ArgumentsHost) {
    // Check if this is a client abort error that should be ignored
    if (this.isClientAbortError(exception)) {
      // Log at debug level for visibility in development, but don't send to Sentry
      this.logger.debug(`Client aborted request: ${exception.code}`);

      // Send a proper HTTP response
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();

      // Only send response if headers haven't been sent yet
      if (!response.headersSent) {
        response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Request aborted by client',
        });
      }

      return;
    }

    // For all other errors, delegate to Sentry's global filter
    this.sentryFilter.catch(exception, host);
  }

  /**
   * Determines if an error is a client abort error that should not be logged
   */
  private isClientAbortError(exception: any): boolean {
    // Check for ECONNABORTED error code (client disconnected)
    if (exception?.code === 'ECONNABORTED') {
      return true;
    }

    // Check for request.aborted type
    if (exception?.type === 'request.aborted') {
      return true;
    }

    // Check error message for "request aborted"
    if (exception?.message?.toLowerCase().includes('request aborted')) {
      return true;
    }

    return false;
  }
}
