import { describe, it, expect, beforeEach, vi } from "vitest";
import { customInstance } from "../client";

describe("client", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Reset fetch mock
    global.fetch = vi.fn();
  });

  describe("getApiBaseUrl", () => {
    it("should use VITE_API_URL when environment variable is set", async () => {
      // Mock environment variable
      vi.stubGlobal("import.meta", {
        env: {
          VITE_API_URL: "https://api.example.com",
        },
      });

      // Mock successful response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "test" }),
      });

      await customInstance({
        url: "/test",
        method: "GET",
      });

      // Check that fetch was called with the custom VITE_API_URL
      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain("/api/test");
    });

    it("should default to '/api' when VITE_API_URL is not set", async () => {
      // Mock environment variable as undefined
      vi.stubGlobal("import.meta", {
        env: {},
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "test" }),
      });

      await customInstance({
        url: "/test",
        method: "GET",
      });

      // Check that fetch was called with /api prefix
      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain("/api/test");
    });

    it("should default to '/api' when VITE_API_URL is empty string", async () => {
      vi.stubGlobal("import.meta", {
        env: {
          VITE_API_URL: "",
        },
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "test" }),
      });

      await customInstance({
        url: "/test",
        method: "GET",
      });

      // Check that fetch was called with /api prefix
      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain("/api/test");
    });

    it("should default to '/api' when VITE_API_URL is only whitespace", async () => {
      vi.stubGlobal("import.meta", {
        env: {
          VITE_API_URL: "   ",
        },
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "test" }),
      });

      await customInstance({
        url: "/test",
        method: "GET",
      });

      // Check that fetch was called with /api prefix
      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain("/api/test");
    });
  });

  describe("URL construction", () => {
    beforeEach(() => {
      vi.stubGlobal("import.meta", {
        env: {
          VITE_API_URL: "https://api.example.com",
        },
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: "test" }),
      });
    });

    it("should remove leading slash from URL", async () => {
      await customInstance({
        url: "/users/123",
        method: "GET",
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain("/api/users/123");
    });

    it("should handle URL without leading slash", async () => {
      await customInstance({
        url: "users/123",
        method: "GET",
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain("/api/users/123");
    });

    it("should construct URL correctly with path parameters", async () => {
      await customInstance({
        url: "/users/{id}",
        method: "GET",
        params: { id: 123 },
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain("/api/users/123");
    });

    it("should construct URL correctly with multiple path parameters", async () => {
      await customInstance({
        url: "/users/{userId}/posts/{postId}",
        method: "GET",
        params: { userId: 123, postId: 456 },
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain("/api/users/123/posts/456");
    });

    it("should work with default base URL", async () => {
      vi.stubGlobal("import.meta", {
        env: {},
      });

      await customInstance({
        url: "/users",
        method: "GET",
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain("/api/users");
    });
  });

  describe("customInstance", () => {
    beforeEach(() => {
      vi.stubGlobal("import.meta", {
        env: {},
      });
    });

    it("should include credentials in request", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "test" }),
      });

      await customInstance({
        url: "/test",
        method: "GET",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: "include",
        }),
      );
    });

    it("should set Content-Type header", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "test" }),
      });

      await customInstance({
        url: "/test",
        method: "GET",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
    });

    it("should merge custom headers", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "test" }),
      });

      await customInstance({
        url: "/test",
        method: "GET",
        headers: {
          "X-Custom-Header": "custom-value",
        },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-Custom-Header": "custom-value",
          }),
        }),
      );
    });

    it("should include body for POST requests", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "test" }),
      });

      const data = { name: "John Doe" };

      await customInstance({
        url: "/users",
        method: "POST",
        data,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(data),
        }),
      );
    });

    it("should include body for PUT requests", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "test" }),
      });

      const data = { name: "Jane Doe" };

      await customInstance({
        url: "/users/123",
        method: "PUT",
        data,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(data),
        }),
      );
    });

    it("should not include body for GET requests", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "test" }),
      });

      await customInstance({
        url: "/users",
        method: "GET",
      });

      const fetchCall = (global.fetch as any).mock.calls[0][1];
      expect(fetchCall.body).toBeUndefined();
    });

    it("should throw error on non-ok response", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => "Not found",
      });

      await expect(
        customInstance({
          url: "/users/999",
          method: "GET",
        }),
      ).rejects.toThrow("Not found");
    });

    it("should throw error with status code when no error text", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "",
      });

      await expect(
        customInstance({
          url: "/users",
          method: "GET",
        }),
      ).rejects.toThrow("HTTP error! status: 500");
    });

    it("should return parsed JSON response", async () => {
      const mockData = { id: 123, name: "John Doe" };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await customInstance({
        url: "/users/123",
        method: "GET",
      });

      expect(result).toEqual(mockData);
    });

    it("should pass abort signal to fetch", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "test" }),
      });

      const controller = new AbortController();

      await customInstance({
        url: "/test",
        method: "GET",
        signal: controller.signal,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: controller.signal,
        }),
      );
    });
  });
});
