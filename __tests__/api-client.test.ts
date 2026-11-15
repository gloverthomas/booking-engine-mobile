import { z } from "zod";
import {
  ApiRequestError,
  ContractError,
  NetworkError,
  buildUrl,
  createApiClient,
  messageFor,
} from "@/lib/api/client";
import { createEndpoints } from "@/lib/api/endpoints";

const BASE = "https://app.example.com/";

function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function setup(
  response: Response | (() => Promise<Response>),
  token: string | null = "tok",
) {
  const fetchMock = jest.fn<Promise<Response>, [string, RequestInit]>(
    async () => (typeof response === "function" ? response() : response),
  );
  const onUnauthorized = jest.fn();
  const api = createApiClient({
    baseUrl: BASE,
    getToken: () => token,
    onUnauthorized,
    fetch: fetchMock as unknown as typeof fetch,
    timeoutMs: 50,
  });
  return { api, fetchMock, onUnauthorized };
}

const ping = z.object({ ok: z.boolean() });

describe("buildUrl", () => {
  test("joins the base, /api/v1 and the path, tolerating a trailing slash", () => {
    expect(buildUrl("https://a.com/", "/me")).toBe("https://a.com/api/v1/me");
    expect(buildUrl("https://a.com", "/me")).toBe("https://a.com/api/v1/me");
  });

  test("adds only the query values that are set", () => {
    const url = buildUrl("https://a.com", "/x", {
      a: "1",
      b: undefined,
      c: "",
      d: 0,
      e: false,
    });
    expect(url).toBe("https://a.com/api/v1/x?a=1&d=0&e=false");
  });

  test("encodes awkward characters", () => {
    expect(
      buildUrl("https://a.com", "/clients", { q: "O'Brien & co" }),
    ).toContain("q=O%27Brien+%26+co");
  });
});

describe("success", () => {
  test("sends the bearer token and returns the validated data", async () => {
    const { api, fetchMock } = setup(reply(200, { data: { ok: true } }));
    await expect(api.get("/ping", ping)).resolves.toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://app.example.com/api/v1/ping");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer tok",
    );
  });

  test("a POST sends a JSON body", async () => {
    const { api, fetchMock } = setup(reply(200, { data: { ok: true } }));
    await api.post("/x", ping, { a: 1 });
    const init = fetchMock.mock.calls[0][1] as unknown as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"a":1}');
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
  });

  test("no token means no Authorization header; anonymous never sends one", async () => {
    const none = setup(reply(200, { data: { ok: true } }), null);
    await none.api.get("/ping", ping);
    expect(
      (none.fetchMock.mock.calls[0][1] as unknown as RequestInit).headers,
    ).not.toHaveProperty("Authorization");
    const anon = setup(reply(200, { data: { ok: true } }));
    await anon.api.post("/auth/google", ping, {}, true);
    expect(
      (anon.fetchMock.mock.calls[0][1] as unknown as RequestInit).headers,
    ).not.toHaveProperty("Authorization");
  });
});

