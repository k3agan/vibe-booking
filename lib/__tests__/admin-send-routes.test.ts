import { NextRequest } from 'next/server';
jest.mock('../database', () => ({
  getUpcomingBookings: jest.fn(),
  getCompletedBookings: jest.fn(),
  markReminderSent: jest.fn(),
  markFollowUpSent: jest.fn(),
  logEmailSent: jest.fn(),
}));
jest.mock('../seam', () => ({ createAccessCode: jest.fn(), sendAdminAlert: jest.fn() }));
jest.mock('../../app/lib/email', () => ({ sendEventReminder: jest.fn(), sendPostEventFollowUp: jest.fn() }));
import * as reminders from '../../app/api/admin/send-reminders/route';
import * as followups from '../../app/api/admin/send-followups/route';
import { getUpcomingBookings, getCompletedBookings } from '../database';
import { createAccessCode } from '../seam';
import { sendEventReminder, sendPostEventFollowUp } from '../../app/lib/email';

const originalEnv = process.env;
beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv, ADMIN_API_SECRET: 'test-only-admin-key' };
});
afterAll(() => { process.env = originalEnv; });

const cases: Array<[string, any, 'GET' | 'POST']> = [
  ['send-reminders', reminders, 'GET'],
  ['send-reminders', reminders, 'POST'],
  ['send-followups', followups, 'GET'],
  ['send-followups', followups, 'POST'],
];

it.each(cases)('%s %s rejects unauthenticated requests before any work', async (name, mod, method) => {
  const res = await mod[method](new NextRequest(`https://hall.example/api/admin/${name}`, { method }));
  expect(res.status).toBe(401);
  expect(getUpcomingBookings).not.toHaveBeenCalled();
  expect(getCompletedBookings).not.toHaveBeenCalled();
  expect(createAccessCode).not.toHaveBeenCalled();
  expect(sendEventReminder).not.toHaveBeenCalled();
  expect(sendPostEventFollowUp).not.toHaveBeenCalled();
});

it.each(cases)('%s %s rejects a wrong bearer secret', async (name, mod, method) => {
  const res = await mod[method](new NextRequest(`https://hall.example/api/admin/${name}`, {
    method, headers: { Authorization: 'Bearer wrong' },
  }));
  expect(res.status).toBe(401);
  expect(getUpcomingBookings).not.toHaveBeenCalled();
});

it.each(cases)('%s %s fails closed (503) when ADMIN_API_SECRET is unset', async (name, mod, method) => {
  delete process.env.ADMIN_API_SECRET;
  const res = await mod[method](new NextRequest(`https://hall.example/api/admin/${name}`, { method }));
  expect(res.status).toBe(503);
  expect(getUpcomingBookings).not.toHaveBeenCalled();
});

it('authenticated GET still lists bookings', async () => {
  jest.mocked(getUpcomingBookings).mockResolvedValue([]);
  const res = await reminders.GET(new NextRequest('https://hall.example/api/admin/send-reminders', {
    headers: { Authorization: 'Bearer test-only-admin-key' },
  }));
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ success: true });
  expect(getUpcomingBookings).toHaveBeenCalled();
});

it('authenticated POST with nothing due sends nothing', async () => {
  jest.mocked(getCompletedBookings).mockResolvedValue([]);
  const res = await followups.POST(new NextRequest('https://hall.example/api/admin/send-followups', {
    method: 'POST', headers: { Authorization: 'Bearer test-only-admin-key' },
  }));
  expect(res.status).toBe(200);
  expect(sendPostEventFollowUp).not.toHaveBeenCalled();
});
