import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
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
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Check if this is a client abort error that should be ignored
    if (this.isClientAbortError(exception)) {
      // Log at debug level for visibility in development, but don't send to Sentry
      this.logger.debug(`Client aborted request: ${exception.code}`);

      // Only send response if headers haven't been sent yet
      if (!response.headersSent) {
        response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Request aborted by client',
        });
      }

      return;
    }

    // Handle HttpExceptions (NestJS built-in exceptions)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Send the proper HTTP response
      if (!response.headersSent) {
        response.status(status).json(exceptionResponse);
      }

      // Also log to Sentry for server errors (5xx)
      if (status >= 500) {
        this.sentryFilter.catch(exception, host);
      }

      return;
    }

    // For all other errors, log to Sentry and send 500 response
    this.sentryFilter.catch(exception, host);

    // Send generic 500 error if response not yet sent
    if (!response.headersSent) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
    }
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
