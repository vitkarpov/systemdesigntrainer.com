import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: 'https://3b3ac73e982467055c55d57c1a81d84f@o4510612969881600.ingest.de.sentry.io/4510612975255632',
  sendDefaultPii: true,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 1 : 0,
  enableLogs: process.env.NODE_ENV === 'production',
  beforeSend(event, hint) {
    // Filter out client abort errors that aren't actionable
    const error = hint.originalException;

    if (error && typeof error === 'object') {
      if ('code' in error && error.code === 'ECONNABORTED') {
        return null;
      }

      if ('type' in error && error.type === 'request.aborted') {
        return null;
      }

      if (
        'message' in error &&
        typeof error.message === 'string' &&
        error.message.toLowerCase().includes('request aborted')
      ) {
        return null;
      }
    }

    return event;
  },
});
