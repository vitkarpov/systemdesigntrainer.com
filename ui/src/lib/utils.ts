import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatElapsedTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) {
    return `${mins}m`;
  }
  return `${mins}m ${secs}s`;
}

export function parseErrorMessage(error: any, fallbackMessage: string): string {
  try {
    // Try to parse as JSON if error.message exists
    if (error?.message) {
      const parsed = JSON.parse(error.message);
      console.log("Error:", parsed.message || error.message);
      return parsed.reason || fallbackMessage;
    }
  } catch {
    // If JSON parsing fails, try to extract from response data or use raw message
    console.error("Error:", error);
  }

  // Fallback chain for various error structures
  return error?.response?.data?.message || error?.message || fallbackMessage;
}
