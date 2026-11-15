import { config } from "../config";
import { createApiClient } from "./client";
import { createEndpoints } from "./endpoints";

/**
 * The one API instance. The session provider owns the token and tells us when it ends; everything else
 * just calls `api.*`.
 */
let token: string | null = null;
let onSessionEnded: () => void = () => undefined;

export const sessionBridge = {
  setToken(next: string | null) {
    token = next;
  },
  onEnded(handler: () => void) {
    onSessionEnded = handler;
  },
};

export const api = createEndpoints(
  createApiClient({
    baseUrl: config.apiUrl,
    getToken: () => token,
    onUnauthorized: () => onSessionEnded(),
  }),
);
