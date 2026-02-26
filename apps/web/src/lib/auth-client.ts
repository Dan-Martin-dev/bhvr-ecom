import { createAuthClient } from "better-auth/react";

// Use relative URL so auth requests go through the Vite proxy (same-origin).
// This avoids CORS entirely in development and cookie issues with cross-origin requests.
export const authClient = createAuthClient({
  baseURL: window.location.origin,
});
