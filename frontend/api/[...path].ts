const REQUEST_HEADERS_TO_SKIP = new Set([
  "connection",
  "content-length",
  "host",
  "transfer-encoding",
]);

const RESPONSE_HEADERS_TO_SKIP = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "set-cookie",
  "transfer-encoding",
]);

function apiOrigin(): URL {
  const configuredOrigin = process.env.API_ORIGIN;

  if (!configuredOrigin) {
    throw new Error("API_ORIGIN is not configured");
  }

  const origin = new URL(configuredOrigin);

  if (origin.protocol !== "https:" && origin.hostname !== "localhost") {
    throw new Error("API_ORIGIN must use HTTPS");
  }

  return origin;
}

function upstreamUrl(request: Request): URL {
  const requestUrl = new URL(request.url);
  const pathname =
    requestUrl.pathname === "/api/csrf-cookie"
      ? "/sanctum/csrf-cookie"
      : requestUrl.pathname;
  const upstream = new URL(pathname, apiOrigin());

  upstream.search = requestUrl.search;

  return upstream;
}

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const headers = new Headers(request.headers);

      for (const header of REQUEST_HEADERS_TO_SKIP) {
        headers.delete(header);
      }

      const body =
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : await request.arrayBuffer();
      const upstreamResponse = await fetch(upstreamUrl(request), {
        method: request.method,
        headers,
        body,
        redirect: "manual",
      });
      const responseHeaders = new Headers(upstreamResponse.headers);

      for (const header of RESPONSE_HEADERS_TO_SKIP) {
        responseHeaders.delete(header);
      }

      for (const cookie of upstreamResponse.headers.getSetCookie()) {
        responseHeaders.append("Set-Cookie", cookie);
      }

      responseHeaders.set("Cache-Control", "private, no-store");

      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error("HiCash API proxy failed", error);

      return Response.json(
        { message: "A API do HiCash está temporariamente indisponível." },
        { status: process.env.API_ORIGIN ? 502 : 503 },
      );
    }
  },
};
