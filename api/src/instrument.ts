import * as Sentry from '@sentry/nestjs';

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: 'https://3b3ac73e982467055c55d57c1a81d84f@o4510612969881600.ingest.de.sentry.io/4510612975255632',
    sendDefaultPii: true,
    tracesSampleRate: 0.1,
    enableLogs: true,
  });
}
