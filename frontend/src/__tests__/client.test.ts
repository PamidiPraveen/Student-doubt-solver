import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, get, post, setSessionExpiredHandler, setToken } from "../api/client";

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("api client", () => {
  beforeEach(() => setToken(null));
  afterEach(() => {
    vi.unstubAllGlobals();
    setSessionExpiredHandler(null);
  });

  it("unwraps the success envelope and sends the bearer token", async () => {
    const fetchMock = mockFetch(200, { success: true, data: { hello: "world" } });
    setToken("abc");
    await expect(get("/api/v1/x")).resolves.toEqual({ hello: "world" });
    const init = fetchMock.mock.calls[0][1];
    expect(init.headers.Authorization).toBe("Bearer abc");
  });

  it("turns an error envelope into an ApiError with code and details", async () => {
    mockFetch(400, {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "bad", details: { title: "Required" } },
    });
    const err = (await post("/api/v1/x", {}).catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.details).toEqual({ title: "Required" });
  });

  it("reports a lost connection as NETWORK_ERROR", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fail")));
    const err = (await get("/api/v1/x").catch((e) => e)) as ApiError;
    expect(err.code).toBe("NETWORK_ERROR");
  });

  it("handles a non-JSON proxy failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => { throw new Error("html"); } }),
    );
    const err = (await get("/api/v1/x").catch((e) => e)) as ApiError;
    expect(err.code).toBe("SERVER_ERROR");
  });

  it("ends the session on token errors, but not for anonymous calls", async () => {
    const handler = vi.fn();
    setSessionExpiredHandler(handler);
    mockFetch(401, { success: false, error: { code: "TOKEN_EXPIRED", message: "x" } });
    await get("/api/v1/x").catch(() => undefined);
    expect(handler).toHaveBeenCalledTimes(1);

    mockFetch(401, { success: false, error: { code: "TOKEN_INVALID", message: "x" } });
    await post("/api/v1/auth/login", {}, true).catch(() => undefined);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
