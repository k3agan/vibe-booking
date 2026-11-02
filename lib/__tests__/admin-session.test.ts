import { NextRequest } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { POST, GET, DELETE } from '../../app/api/admin/session/route';
import { requireAdmin } from '../admin-auth';

const originalEnv = process.env;
const secret = 'test-only-session-secret';
const origin = 'https://hall.example';
function request(method: string, options: { password?: unknown; cookie?: string; origin?: string } = {}) {
  return new NextRequest(`${origin}/api/admin/session`, {
    method,
    headers: {
      ...(options.origin ? { Origin: options.origin } : {}),
      ...(options.cookie ? { Cookie: options.cookie } : {}),
    },
    ...(method === 'POST' ? { body: JSON.stringify({ password: options.password }) } : {}),
  });
}
async function login() {
  const response = await POST(request('POST', { password: secret, origin }));
  expect(response.status).toBe(200);
  return response.headers.get('set-cookie')!.split(';')[0];
}
beforeEach(() => { process.env = { ...originalEnv, ADMIN_API_SECRET: secret }; });
afterEach(() => { jest.useRealTimers(); });
afterAll(() => { process.env = originalEnv; });

it('issues a bounded HttpOnly Secure SameSite=Strict session, never the shared secret', async () => {
  const response = await POST(request('POST', { password: secret, origin }));
  expect(response.status).toBe(200);
  const cookie = response.headers.get('set-cookie')!;
  expect(cookie).toContain('HttpOnly');
  expect(cookie).toContain('Secure');
  expect(cookie).toMatch(/SameSite=strict/i);
  expect(cookie).toContain('Max-Age=28800');
  expect(cookie).toContain('Path=/api/admin');
  expect(cookie).not.toContain(secret);
  expect(await response.text()).not.toContain(secret);
  expect(response.headers.get('cache-control')).toBe('no-store');
});

it.each(['wrong', '', null, 123])('rejects bad login %s without a session', async (password) => {
  const response = await POST(request('POST', { password, origin }));
  expect(response.status).toBe(401);
  expect(response.headers.get('set-cookie')).toBeNull();
});

it('fails closed without a configured server credential', async () => {
  delete process.env.ADMIN_API_SECRET;
  expect((await POST(request('POST', { password: secret, origin }))).status).toBe(503);
});

it.each([undefined, 'https://attacker.example'])('rejects session login without same-origin proof: %s', async (otherOrigin) => {
  expect((await POST(request('POST', { password: secret, origin: otherOrigin }))).status).toBe(403);
});

it('accepts the signed cookie for portal status and same-origin cancellation, not cross-site/missing-origin writes', async () => {
  const cookie = await login();
  expect((await GET(request('GET', { cookie }))).status).toBe(200);
  for (const headerOrigin of [origin, undefined, 'https://attacker.example']) {
    const req = new NextRequest(`${origin}/api/admin/cancel-booking`, {
      method: 'POST', headers: { Cookie: cookie, ...(headerOrigin ? { Origin: headerOrigin } : {}) },
    });
    const denied = requireAdmin(req);
    expect(denied?.status ?? 200).toBe(headerOrigin === origin ? 200 : 403);
  }
});

it('rejects forged, tampered, expired and rotated-key cookies', async () => {
  const cookie = await login();
  for (const invalid of [cookie + 'tampered', 'chh_admin_session=forged', cookie.replace(/v1\./, 'v2.')]) {
    expect((await GET(request('GET', { cookie: invalid }))).status).toBe(401);
  }
  jest.useFakeTimers();
  jest.setSystemTime(Date.now() + 8 * 60 * 60 * 1000 + 1000);
  expect((await GET(request('GET', { cookie }))).status).toBe(401);
  jest.useRealTimers();
  process.env.ADMIN_API_SECRET = 'test-only-rotated-secret';
  expect((await GET(request('GET', { cookie }))).status).toBe(401);
});

it('clears the same cookie on logout and requires same-origin proof', async () => {
  expect((await DELETE(request('DELETE'))).status).toBe(403);
  const response = await DELETE(request('DELETE', { origin }));
  expect(response.status).toBe(200);
  expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  expect(response.headers.get('set-cookie')).toContain('Path=/api/admin');
});

it('portal uses server sessions rather than embedded credentials or public env', () => {
  const source = readFileSync(join(__dirname, '../../app/admin/page.tsx'), 'utf8');
  expect(source).toContain("fetch('/api/admin/session'");
  expect(source).not.toMatch(/password\s*===/);
  expect(source).not.toContain('NEXT_PUBLIC_');
  expect(source).not.toContain('ADMIN_API_SECRET');
  expect(source).not.toMatch(/localStorage|sessionStorage/);
  expect(source).toContain("credentials: 'same-origin'");
});

it('portal does not claim DB price is the refundable Stripe balance', () => {
  const source = readFileSync(join(__dirname, '../../app/admin/page.tsx'), 'utf8');
  expect(source).not.toContain('Max refundable:');
  expect(source).not.toContain('max: cancelDialog.booking.calculated_price');
  expect(source).toContain('remaining Stripe balance');
  expect(source).toContain('SECONDARY_ACCOUNT_REFUND_REFUSED');
});
