import * as Sentry from "@sentry/react";

export const initSentry = () => {
  if (import.meta.env.MODE !== "production") {
    return;
  }
  Sentry.init({
    dsn: "https://7ab342feb99b15de49cec223fe44b584@o4510612969881600.ingest.de.sentry.io/4510613028339792",
    sendDefaultPii: true,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
      Sentry.feedbackIntegration({
        triggerLabel: "",
      }),
    ],
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    ignoreErrors: ["Error invoking post", "Method not found"],
  });
};
