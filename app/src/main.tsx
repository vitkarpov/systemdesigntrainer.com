import * as Sentry from "@sentry/react";

if (import.meta.env.MODE === 'production') {
  Sentry.init({
    dsn: "https://7ab342feb99b15de49cec223fe44b584@o4510612969881600.ingest.de.sentry.io/4510613028339792",
    sendDefaultPii: true,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    ignoreErrors: [
      'Error invoking post',
      'Method not found',
    ],
  });
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import '@xyflow/react/dist/style.css';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { queryClient } from './lib/react-query';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
);
