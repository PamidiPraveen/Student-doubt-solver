/**
 * The single place that talks to the backend.
 *
 * The API answers in one JSON envelope, {success, data|error}. This module
 * turns that (and any non-JSON failure, such as a proxy error page or a lost
 * connection) into either the unwrapped data or an ApiError.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string>;
  readonly data?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, string>,
    data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.data = data;
  }
}

/** Codes that mean "your session is over", wherever they appear. */
export const SESSION_ERROR_CODES = new Set([
  "AUTH_REQUIRED",
  "TOKEN_INVALID",
  "TOKEN_EXPIRED",
  "USER_NOT_AVAILABLE",
]);

const BASE_URL: string = (import.meta.env?.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

let token: string | null = null;
let onSessionExpired: (() => void) | null = null;

export function setToken(value: string | null) {
  token = value;
}

export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  form?: FormData;
  query?: Record<string, string | number | undefined | null>;
  /** Skip the global "session expired" handling (used by login). */
  anonymous?: boolean;
}

export interface Envelope<T> {
  data: T;
  meta?: { total: number; limit: number; offset: number; unread?: number };
  ai?: unknown;
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return BASE_URL ? url.toString() : url.pathname + url.search;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<Envelope<T>> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (options.form) {
    body = options.form; // the browser sets the multipart boundary
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? "GET",
      headers,
      body,
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Cannot reach the server. Check your connection and try again.",
    );
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const envelope = payload as
    | {
        success?: boolean;
        data?: unknown;
        meta?: Envelope<T>["meta"];
        ai?: unknown;
        error?: { code?: string; message?: string; details?: Record<string, string> };
      }
    | null;

  if (response.ok && envelope?.success) {
    return { data: envelope.data as T, meta: envelope.meta, ai: envelope.ai };
  }

  const error = envelope?.error;
  const apiError = new ApiError(
    response.status,
    error?.code ?? fallbackCode(response.status),
    error?.message ?? fallbackMessage(response.status),
    error?.details,
    envelope?.data,
  );

  if (!options.anonymous && SESSION_ERROR_CODES.has(apiError.code)) {
    onSessionExpired?.();
  }
  throw apiError;
}

function fallbackCode(status: number) {
  if (status === 413) return "REQUEST_TOO_LARGE";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "SERVER_ERROR";
  return "REQUEST_FAILED";
}

function fallbackMessage(status: number) {
  if (status === 413) return "That file is too large.";
  if (status === 429) return "Too many attempts. Wait a minute and try again.";
  if (status >= 500) return "The server had a problem. Try again shortly.";
  return "The request could not be completed.";
}

export async function get<T>(path: string, query?: RequestOptions["query"]) {
  return (await request<T>(path, { query })).data;
}

export async function post<T>(path: string, body?: unknown, anonymous = false) {
  return (await request<T>(path, { method: "POST", body: body ?? {}, anonymous })).data;
}

export async function remove<T>(path: string) {
  return (await request<T>(path, { method: "DELETE" })).data;
}
