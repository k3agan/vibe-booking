import { NextRequest } from 'next/server';
jest.mock('../supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('../seam', () => ({ deleteAccessCodesForBooking: jest.fn() }));
import { GET, PATCH } from '../../app/api/admin/bookings/route';
import { supabase } from '../supabase';
import { deleteAccessCodesForBooking } from '../seam';
import { createAdminSession } from '../admin-auth';

const originalEnv = process.env;
beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv, ADMIN_API_SECRET: 'test-only-admin-key' };
});
afterAll(() => { process.env = originalEnv; });

it.each(['GET', 'PATCH'])('protects sibling booking %s path, including direct cancellation bypass', async method => {
  const req = new NextRequest('https://hall.example/api/admin/bookings', {
    method,
    ...(method === 'PATCH' ? { body: JSON.stringify({ bookingId: 'booking-test', action: 'cancel' }) } : {}),
  });
  const response = await (method === 'GET' ? GET(req) : PATCH(req));
  expect(response.status).toBe(401);
  expect(supabase.from).not.toHaveBeenCalled();
  expect(deleteAccessCodesForBooking).not.toHaveBeenCalled();
});

it('authenticated portal booking list still works', async () => {
  const limit = jest.fn().mockResolvedValue({ data: [], error: null });
  jest.mocked(supabase.from).mockReturnValue({ select: () => ({ order: () => ({ limit }) }) } as never);
  const response = await GET(new NextRequest('https://hall.example/api/admin/bookings', {
    headers: { Authorization: 'Bearer test-only-admin-key' },
  }));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ success: true, bookings: [] });
});

// Portable versions of the independent reviewer's scoped sibling-auth probes.
const denialCases: Array<[string, 'GET' | 'PATCH', Record<string, string>, number]> = [
  ['missing credential', 'PATCH', {}, 401],
  ['missing credential', 'GET', {}, 401],
  ['cookie without Origin', 'PATCH', { Cookie: 'SIGNED' }, 403],
  ['cross-site cookie', 'PATCH', { Cookie: 'SIGNED', Origin: 'https://attacker.example' }, 403],
  ['null Origin', 'PATCH', { Cookie: 'SIGNED', Origin: 'null' }, 403],
  ['forged cookie', 'PATCH', { Cookie: 'chh_admin_session=forged', Origin: 'https://hall.example' }, 401],
  ['bad bearer cannot use valid cookie', 'PATCH', { Cookie: 'SIGNED', Origin: 'https://hall.example', Authorization: 'Bearer wrong' }, 401],
  ['duplicate bearer', 'PATCH', { Authorization: 'Bearer test-only-admin-key, Bearer test-only-admin-key' }, 401],
];
function request(method: 'GET' | 'PATCH', headers: Record<string, string>) {
  return new NextRequest('https://hall.example/api/admin/bookings', {
    method, headers,
    ...(method === 'PATCH' ? { body: JSON.stringify({ bookingId: 'booking-test', action: 'cancel' }) } : {}),
  });
}
it.each(denialCases)('retains pre-body scoped auth denial: %s %s', async (_label, method, headers, status) => {
  const actualHeaders = { ...headers };
  if (actualHeaders.Cookie === 'SIGNED') actualHeaders.Cookie = `chh_admin_session=${createAdminSession('test-only-admin-key')}`;
  const req = request(method, actualHeaders);
  const parse = jest.spyOn(req, 'json');
  const response = await (method === 'GET' ? GET(req) : PATCH(req));
  expect(response.status).toBe(status);
  expect(parse).not.toHaveBeenCalled();
  expect(supabase.from).not.toHaveBeenCalled();
  expect(deleteAccessCodesForBooking).not.toHaveBeenCalled();
});

it('missing configuration stops sibling PATCH before parsing even with a credential', async () => {
  delete process.env.ADMIN_API_SECRET;
  const req = request('PATCH', { Authorization: 'Bearer test-only-admin-key' });
  const parse = jest.spyOn(req, 'json');
  expect((await PATCH(req)).status).toBe(503);
  expect(parse).not.toHaveBeenCalled();
  expect(supabase.from).not.toHaveBeenCalled();
  expect(deleteAccessCodesForBooking).not.toHaveBeenCalled();
});

it('valid signed same-origin cookie retains authenticated sibling PATCH behavior', async () => {
  const single = jest.fn().mockResolvedValue({ data: { id: 'booking-test', status: 'cancelled' }, error: null });
  const update = jest.fn().mockReturnValue({ eq: () => ({ select: () => ({ single }) }) });
  jest.mocked(supabase.from).mockReturnValue({ update } as never);
  const response = await PATCH(request('PATCH', {
    Cookie: `chh_admin_session=${createAdminSession('test-only-admin-key')}`, Origin: 'https://hall.example',
  }));
  expect(response.status).toBe(200);
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }));
});
