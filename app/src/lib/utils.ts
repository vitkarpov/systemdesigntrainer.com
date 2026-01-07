import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ApiError } from "@/api/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatElapsedTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function parseErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message) {
    return fallback;
  }

  // Try to parse the error message as JSON
  try {
    const parsed = JSON.parse(error.message);
    // If it's an object with a message field, use that
    if (parsed && typeof parsed === "object" && "message" in parsed) {
      let errorMessage = parsed.message;
      // If there's a reason field, append it to the message
      if ("reason" in parsed && parsed.reason) {
        errorMessage += `: ${parsed.reason}`;
      }
      return errorMessage;
    }
  } catch {
    // If parsing fails, just return the original message
  }

  return error.message;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isForbiddenError(error: unknown): boolean {
  return isApiError(error) && error.status === 403;
}
