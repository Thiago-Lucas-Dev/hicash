import { afterEach, expect, test, vi } from 'vitest';
import proxy from '../api/proxy.js';

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.API_ORIGIN;
});

test('proxy forwards only to the configured API and preserves session cookies', async () => {
  process.env.API_ORIGIN = 'https://api.example.test';
  const upstream = vi.fn(async () => new Response('{"ok":true}', {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'hicash-session=opaque; Path=/; Domain=api.example.test; HttpOnly; Secure',
    },
  }));
  vi.stubGlobal('fetch', upstream);

  const response = await proxy.fetch(new Request('https://hicash.vercel.app/api/proxy?path=dashboard&month=2026-10'));

  expect(upstream.mock.calls[0][0].toString()).toBe('https://api.example.test/api/v1/dashboard?month=2026-10');
  expect(response.status).toBe(200);
  expect(response.headers.get('set-cookie')).toContain('HttpOnly');
  expect(response.headers.get('set-cookie')).not.toContain('Domain=');
  expect(response.headers.get('cache-control')).toBe('private, no-store');
});

test('proxy rejects an invalid destination and missing API configuration', async () => {
  process.env.API_ORIGIN = 'https://api.example.test';
  const upstream = vi.fn();
  vi.stubGlobal('fetch', upstream);
  const invalid = await proxy.fetch(new Request('https://hicash.vercel.app/api/proxy?path=../ready'));
  expect(invalid.status).toBe(400);
  expect(upstream).not.toHaveBeenCalled();

  delete process.env.API_ORIGIN;
  const unavailable = await proxy.fetch(new Request('https://hicash.vercel.app/api/proxy?path=dashboard'));
  expect(unavailable.status).toBe(503);
});

test('proxy forwards empty deletion responses', async () => {
  process.env.API_ORIGIN = 'https://api.example.test';
  vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })));

  const response = await proxy.fetch(new Request('https://hicash.vercel.app/api/proxy?path=transactions/1', { method: 'DELETE' }));

  expect(response.status).toBe(204);
  expect(await response.text()).toBe('');
});
