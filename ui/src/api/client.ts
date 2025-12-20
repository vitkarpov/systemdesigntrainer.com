import createClient from "openapi-fetch";
import type { paths } from "./types.gen";

const client = createClient<paths>({ baseUrl: "/" });

client.use({
  onRequest({ request }) {
    const token = localStorage.getItem("accessToken");
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
    return request;
  },
});

// Custom instance for Orval to use with openapi-fetch
export const customInstance = async <T>(config: {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  params?: any;
  data?: any;
  signal?: AbortSignal;
  headers?: any;
}): Promise<T> => {
  const method = config.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';

  // Build the fetch config
  const fetchConfig: any = {};

  // Handle path parameters
  if (config.params) {
    fetchConfig.params = { path: config.params };
  }

  // Handle request body
  if (config.data) {
    fetchConfig.body = config.data;
  }

  // Handle abort signal
  if (config.signal) {
    fetchConfig.signal = config.signal;
  }

  // Handle headers
  if (config.headers) {
    fetchConfig.headers = config.headers;
  }

  // Make the request using openapi-fetch client
  const response = await (client as any)[method](config.url, fetchConfig);

  // Handle errors
  if (response.error || !response.data) {
    throw new Error(response.error?.message || 'API request failed');
  }

  return response.data as T;
};

export default client;