describe("errors", () => {
  test("an error envelope becomes an ApiRequestError with its code, message and fields", async () => {
    const { api } = setup(
      reply(422, {
        error: {
          code: "invalid_request",
          message: "Check the fields",
          fields: { phone: "Enter a valid phone number" },
        },
      }),
    );
    const error = await api.get("/x", ping).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({
      status: 422,
      code: "invalid_request",
      fields: { phone: "Enter a valid phone number" },
    });
  });

  test("a 401 with a token reports the session ended; without a token it does not", async () => {
    const body = { error: { code: "unauthenticated", message: "Sign in" } };
    const withToken = setup(reply(401, body));
    await withToken.api.get("/x", ping).catch(() => undefined);
    expect(withToken.onUnauthorized).toHaveBeenCalledTimes(1);

    const anonymous = setup(reply(401, body));
    await anonymous.api
      .post("/auth/google", ping, {}, true)
      .catch(() => undefined);
    expect(anonymous.onUnauthorized).not.toHaveBeenCalled();
  });

  test("a 401 that is not even JSON still ends the session", async () => {
    const { api, onUnauthorized } = setup(
      new Response("nope", { status: 401 }),
    );
    await expect(api.get("/x", ping)).rejects.toMatchObject({
      code: "bad_response",
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  test("an error that is not our envelope still produces a readable error", async () => {
    const { api } = setup(reply(502, { html: "bad gateway" }));
    await expect(api.get("/x", ping)).rejects.toMatchObject({
      status: 502,
      code: "http_error",
    });
  });

  test("a success that does not match the schema is a ContractError, never bad data", async () => {
    await expect(
      setup(reply(200, { data: { ok: "yes" } })).api.get("/x", ping),
    ).rejects.toBeInstanceOf(ContractError);
    await expect(
      setup(reply(200, { nothing: true })).api.get("/x", ping),
    ).rejects.toBeInstanceOf(ContractError);
    await expect(
      setup(reply(200, null)).api.get("/x", ping),
    ).rejects.toBeInstanceOf(ContractError);
  });

  test("a failed fetch is a NetworkError", async () => {
    const { api } = setup(async () => {
      throw new TypeError("Network request failed");
    });
    await expect(api.get("/x", ping)).rejects.toBeInstanceOf(NetworkError);
  });

  test("a request that takes too long is aborted and reported as a network problem", async () => {
    const fetchMock = jest.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );
    const api = createApiClient({
      baseUrl: BASE,
      getToken: () => "t",
      fetch: fetchMock as unknown as typeof fetch,
      timeoutMs: 20,
    });
    await expect(api.get("/x", ping)).rejects.toBeInstanceOf(NetworkError);
  });
});

describe("messageFor", () => {
  test("uses field reasons when the server gave them, else the message", () => {
    expect(
      messageFor(
        new ApiRequestError(422, "invalid_request", "Check the fields", {
          phone: "Bad phone.",
          email: "Bad email.",
        }),
      ),
    ).toBe("Bad phone. Bad email.");
    expect(
      messageFor(
        new ApiRequestError(
          409,
          "slot_taken",
          "That time is no longer available",
        ),
      ),
    ).toBe("That time is no longer available");
  });

  test("network and contract errors are readable; anything else is generic and leaks nothing", () => {
    expect(messageFor(new NetworkError())).toContain("Can't reach the server");
    expect(messageFor(new ContractError("/x"))).toContain("update the app");
    expect(messageFor(new Error("secret db password"))).toBe(
      "Something went wrong. Please try again.",
    );
    expect(messageFor("boom")).toBe("Something went wrong. Please try again.");
  });
});

describe("endpoints", () => {
  const data = { data: { slots: [{ staffId: "s", start: "a", end: "b" }] } };

  test("availability joins service ids and passes dates", async () => {
    const { api, fetchMock } = setup(reply(200, data));
    await createEndpoints(api).availability({
      locationId: "L",
      serviceIds: ["a", "b"],
      fromDate: "2026-11-24",
      toDate: "2026-11-24",
    });
    const url = new URL((fetchMock.mock.calls[0] as unknown as [string])[0]);
    expect(url.pathname).toBe("/api/v1/availability");
    expect(url.searchParams.get("serviceIds")).toBe("a,b");
    expect(url.searchParams.get("fromDate")).toBe("2026-11-24");
    expect(url.searchParams.has("staffId")).toBe(false);
  });

  test("ids in paths are encoded", async () => {
    const { api, fetchMock } = setup(reply(200, { data: { ok: true } }));
    await createEndpoints(api)
      .markNoShow("a/b?c")
      .catch(() => undefined);
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toContain(
      "/bookings/a%2Fb%3Fc/no-show",
    );
  });

  test("cancel sends the deposit decision", async () => {
    const { api, fetchMock } = setup(
      reply(200, { data: { depositAction: "keep", feeCents: 0 } }),
    );
    await createEndpoints(api).cancelBooking("id1", "keep", "Unwell");
    const init = fetchMock.mock.calls[0][1] as unknown as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({
      depositMode: "keep",
      reason: "Unwell",
    });
  });
});
