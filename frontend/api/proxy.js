export default {
  async fetch(request) {
    const origin = process.env.API_ORIGIN;
    if (!origin || !/^https:\/\/[^/]+\/?$/.test(origin)) {
      return Response.json({ message: 'API indisponível.' }, { status: 503 });
    }

    const incoming = new URL(request.url);
    const path = incoming.searchParams.get('path') || '';
    if (!/^[a-zA-Z0-9/_-]+$/.test(path) || path.includes('..')) {
      return Response.json({ message: 'Rota inválida.' }, { status: 400 });
    }

    const target = new URL(`/api/v1/${path}`, origin);
    incoming.searchParams.delete('path');
    target.search = incoming.searchParams.toString();

    const requestHeaders = new Headers(request.headers);
    for (const header of ['host', 'content-length', 'connection', 'forwarded', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto', 'x-real-ip']) {
      requestHeaders.delete(header);
    }

    try {
      const upstream = await fetch(target, {
        method: request.method,
        headers: requestHeaders,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        duplex: 'half',
        redirect: 'manual',
        cache: 'no-store',
      });
      const responseHeaders = new Headers(upstream.headers);
      for (const header of ['content-length', 'content-encoding', 'transfer-encoding', 'connection']) {
        responseHeaders.delete(header);
      }
      const cookies = upstream.headers.getSetCookie();
      responseHeaders.delete('set-cookie');
      for (const cookie of cookies) {
        responseHeaders.append('set-cookie', cookie.replace(/;\s*Domain=[^;]*/ig, ''));
      }
      responseHeaders.set('Cache-Control', 'private, no-store');
      const body = [204, 304].includes(upstream.status) ? null : upstream.body;
      return new Response(body, { status: upstream.status, headers: responseHeaders });
    } catch {
      return Response.json({ message: 'API indisponível.' }, { status: 502 });
    }
  },
};
