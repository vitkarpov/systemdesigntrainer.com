import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export interface Session {
  id: number;
  status: "not_started" | "in_progress" | "completed";
  currentPhase: string;
  elapsedTime: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  interviewCase: {
    id: number;
    title: string;
    description: string;
    difficulty: string;
  };
}

export interface Phase {
  phase: string;
  status: "not_started" | "in_progress" | "completed";
  startedAt: string | null;
  completedAt: string | null;
  elapsedTime: number;
}

export interface TranscriptMessage {
  id: number;
  role: "interviewer" | "candidate";
  content: string;
  createdAt: string;
  elapsedTime: number;
}

export interface Signal {
  id: number;
  signalType: string;
  detectedAt: string;
  phase: string;
  elapsedTime: number;
}

export interface RedFlag {
  id: number;
  flagType: string;
  severity: "low" | "medium" | "high";
  detectedAt: string;
  description: string;
}

export interface FeedbackItem {
  category: "strength" | "weakness" | "suggestion";
  title: string;
  description: string;
}

export interface FeedbackNextStep {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

export interface FeedbackReport {
  id: number;
  overallScore: number;
  requirementsScore: number;
  designScore: number;
  communicationScore: number;
  timeManagementScore: number;
  depthScore: number;
  summary: string;
  feedbackItems: FeedbackItem[];
  nextSteps: FeedbackNextStep[];
  createdAt: string;
}

// Session endpoints
export const createSession = async (caseId: number = 1): Promise<Session> => {
  const response = await api.post("/sessions", { interviewCaseId: caseId });
  return response.data;
};

export const startSession = async (sessionId: number): Promise<Session> => {
  const response = await api.post(`/sessions/${sessionId}/start`);
  return response.data;
};

export const getSession = async (sessionId: number): Promise<Session> => {
  const response = await api.get(`/sessions/${sessionId}`);
  return response.data;
};

export const getPhases = async (sessionId: number): Promise<Phase[]> => {
  const response = await api.get(`/sessions/${sessionId}/phases`);
  return response.data;
};

export const advancePhase = async (sessionId: number): Promise<Session> => {
  const response = await api.patch(`/sessions/${sessionId}/phase`);
  return response.data;
};

// Transcript endpoints
export const getTranscript = async (
  sessionId: number,
): Promise<TranscriptMessage[]> => {
  const response = await api.get(`/sessions/${sessionId}/transcript`);
  return response.data;
};

export const addMessage = async (
  sessionId: number,
  role: "interviewer" | "candidate",
  content: string,
): Promise<TranscriptMessage> => {
  const response = await api.post(`/sessions/${sessionId}/messages`, {
    role,
    content,
  });
  return response.data;
};

// AI endpoint
export const getAiResponse = async (
  sessionId: number,
): Promise<{ message: string }> => {
  const response = await api.post(`/sessions/${sessionId}/ai-response`);
  return response.data;
};

// Signal and Red Flag endpoints
export const getSignals = async (sessionId: number): Promise<Signal[]> => {
  const response = await api.get(`/sessions/${sessionId}/signals`);
  return response.data;
};

export const getRedFlags = async (sessionId: number): Promise<RedFlag[]> => {
  const response = await api.get(`/sessions/${sessionId}/red-flags`);
  return response.data;
};

// Feedback endpoints
export const generateFeedback = async (
  sessionId: number,
): Promise<FeedbackReport> => {
  const response = await api.post(`/sessions/${sessionId}/feedback`);
  return response.data;
};

export const getFeedback = async (
  sessionId: number,
): Promise<FeedbackReport> => {
  const response = await api.get(`/sessions/${sessionId}/feedback`);
  return response.data;
};

export default api;
