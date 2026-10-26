import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, csrf, json } from "./api";

describe("cliente HTTP", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.cookie = "XSRF-TOKEN=test-token";
  });

  it("envia cookies e o token CSRF em operações de escrita", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await api("settings", json("PUT", { theme: "dark" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/settings",
      expect.objectContaining({
        credentials: "include",
        method: "PUT",
        headers: expect.objectContaining({ "X-XSRF-TOKEN": "test-token" }),
      }),
    );
  });

  it("notifica a aplicação quando a sessão não é autorizada", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 401 })),
    );
    const listener = vi.fn();
    window.addEventListener("hicash:unauthorized", listener);

    await expect(api("accounts")).rejects.toBeInstanceOf(ApiError);

    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener("hicash:unauthorized", listener);
  });

  it("inicializa o cookie CSRF com credenciais", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await csrf();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/csrf-cookie",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
