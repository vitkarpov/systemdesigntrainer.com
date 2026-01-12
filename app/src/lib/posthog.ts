import posthog from "posthog-js";

export const initPostHog = () => {
  if (import.meta.env.MODE !== 'production') {
    return;
  }

  const apiKey = import.meta.env.VITE_POSTHOG_API_KEY;
  const host = import.meta.env.VITE_POSTHOG_HOST;

  if (!apiKey) {
    console.warn("PostHog API key not found. Analytics disabled.");
    return;
  }

  posthog.init(apiKey, {
    api_host: host,
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
  });
};

export { posthog };
