import type Stripe from 'stripe';
import type { Booking } from '../supabase';
import { NextRequest } from 'next/server';
import wireContract from '../../docs/admin-cancellation-post-effect-contract.json';

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
  jest.mocked(logEmailSent).mockReset().mockResolvedValue(undefined as never);
});
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => { process.env = originalEnv; jest.restoreAllMocks(); });

async function cancel(b = booking(), amount: number | null | 'omitted' = null) {
  jest.mocked(getBookingById).mockResolvedValue(b);
  const response = await POST(new NextRequest('https://hall.example/api/admin/cancel-booking', {
    method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId: b.id, ...(amount === 'omitted' ? {} : { refundAmount: amount }) }),
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

it('domain: database failure after verified refund must expose reconciliation, not generic failure', async () => {
  jest.mocked(updateBookingCancellation).mockRejectedValue(new Error('synthetic database unavailable'));
  const {response, body} = await cancel();
  expect(primary.refunds.create).toHaveBeenCalledTimes(1);
  expect(sendCancellationEmail).not.toHaveBeenCalled();
  process.stdout.write('DOMAIN_SPLIT_RESPONSE ' + JSON.stringify(body) + '\n');
  expect(body).toMatchObject({success: false, code: 'REFUND_RECONCILIATION_REQUIRED', stripeRefundId: 're_test'});
  expect(body.message).toMatch(/reconcil/i);
});
it('domain: null cancellation write after verified refund must not hide issued money', async () => {
  jest.mocked(updateBookingCancellation).mockResolvedValue(null);
  const {body} = await cancel();
  expect(primary.refunds.create).toHaveBeenCalledTimes(1);
  expect(sendCancellationEmail).not.toHaveBeenCalled();
  process.stdout.write('DOMAIN_SPLIT_RESPONSE ' + JSON.stringify(body) + '\n');
  expect(body).toMatchObject({success: false, code: 'REFUND_RECONCILIATION_REQUIRED', stripeRefundId: 're_test'});
});
it('domain: extra calendar failure is separately reported without undoing verified refund', async () => {
  calendarDelete.mockRejectedValue(new Error('synthetic calendar unavailable'));
  const {response, body} = await cancel();
  expect(response.status).toBe(200);
  expect(body).toMatchObject({success: true, refundIssued: true, calendarEventDeleted: false, stripeRefundId: 're_test'});
});

// Consumer-facing fields are asserted against the portable fixture, but the
// response is produced by the actual authenticated POST and production pipeline.
function noPostDbEffects() {
  expect(calendarDelete).not.toHaveBeenCalled();
  expect(supabase.from).not.toHaveBeenCalled();
  expect(revokeAccessCodesForBooking).not.toHaveBeenCalled();
  expect(sendCancellationEmail).not.toHaveBeenCalled();
  expect(logEmailSent).not.toHaveBeenCalled();
}
function oneRefundOnly(amount = 100) {
  expect(primary.refunds.create).toHaveBeenCalledTimes(1);
  expect(primary.refunds.create).toHaveBeenCalledWith(
    expect.objectContaining({ amount: amount * 100 }),
    { idempotencyKey: 'cancellation-refund:booking-test' }
  );
  expect(secondary.refunds.create).not.toHaveBeenCalled();
  expect(primary.refunds.create.mock.invocationCallOrder[0]).toBeLessThan(
    jest.mocked(updateBookingCancellation).mock.invocationCallOrder[0]
  );
}

it.each(['throw', 'null'] as const)('actual provider/client wire contract: DB %s preserves issued receipt and unknown cancellation', async failure => {
  if (failure === 'throw') jest.mocked(updateBookingCancellation).mockRejectedValue(new Error('synthetic private DB detail'));
  else jest.mocked(updateBookingCancellation).mockResolvedValue(null);
  const { response, body } = await cancel();
  expect(response.status).toBe(wireContract.httpStatus);
  expect(body).toMatchObject(wireContract.dbUnknownAfterRefund);
  expect(body.message).toMatch(/refund.*re_test.*100\.00.*cancellation.*unverified.*reconcile.*before.*retry/i);
  expect(body.message).not.toMatch(/already cancelled|private DB detail|no cancellation was performed/i);
  oneRefundOnly();
  expect(primary.paymentIntents.cancel.mock.invocationCallOrder[0]).toBeGreaterThan(primary.refunds.create.mock.invocationCallOrder[0]);
  expect(primary.paymentIntents.cancel.mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(updateBookingCancellation).mock.invocationCallOrder[0]);
  noPostDbEffects();
});

it('partial refund receipt uses actual requested cents, not DB price, after DB failure', async () => {
  jest.mocked(updateBookingCancellation).mockRejectedValue(new Error('synthetic DB failure'));
  const { response, body } = await cancel(booking(), 25);
  expect(response.status).toBe(502);
  expect(body).toMatchObject({ ...wireContract.dbUnknownAfterRefund, refundAmount: 25 });
  oneRefundOnly(25);
  noPostDbEffects();
});

it('deposit release failure never becomes a positive release claim in split receipt', async () => {
  jest.mocked(withStripeFallback).mockRejectedValue(new Error('synthetic hold failure'));
  jest.mocked(updateBookingCancellation).mockResolvedValue(null);
  const { body } = await cancel();
  expect(body).toMatchObject({ ...wireContract.dbUnknownAfterRefund, damageDepositReleased: false });
  oneRefundOnly();
  noPostDbEffects();
});

it.each(['throw', 'null'] as const)('explicit zero/DB %s reports cancellation uncertainty without inventing refund', async failure => {
  if (failure === 'throw') jest.mocked(updateBookingCancellation).mockRejectedValue(new Error('synthetic DB failure'));
  else jest.mocked(updateBookingCancellation).mockResolvedValue(null);
  const { response, body } = await cancel(booking(), 0);
  expect(response.status).toBe(502);
  expect(body).toMatchObject(wireContract.dbUnknownWithoutRefund);
  expect(primary.refunds.create).not.toHaveBeenCalled();
  expect(secondary.refunds.create).not.toHaveBeenCalled();
  noPostDbEffects();
});

it('calendar pointer DB error preserves refund and confirmed cancellation; stops later effects', async () => {
  jest.mocked(supabase.from).mockReturnValue({ update: () => ({ eq: jest.fn().mockRejectedValue(new Error('synthetic pointer failure')) }) } as never);
  const { response, body } = await cancel();
  expect(response.status).toBe(502);
  expect(body).toMatchObject(wireContract.cleanupUnknownAfterCancellation);
  oneRefundOnly();
  expect(calendarDelete).toHaveBeenCalledTimes(1);
  expect(revokeAccessCodesForBooking).not.toHaveBeenCalled();
  expect(sendCancellationEmail).not.toHaveBeenCalled();
});

it('unexpected access cleanup rejection cannot erase completed cancellation/refund', async () => {
  jest.mocked(revokeAccessCodesForBooking).mockRejectedValue(new Error('synthetic access failure'));
  const { response, body } = await cancel();
  expect(response.status).toBe(502);
  expect(body).toMatchObject(wireContract.cleanupUnknownAfterCancellation);
  oneRefundOnly();
  expect(sendCancellationEmail).not.toHaveBeenCalled();
  expect(logEmailSent).not.toHaveBeenCalled();
});

it('sent email followed by audit failure stays sent, not failed or safe to resend', async () => {
  jest.mocked(logEmailSent).mockRejectedValue(new Error('synthetic audit failure'));
  const { response, body } = await cancel();
  expect(response.status).toBe(502);
  expect(body).toMatchObject(wireContract.emailAuditFailureAfterSend);
  oneRefundOnly();
  expect(sendCancellationEmail).toHaveBeenCalledTimes(1);
  expect(logEmailSent).toHaveBeenCalledTimes(1);
  expect(logEmailSent).toHaveBeenCalledWith('booking-test', 'cancellation', 'renter@example.test', 'sent');
});

it('email timeout remains delivery-unknown, never no-email or known-failed', async () => {
  jest.mocked(sendCancellationEmail).mockRejectedValue(new Error('synthetic email timeout'));
  const { response, body } = await cancel();
  expect(response.status).toBe(502);
  expect(body).toMatchObject({ ...wireContract.cleanupUnknownAfterCancellation, cancellationEmailStatus: 'unknown' });
  oneRefundOnly();
  expect(sendCancellationEmail).toHaveBeenCalledTimes(1);
  expect(logEmailSent).not.toHaveBeenCalled();
});

it('known failed email plus audit failure remains failed, preserving refund/cancellation', async () => {
  jest.mocked(sendCancellationEmail).mockResolvedValue({ success: false, error: 'synthetic email failure' } as never);
  jest.mocked(logEmailSent).mockRejectedValue(new Error('synthetic audit failure'));
  const { response, body } = await cancel();
  expect(response.status).toBe(502);
  expect(body).toMatchObject({ ...wireContract.cleanupUnknownAfterCancellation, cancellationEmailStatus: 'failed' });
  oneRefundOnly();
  expect(logEmailSent).toHaveBeenCalledTimes(1);
});

it('ordinary success still confirms cancellation/refund and ordered single cleanup/email', async () => {
  const { response, body } = await cancel();
  expect(response.status).toBe(200);
  expect(body).toMatchObject({ success: true, refundIssued: true, refundAmount: 100, stripeRefundId: 're_test', booking: { status: 'cancelled' } });
  oneRefundOnly();
  expect(jest.mocked(updateBookingCancellation).mock.invocationCallOrder[0]).toBeLessThan(calendarDelete.mock.invocationCallOrder[0]);
  expect(calendarDelete.mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(revokeAccessCodesForBooking).mock.invocationCallOrder[0]);
  expect(jest.mocked(revokeAccessCodesForBooking).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(sendCancellationEmail).mock.invocationCallOrder[0]);
  expect(sendCancellationEmail).toHaveBeenCalledTimes(1);
});
