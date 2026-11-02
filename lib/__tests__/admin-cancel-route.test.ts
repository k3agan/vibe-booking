import { NextRequest } from 'next/server';

jest.mock('../database', () => ({ getBookingById: jest.fn() }));
jest.mock('../cancel-booking', () => {
  class CancelBookingError extends Error {
    constructor(message: string, public readonly status: number, public readonly details?: { code: string; customerEmail: string }) { super(message); }
  }
  return {
    CancelBookingError,
    cancelBooking: jest.fn(),
    clearCalendarEventId: jest.fn(),
    deleteCalendarEvent: jest.fn(),
  };
});

import { POST } from '../../app/api/admin/cancel-booking/route';
import { getBookingById } from '../database';
import { cancelBooking, CancelBookingError, clearCalendarEventId, deleteCalendarEvent } from '../cancel-booking';
import { createAdminSession } from '../admin-auth';

const originalEnv = process.env;
const secret = 'test-only-admin-credential';
function request(authorization?: string, body = JSON.stringify({ bookingId: 'booking-test' })) {
  return new NextRequest('https://hall.example/api/admin/cancel-booking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: authorization } : {}) },
    body,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv, ADMIN_API_SECRET: secret };
  jest.mocked(getBookingById).mockResolvedValue(null);
});
afterAll(() => { process.env = originalEnv; });

it.each([undefined, 'Bearer wrong', 'Basic wrong', 'Bearer ', `Bearer ${secret}extra`])(
  'rejects unauthorized caller %s before reading booking/body or invoking any side effect', async (authorization) => {
    const response = await POST(request(authorization, 'not-json'));
    expect(response.status).toBe(401);
    expect(getBookingById).not.toHaveBeenCalled();
    expect(cancelBooking).not.toHaveBeenCalled();
    expect(deleteCalendarEvent).not.toHaveBeenCalled();
    expect(clearCalendarEventId).not.toHaveBeenCalled();
  }
);

it('fails closed when the server secret is not configured', async () => {
  delete process.env.ADMIN_API_SECRET;
  process.env.CRON_SECRET = secret; // no implicit cron-credential fallback
  const response = await POST(request(`Bearer ${secret}`));
  expect(response.status).toBe(503);
  expect(getBookingById).not.toHaveBeenCalled();
  expect(await response.text()).not.toContain(secret);
});

it('accepts the dedicated bearer credential and continues normal validation', async () => {
  const response = await POST(request(`Bearer ${secret}`));
  expect(response.status).toBe(404);
  expect(getBookingById).toHaveBeenCalledWith('booking-test');
});

it('requires authentication even for already-cancelled calendar backfill', async () => {
  jest.mocked(getBookingById).mockResolvedValue({ status: 'cancelled', calendar_event_id: 'event-test' } as never);
  const response = await POST(request());
  expect(response.status).toBe(401);
  expect(deleteCalendarEvent).not.toHaveBeenCalled();
});

it.each([
  { bookingId: ['booking-test'] }, { bookingId: ' ' },
  { bookingId: 'booking-test', refundAmount: '20' },
  { bookingId: 'booking-test', refundAmount: '' },
  { bookingId: 'booking-test', refundAmount: false },
  { bookingId: 'booking-test', refundAmount: {} },
  { bookingId: 'booking-test', refundAmount: -1 },
  { bookingId: 'booking-test', refundAmount: 1.005 },
  { bookingId: 'booking-test', cancellationReason: {} },
  null, [],
])('rejects malformed authenticated payload before booking lookup: %s', async body => {
  const response = await POST(request(`Bearer ${secret}`, JSON.stringify(body)));
  expect(response.status).toBe(400);
  expect(getBookingById).not.toHaveBeenCalled();
  expect(cancelBooking).not.toHaveBeenCalled();
});

it('returns structured secondary-account routing details only to an authenticated caller', async () => {
  jest.mocked(getBookingById).mockResolvedValue({ id: 'booking-test', status: 'confirmed' } as never);
  jest.mocked(cancelBooking).mockRejectedValue(new CancelBookingError('Secondary refund refused', 409, {
    code: 'SECONDARY_ACCOUNT_REFUND_REFUSED', customerEmail: 'renter@example.test',
  }));
  const response = await POST(request(`Bearer ${secret}`));
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({
    success: false, message: 'Secondary refund refused',
    code: 'SECONDARY_ACCOUNT_REFUND_REFUSED', customerEmail: 'renter@example.test',
  });
});

it('authenticated malformed JSON returns a client error, not a server error', async () => {
  expect((await POST(request(`Bearer ${secret}`, 'invalid-json'))).status).toBe(400);
  expect(getBookingById).not.toHaveBeenCalled();
});

it('accepts portal session cancellation end-to-end but rejects a cross-origin attempt before lookup', async () => {
  for (const origin of ['https://attacker.example', 'https://hall.example']) {
    jest.mocked(getBookingById).mockClear();
    const req = new NextRequest('https://hall.example/api/admin/cancel-booking', {
      method: 'POST', headers: { Origin: origin, Cookie: `chh_admin_session=${createAdminSession(secret)}` },
      body: JSON.stringify({ bookingId: 'booking-test' }),
    });
    const response = await POST(req);
    expect(response.status).toBe(origin.includes('attacker') ? 403 : 404);
    expect(getBookingById).toHaveBeenCalledTimes(origin.includes('attacker') ? 0 : 1);
  }
});
