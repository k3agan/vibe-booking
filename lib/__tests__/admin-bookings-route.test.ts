import { NextRequest } from 'next/server';
jest.mock('../supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('../seam', () => ({ deleteAccessCodesForBooking: jest.fn() }));
import { GET, PATCH } from '../../app/api/admin/bookings/route';
import { supabase } from '../supabase';
import { deleteAccessCodesForBooking } from '../seam';

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
