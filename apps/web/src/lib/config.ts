const DEFAULT_API_BASE_URL = "/api";

declare const process: { env?: { VITE_API_BASE_URL?: string; VITE_WS_BASE_URL?: string } } | undefined;

const configuredApiBaseUrl = typeof process !== "undefined" ? process.env?.VITE_API_BASE_URL : undefined;
const configuredWsBaseUrl = typeof process !== "undefined" ? process.env?.VITE_WS_BASE_URL : undefined;

export const API_BASE_URL = configuredApiBaseUrl ?? DEFAULT_API_BASE_URL;

export const WS_BASE_URL = configuredWsBaseUrl ?? toWebsocketBaseUrl(API_BASE_URL);

export function toWebsocketBaseUrl(apiBaseUrl: string): string {
  if (apiBaseUrl.startsWith("ws://") || apiBaseUrl.startsWith("wss://")) return apiBaseUrl;
  if (apiBaseUrl.startsWith("http://")) return apiBaseUrl.replace(/^http:\/\//, "ws://");
  if (apiBaseUrl.startsWith("https://")) return apiBaseUrl.replace(/^https:\/\//, "wss://");
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  return new URL(apiBaseUrl, origin).toString().replace(/^http/, "ws").replace(/\/$/, "");
}
