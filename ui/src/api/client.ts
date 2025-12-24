export const customInstance = async <T>(config: {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  params?: any;
  data?: any;
  signal?: AbortSignal;
  headers?: any;
}): Promise<T> => {
  // Build URL with path parameters
  let url = config.url;
  if (config.params) {
    Object.keys(config.params).forEach((key) => {
      url = url.replace(`{${key}}`, String(config.params[key]));
    });
  }

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...config.headers,
  };

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

  // Handle errors
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP error! status: ${response.status}`);
  }

  // Parse and return JSON response
  const data = await response.json();
  return data as T;
};
