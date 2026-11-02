import type Stripe from 'stripe';
import type { Booking } from '../supabase';
import { NextRequest } from 'next/server';

// Exercise the production route AND pipeline; mock only external boundaries.
jest.mock('../supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('../database', () => ({ getBookingById: jest.fn(), updateBookingCancellation: jest.fn(), logEmailSent: jest.fn() }));
jest.mock('../seam', () => ({ revokeAccessCodesForBooking: jest.fn() }));
jest.mock('googleapis', () => ({ google: { auth: { GoogleAuth: jest.fn() }, calendar: jest.fn() } }));
jest.mock('../../app/lib/email', () => ({ sendCancellationEmail: jest.fn() }));
jest.mock('../stripe-accounts', () => ({
  ...jest.requireActual('../stripe-accounts'), createStripeClient: jest.fn(), withStripeFallback: jest.fn(),
}));

import { POST } from '../../app/api/admin/cancel-booking/route';
import { getBookingById, updateBookingCancellation, logEmailSent } from '../database';
import { supabase } from '../supabase';
import { google } from 'googleapis';
import { revokeAccessCodesForBooking } from '../seam';
import { sendCancellationEmail } from '../../app/lib/email';
import { createStripeClient, withStripeFallback } from '../stripe-accounts';

const originalEnv = process.env;
const secret = 'offline-only-financial-regression-credential';
function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'booking-test', booking_ref: 'CHH-TEST', customer_name: 'Test Renter', customer_email: 'renter@example.test',
    selected_date: '2026-12-01', event_type: 'Test', status: 'confirmed', payment_status: 'succeeded',
    payment_intent_id: 'pi_test_CQrvU0Yvn4', calculated_price: 100,
    damage_deposit_authorization_id: 'pi_hold_test', damage_deposit_authorization_status: 'authorized',
    calendar_event_id: 'event-test', ...overrides,
  } as Booking;
}
function charge(overrides = {}) {
  return { id: 'ch_test', amount_captured: 10000, amount_refunded: 0, currency: 'cad', paid: true, captured: true, disputed: false, ...overrides };
}
function intent(overrides = {}) {
  return { id: 'pi_test_CQrvU0Yvn4', status: 'succeeded', currency: 'cad', latest_charge: charge(), ...overrides };
}
function fakeStripe() {
  return {
    paymentIntents: { retrieve: jest.fn().mockResolvedValue(intent()), cancel: jest.fn().mockResolvedValue({}) },
    charges: { retrieve: jest.fn().mockResolvedValue(charge()) },
    refunds: { create: jest.fn().mockResolvedValue({ id: 're_test', status: 'succeeded' }) },
  };
}
let primary: ReturnType<typeof fakeStripe>;
let secondary: ReturnType<typeof fakeStripe>;
let calendarDelete: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv, ADMIN_API_SECRET: secret, STRIPE_SECRET_KEY_PRIMARY: 'test-primary-key', STRIPE_SECRET_KEY_SECONDARY: 'test-secondary-key' };
  primary = fakeStripe(); secondary = fakeStripe(); calendarDelete = jest.fn().mockResolvedValue({});
  jest.mocked(createStripeClient).mockImplementation(key => (key === 'test-primary-key' ? primary : secondary) as unknown as Stripe);
  jest.mocked(withStripeFallback).mockImplementation(fn => fn(primary as unknown as Stripe));
  (google.auth.GoogleAuth as jest.Mock).mockImplementation(() => ({ getClient: jest.fn().mockResolvedValue({}) }));
  (google.calendar as jest.Mock).mockReturnValue({ events: { delete: calendarDelete } });
  jest.mocked(supabase.from).mockReturnValue({ update: () => ({ eq: jest.fn().mockResolvedValue({}) }) } as never);
  jest.mocked(updateBookingCancellation).mockResolvedValue(booking({ status: 'cancelled' }));
  jest.mocked(revokeAccessCodesForBooking).mockResolvedValue({ revoked: 1, errors: [] });
  jest.mocked(sendCancellationEmail).mockResolvedValue({ success: true } as never);
});
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => { process.env = originalEnv; jest.restoreAllMocks(); });

