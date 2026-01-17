// Get API base URL from environment variable
// In production: should be set to https://api.systemdesigntrainer.com
// In development: defaults to '/api' to use Vite proxy
// Custom error class that includes HTTP status information
export class ApiError extends Error {
  status: number;
  statusText: string;

  constructor(message: string, status: number, statusText: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
  }
}

export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL ?? "/api";
};

// ETag cache for conditional requests
const etagCache = new Map<string, string>();

// Store ETag for a URL
const storeETag = (url: string, etag: string) => {
  etagCache.set(url, etag);
};

// Get stored ETag for a URL
const getStoredETag = (url: string): string | undefined => {
  return etagCache.get(url);
};

// Track last successful response data for 304 handling
const lastResponseCache = new Map<string, unknown>();

export const customInstance = async <T>(config: {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  params?: Record<string, string | number>;
  data?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}): Promise<T> => {
  // Build URL with path parameters
  let url = config.url;
  if (config.params) {
    Object.keys(config.params).forEach((key) => {
      url = url.replace(`{${key}}`, String(config.params![key]));
    });
  }

  const baseUrl = getApiBaseUrl();
  const cleanUrl = url.startsWith("/") ? url.slice(1) : url;
  url = `${baseUrl}/${cleanUrl}`;

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...config.headers,
  };

  // Add If-None-Match header for GET requests if we have a stored ETag
  if (config.method === "GET") {
    const storedETag = getStoredETag(url);
    if (storedETag) {
      headers["If-None-Match"] = storedETag;
    }
  }

  // Build fetch options
  const fetchOptions: RequestInit = {
    method: config.method,
    headers,
    signal: config.signal,
    credentials: "include", // Send cookies with requests
  };

  // Add body for POST/PUT/PATCH requests
  if (config.data && ["POST", "PUT", "PATCH"].includes(config.method)) {
    fetchOptions.body = JSON.stringify(config.data);
  }

  // Make the request
  const response = await fetch(url, fetchOptions);

  // Handle 304 Not Modified - content hasn't changed
  if (response.status === 304) {
    // Return cached response data
    const cachedData = lastResponseCache.get(url);
    if (cachedData) {
      return cachedData as T;
    }
    // If no cache exists (shouldn't happen), throw error
    throw new ApiError(
      "304 Not Modified but no cached data available",
      304,
      "Not Modified",
    );
  }

  // Handle errors
  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(
      errorText || `HTTP error! status: ${response.status}`,
      response.status,
      response.statusText,
    );
  }

  // Store ETag from response for future requests
  const etag = response.headers.get("ETag");
  if (etag && config.method === "GET") {
    storeETag(url, etag);
  }

  // Parse and return JSON response
  const data = await response.json();

  // Cache the successful response for 304 handling
  if (config.method === "GET") {
    lastResponseCache.set(url, data);
  }

  return data as T;
};
