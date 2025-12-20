/**
 * API Service - Type-safe API client using OpenAPI-generated types
 *
 * All types are auto-generated from the backend OpenAPI spec.
 * Run `npm run types:generate` to regenerate types after backend changes.
 */

import client from "../api/client";
import type { components } from "../api/types.gen";

// ============================================================================
// Type Aliases - Convenient names for commonly used generated types
// ============================================================================

// Case types
export type Case = components["schemas"]["InterviewCaseDto"];

// Session types
export type Session = components["schemas"]["SessionResponseDto"];
export type SessionWithExtras = components["schemas"]["GetSessionResponseDto"]["data"];

// Message types
export type Message = components["schemas"]["MessageResponseDto"];

// Signal and red flag types
export type Signal = components["schemas"]["SignalResponseDto"];
export type RedFlag = components["schemas"]["RedFlagResponseDto"];

// Feedback types
export type FeedbackReport = components["schemas"]["FeedbackReportDto"];
export type FeedbackItem = components["schemas"]["FeedbackItemDto"];
export type FeedbackNextStep = components["schemas"]["FeedbackNextStepDto"];

// Phase types
export type PhaseWithMetadata = components["schemas"]["PhaseWithMetadataDto"];
export type PhasesData = components["schemas"]["GetPhasesResponseDto"]["data"];

// User type
export type User = components["schemas"]["UserResponseDto"];

// AI response type
export type AiResponseData = components["schemas"]["AiResponseDto"]["data"];

// ============================================================================
// Case Endpoints
// ============================================================================

export const getCases = async (): Promise<Case[]> => {
  const { data, error } = await client.GET("/api/cases");

  if (error || !data) {
    throw new Error("Failed to fetch cases");
  }

  return data;
};

// ============================================================================
// Session Endpoints
// ============================================================================

export const createSession = async (
  caseId: number,
  options?: {
    companyStyle?: "faang" | "startup" | "generic";
    level?: "mid" | "senior" | "staff";
  },
): Promise<Session> => {
  const { data, error } = await client.POST("/api/sessions", {
    body: {
      caseId,
      companyStyle: options?.companyStyle || "generic",
      level: options?.level || "mid",
    },
  });

  if (error || !data) {
    throw new Error("Failed to create session");
  }

  return data.data.session;
};

export const startSession = async (
  sessionId: number,
): Promise<Session> => {
  const { data, error } = await client.POST("/api/sessions/{id}/start", {
    params: {
      path: { id: sessionId },
    },
  });

  if (error || !data) {
    throw new Error("Failed to start session");
  }

  return data.data.session;
};

export const getSession = async (
  sessionId: number,
): Promise<SessionWithExtras> => {
  const { data, error } = await client.GET("/api/sessions/{id}", {
    params: {
      path: { id: sessionId },
    },
  });

  if (error || !data) {
    throw new Error("Failed to fetch session");
  }

  return data.data;
};

export const getPhases = async (
  sessionId: number,
): Promise<PhasesData> => {
  const { data, error } = await client.GET("/api/sessions/{id}/phases", {
    params: {
      path: { id: sessionId },
    },
  });

  if (error || !data) {
    throw new Error("Failed to fetch phases");
  }

  return data.data;
};

export const advancePhase = async (
  sessionId: number,
): Promise<components["schemas"]["AdvancePhaseResponseDto"]["data"]> => {
  const { data, error } = await client.PATCH("/api/sessions/{id}/phase", {
    params: {
      path: { id: sessionId },
    },
  });

  if (error || !data) {
    throw new Error("Failed to advance phase");
  }

  return data.data;
};

// ============================================================================
// Transcript Endpoints
// ============================================================================

export const getTranscript = async (
  sessionId: number,
): Promise<Message[]> => {
  const { data, error } = await client.GET("/api/sessions/{id}/transcript", {
    params: {
      path: { id: sessionId },
    },
  });

  if (error || !data) {
    throw new Error("Failed to fetch transcript");
  }

  return data.data.messages;
};

export const addMessage = async (
  sessionId: number,
  role: "interviewer" | "candidate",
  text: string,
): Promise<Message> => {
  const { data, error } = await client.POST("/api/sessions/{id}/messages", {
    params: {
      path: { id: sessionId },
    },
    body: {
      role,
      text,
    },
  });

  if (error || !data) {
    throw new Error("Failed to add message");
  }

  return data.data.message;
};

// ============================================================================
// AI Endpoint
// ============================================================================

export const getAiResponse = async (
  sessionId: number,
  text: string,
): Promise<AiResponseData> => {
  const { data, error } = await client.POST("/api/sessions/{id}/ai-response", {
    params: {
      path: { id: sessionId },
    },
    body: {
      text,
    },
  });

  if (error || !data) {
    throw new Error("Failed to get AI response");
  }

  return data.data;
};

// ============================================================================
// Signal and Red Flag Endpoints
// ============================================================================

export const getSignals = async (
  sessionId: number,
): Promise<Signal[]> => {
  const { data, error } = await client.GET("/api/sessions/{id}/signals", {
    params: {
      path: { id: sessionId },
    },
  });

  if (error || !data) {
    throw new Error("Failed to fetch signals");
  }

  return data.data.signals;
};

export const getRedFlags = async (
  sessionId: number,
): Promise<RedFlag[]> => {
  const { data, error } = await client.GET("/api/sessions/{id}/red-flags", {
    params: {
      path: { id: sessionId },
    },
  });

  if (error || !data) {
    throw new Error("Failed to fetch red flags");
  }

  return data.data.redFlags;
};

// ============================================================================
// Feedback Endpoints
// ============================================================================

export const generateFeedback = async (
  sessionId: number,
): Promise<FeedbackReport> => {
  const { data, error } = await client.POST("/api/sessions/{id}/feedback", {
    params: {
      path: { id: sessionId },
    },
  });

  if (error || !data) {
    throw new Error("Failed to generate feedback");
  }

  return data.data;
};

export const getFeedback = async (
  sessionId: number,
): Promise<FeedbackReport> => {
  const { data, error } = await client.GET("/api/sessions/{id}/feedback", {
    params: {
      path: { id: sessionId },
    },
  });

  if (error || !data) {
    throw new Error("Failed to fetch feedback");
  }

  return data.data;
};

// ============================================================================
// Auth Endpoints
// ============================================================================

export const getUser = async (): Promise<User> => {
  const { data, error } = await client.GET("/api/auth/user");

  if (error || !data) {
    throw new Error("Failed to fetch user");
  }

  return data;
};
