import { NextRequest } from 'next/server';

jest.mock('../database', () => ({ getBookingById: jest.fn() }));
jest.mock('../cancel-booking', () => {
  class CancelBookingError extends Error {
    constructor(message: string, public readonly status: number) { super(message); }
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
import { cancelBooking, clearCalendarEventId, deleteCalendarEvent } from '../cancel-booking';

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
