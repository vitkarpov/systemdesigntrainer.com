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

export default client;