async function cancel(b = booking(), amount: number | null | undefined = null) {
  jest.mocked(getBookingById).mockResolvedValue(b);
  const response = await POST(new NextRequest('https://hall.example/api/admin/cancel-booking', {
    method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId: b.id, refundAmount: amount }),
  }));
  return { response, body: await response.json() };
}
function noDownstreamEffects() {
  expect(primary.paymentIntents.cancel).not.toHaveBeenCalled();
  expect(secondary.paymentIntents.cancel).not.toHaveBeenCalled();
  expect(withStripeFallback).not.toHaveBeenCalled();
  expect(updateBookingCancellation).not.toHaveBeenCalled();
  expect(google.auth.GoogleAuth).not.toHaveBeenCalled();
  expect(google.calendar).not.toHaveBeenCalled();
  expect(calendarDelete).not.toHaveBeenCalled();
  expect(supabase.from).not.toHaveBeenCalled();
  expect(revokeAccessCodesForBooking).not.toHaveBeenCalled();
  expect(sendCancellationEmail).not.toHaveBeenCalled();
  expect(logEmailSent).not.toHaveBeenCalled();
}
function noRefundOrCancellationEffects() {
  expect(primary.refunds.create).not.toHaveBeenCalled();
  expect(secondary.refunds.create).not.toHaveBeenCalled();
  noDownstreamEffects();
}

// Independent acceptance fixtures: lost/accepted chargebacks still have disputed=true,
// even when amount_refunded=0. Missing/redacted/malformed dispute evidence is not safe.
describe.each([null, 25])('dispute guard through real route/pipeline, refund %s', amount => {
  it.each([
    ['active dispute', true], ['accepted chargeback', true], ['lost chargeback', true],
    ['missing', undefined], ['null', null], ['string false', 'false'], ['numeric false', 0],
  ])('refuses %s before refund AND every cancellation side effect', async (_label, disputed) => {
    primary.paymentIntents.retrieve.mockResolvedValue(intent({ latest_charge: charge({ disputed, amount_refunded: 0 }) }));
    const { response, body } = await cancel(booking(), amount);
    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.refundIssued).not.toBe(true);
    expect(primary.paymentIntents.retrieve).toHaveBeenCalledTimes(1);
    noRefundOrCancellationEffects();
  });
});

it('checks dispute state on an unexpanded charge, not only inline charge evidence', async () => {
  primary.paymentIntents.retrieve.mockResolvedValue(intent({ latest_charge: 'ch_test' }));
  primary.charges.retrieve.mockResolvedValue(charge({ disputed: true }));
  const { response } = await cancel();
  expect(response.status).toBe(409);
  expect(primary.charges.retrieve).toHaveBeenCalledWith('ch_test');
  noRefundOrCancellationEffects();
});

it('explicitly undisputed successful charge/refund still completes cleanup and records only verified refund', async () => {
  const { response, body } = await cancel();
  expect(response.status).toBe(200);
  expect(body).toMatchObject({ success: true, refundIssued: true, refundAmount: 100, stripeRefundId: 're_test' });
  expect(primary.refunds.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 10000 }), { idempotencyKey: 'cancellation-refund:booking-test' });
  expect(updateBookingCancellation).toHaveBeenCalledWith('booking-test', expect.objectContaining({ refundAmount: 100, stripeRefundId: 're_test' }));
  expect(primary.paymentIntents.cancel).toHaveBeenCalledWith('pi_hold_test');
  expect(calendarDelete).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'event-test' }));
  expect(revokeAccessCodesForBooking).toHaveBeenCalledTimes(1);
  expect(sendCancellationEmail).toHaveBeenCalledWith(expect.objectContaining({ refundAmount: 100 }), expect.anything());
});
