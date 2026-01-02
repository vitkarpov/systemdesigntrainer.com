import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// Mock fetch for SSE
global.fetch = vi.fn();

// Mock ResizeObserver (used by ReactFlow)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock auth API hooks to prevent AuthProvider from making real API calls
vi.mock("@/api/hooks.gen", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/hooks.gen")>();
  return {
    ...actual,
    useAuthControllerGetUser: vi.fn(() => ({
      data: null,
      isLoading: false,
      error: null,
    })),
    useAuthControllerLogout: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    })),
  };
});
