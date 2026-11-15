import { z } from "zod";

/** The server answered with an error envelope. `code` is stable; `message` is safe to show. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

/** The request never got an answer (offline, timeout, DNS). */
export class NetworkError extends Error {
  constructor(
    message = "Can't reach the server. Check your connection and try again.",
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

/** The server answered, but not in the shape this version of the app understands. */
export class ContractError extends Error {
  constructor(readonly path: string) {
    super(
      "The server sent something this version of the app does not understand. Please update the app.",
    );
    this.name = "ContractError";
  }
}

const errorEnvelope = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fields: z.record(z.string(), z.string()).optional(),
  }),
});

export interface ApiClientOptions {
  baseUrl: string;
  getToken: () => string | null;
  /** Called when a request that carried a token comes back 401: the session ended. */
  onUnauthorized?: () => void;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export type Query = Record<string, string | number | boolean | undefined>;

export interface RequestInit<S extends z.ZodType> {
  schema: S;
  query?: Query;
  body?: unknown;
  /** Skip the Authorization header (sign-in). */
  anonymous?: boolean;
}

const DEFAULT_TIMEOUT_MS = 20_000;

export function buildUrl(baseUrl: string, path: string, query?: Query): string {
  const url = new URL(`${baseUrl.replace(/\/+$/, "")}/api/v1${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "")
      url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export function createApiClient(options: ApiClientOptions) {
  const doFetch = options.fetch ?? fetch;

  async function request<S extends z.ZodType>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    init: RequestInit<S>,
  ): Promise<z.output<S>> {
    const token = init.anonymous ? null : options.getToken();
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );

    let response: Response;
    try {
      response = await doFetch(buildUrl(options.baseUrl, path, init.query), {
        method,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(init.body !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      });
    } catch {
      throw new NetworkError();
    } finally {
      clearTimeout(timer);
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      if (response.status === 401 && token) options.onUnauthorized?.();
      throw new ApiRequestError(
        response.status,
        "bad_response",
        "The server sent an unreadable reply.",
      );
    }

    if (!response.ok) {
      const parsed = errorEnvelope.safeParse(json);
      if (response.status === 401 && token) options.onUnauthorized?.();
      if (parsed.success) {
        const { code, message, fields } = parsed.data.error;
        throw new ApiRequestError(response.status, code, message, fields);
      }
      throw new ApiRequestError(
        response.status,
        "http_error",
        `The server replied ${response.status}.`,
      );
    }

    const hasData = typeof json === "object" && json !== null && "data" in json;
    const parsed = hasData
      ? init.schema.safeParse((json as { data: unknown }).data)
      : null;
    if (!parsed?.success) throw new ContractError(path);
    return parsed.data as z.output<S>;
  }

  return {
    get: <S extends z.ZodType>(path: string, schema: S, query?: Query) =>
      request("GET", path, { schema, query }),
    post: <S extends z.ZodType>(
      path: string,
      schema: S,
      body?: unknown,
      anonymous = false,
    ) => request("POST", path, { schema, body: body ?? {}, anonymous }),
    delete: <S extends z.ZodType>(path: string, schema: S, body?: unknown) =>
      request("DELETE", path, { schema, body: body ?? {} }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

/** A message safe to show for any thrown thing. */
export function messageFor(error: unknown): string {
  if (error instanceof ApiRequestError) {
    // "Please check the highlighted fields" is no help on a phone; say which fields and why.
    const reasons = Object.values(error.fields ?? {});
    return reasons.length > 0 ? reasons.join(" ") : error.message;
  }
  if (error instanceof NetworkError || error instanceof ContractError)
    return error.message;
  return "Something went wrong. Please try again.";
}
