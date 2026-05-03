import posthog from "posthog-js";

const isLocalStorageAvailable = () => {
  try {
    localStorage.setItem("__test__", "1");
    localStorage.removeItem("__test__");
    return true;
  } catch {
    return false;
  }
};

export const initPostHog = () => {
  if (import.meta.env.MODE !== "production") {
    return;
  }

  const apiKey = import.meta.env.VITE_POSTHOG_API_KEY;
  const host = import.meta.env.VITE_POSTHOG_HOST;

  if (!apiKey) {
    console.warn("PostHog API key not found. Analytics disabled.");
    return;
  }

  try {
    posthog.init(apiKey, {
      api_host: host,
      person_profiles: "identified_only",
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      persistence: isLocalStorageAvailable() ? "localStorage+cookie" : "memory",
    });
  } catch {
    // Storage blocked by browser privacy settings — analytics disabled
  }
};

export { posthog };
