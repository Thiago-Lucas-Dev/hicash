import { afterEach, describe, expect, it, vi } from "vitest";
import proxy from "./[...path]";

describe("proxy da API", () => {
  afterEach(() => {
    delete process.env.API_ORIGIN;
    vi.restoreAllMocks();
  });

  it("encaminha o endpoint CSRF ao Sanctum e preserva cookies", async () => {
    process.env.API_ORIGIN = "https://api.example.test";
    const upstream = new Response(null, {
      status: 204,
      headers: { "Set-Cookie": "XSRF-TOKEN=token; Path=/; Secure" },
    });
    const fetchMock = vi.fn().mockResolvedValue(upstream);
    vi.stubGlobal("fetch", fetchMock);

    const response = await proxy.fetch(
      new Request("https://hicash.example.test/api/csrf-cookie?test=1", {
        headers: { Cookie: "hicash_session=session" },
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://api.example.test/sanctum/csrf-cookie?test=1"),
      expect.objectContaining({ method: "GET", redirect: "manual" }),
    );
    expect(response.status).toBe(204);
    expect(response.headers.getSetCookie()).toEqual([
      "XSRF-TOKEN=token; Path=/; Secure",
    ]);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("não inicia sem a origem da API", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await proxy.fetch(
      new Request("https://hicash.example.test/api/v1/health"),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      message: "A API do HiCash está temporariamente indisponível.",
    });
  });
});
