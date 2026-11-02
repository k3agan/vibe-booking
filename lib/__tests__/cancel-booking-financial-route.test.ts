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

it.each(['failed', 'canceled', 'pending', 'requires_action', null, undefined, 'unknown', 'SUCCEEDED', true, {}])(
  'refund status %s cannot become successful-refund records, messages or cleanup', async status => {
    primary.refunds.create.mockResolvedValue({ id: 're_test', status } as never);
    const { response, body } = await cancel(booking(), 25);
    expect(response.status).toBe(502);
    expect(body).toMatchObject({ success: false, code: 'REFUND_RECONCILIATION_REQUIRED', stripeRefundId: 're_test' });
    expect(body.refundIssued).not.toBe(true);
    expect(body.message).toMatch(/reconcile/i);
    expect(body.message).toMatch(/may already exist/i);
    // A Stripe write DID happen: do not mislabel this as a no-external-effect refusal.
    expect(primary.refunds.create).toHaveBeenCalledTimes(1);
    expect(primary.refunds.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 2500 }), { idempotencyKey: 'cancellation-refund:booking-test' });
    expect(secondary.refunds.create).not.toHaveBeenCalled();
    noDownstreamEffects();
  }
);

it.each([null, undefined, {}, { status: 'succeeded' }, { id: '', status: 'succeeded' }])(
  'malformed refund result %s fails closed with truthful reconciliation language', async result => {
    primary.refunds.create.mockResolvedValue(result as never);
    const { response, body } = await cancel();
    expect(response.status).toBe(502);
    expect(body).toMatchObject({ success: false, code: 'REFUND_RECONCILIATION_REQUIRED' });
    expect(body.refundIssued).not.toBe(true);
    expect(body.message).toMatch(/may already exist.*reconcile/i);
    expect(primary.refunds.create).toHaveBeenCalledTimes(1);
    expect(secondary.refunds.create).not.toHaveBeenCalled();
    noDownstreamEffects();
  }
);

describe.each(['pending', 'failed', 'refunded', null, undefined, 'cancelled', 'comped'])('recorded rental PI with stale DB payment_status %s', payment_status => {
  it.each([null, 25, 'omitted'] as const)('uses actual PRIMARY Stripe balance for refund %s, not the DB flag', async amount => {
    primary.paymentIntents.retrieve.mockResolvedValue(intent({ latest_charge: charge({ amount_refunded: 2500 }) }));
    const { response, body } = await cancel(booking({ payment_status } as never), amount);
    const expected = amount === 25 ? 25 : 75;
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, refundIssued: true, refundAmount: expected });
    expect(primary.paymentIntents.retrieve).toHaveBeenCalledWith('pi_test_CQrvU0Yvn4', { expand: ['latest_charge'] });
    expect(primary.refunds.create).toHaveBeenCalledWith(expect.objectContaining({ amount: expected * 100 }), { idempotencyKey: 'cancellation-refund:booking-test' });
    expect(updateBookingCancellation).toHaveBeenCalledWith('booking-test', expect.objectContaining({ refundAmount: expected, stripeRefundId: 're_test' }));
    expect(sendCancellationEmail).toHaveBeenCalledWith(expect.objectContaining({ refundAmount: expected }), expect.anything());
  });

  it.each([null, 25, 'omitted'] as const)('cannot bypass SECONDARY refund refusal for request %s', async amount => {
    const { response, body } = await cancel(booking({ payment_status, payment_intent_id: 'pi_test_JAT5KpLHRq' } as never), amount);
    expect(response.status).toBe(409);
    expect(body).toMatchObject({ success: false, code: 'SECONDARY_ACCOUNT_REFUND_REFUSED', customerEmail: 'renter@example.test' });
    expect(createStripeClient).not.toHaveBeenCalled();
    noRefundOrCancellationEffects();
  });

  it('unreadable recorded payment is an error, not evidence of no payment/default free cancellation', async () => {
    primary.paymentIntents.retrieve.mockRejectedValue(new Error('offline lookup unavailable'));
    const { response, body } = await cancel(booking({ payment_status } as never));
    expect(response.status).toBe(502);
    expect(body.success).toBe(false);
    expect(body.refundIssued).not.toBe(true);
    expect(primary.paymentIntents.retrieve).toHaveBeenCalledTimes(1);
    noRefundOrCancellationEffects();
  });

  it.each(['pi_test_CQrvU0Yvn4', 'pi_test_JAT5KpLHRq', null])('explicit zero remains an intentional no-rental-refund cancellation (%s)', async payment_intent_id => {
    const { response, body } = await cancel(booking({ payment_status, payment_intent_id } as never), 0);
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, refundIssued: false, refundAmount: null, stripeRefundId: null });
    expect(createStripeClient).not.toHaveBeenCalled();
    expect(primary.paymentIntents.retrieve).not.toHaveBeenCalled();
    expect(primary.refunds.create).not.toHaveBeenCalled();
    expect(secondary.refunds.create).not.toHaveBeenCalled();
    expect(updateBookingCancellation).toHaveBeenCalledWith('booking-test', expect.objectContaining({ refundAmount: null, stripeRefundId: null }));
    expect(primary.paymentIntents.cancel).toHaveBeenCalledWith('pi_hold_test');
    expect(calendarDelete).toHaveBeenCalledTimes(1);
    expect(revokeAccessCodesForBooking).toHaveBeenCalledTimes(1);
    expect(sendCancellationEmail).toHaveBeenCalledWith(expect.objectContaining({ refundAmount: null }), expect.anything());
  });
});

it.each(['succeeded', 'pending', 'failed', 'refunded', null, undefined, 'cancelled'])('missing rental evidence with DB status %s cannot become a default free cancellation', async payment_status => {
  const { response, body } = await cancel(booking({ payment_status, payment_intent_id: null } as never));
  expect(response.status).toBe(409);
  expect(body.success).toBe(false);
  expect(createStripeClient).not.toHaveBeenCalled();
  noRefundOrCancellationEffects();
});

it.each([null, 25, 'omitted'] as const)('missing Stripe charge evidence cannot become cancellation success for request %s', async amount => {
  primary.paymentIntents.retrieve.mockResolvedValue(intent({ latest_charge: null }));
  const { response } = await cancel(booking({ payment_status: 'pending' }), amount);
  expect(response.status).toBe(409);
  noRefundOrCancellationEffects();
});

it.each([undefined, '', 'pi_wrong_CQrvU0Yvn4'])('unverifiable/mismatched returned rental identity %s fails before refund', async id => {
  primary.paymentIntents.retrieve.mockResolvedValue(intent({ id }));
  const { response } = await cancel(booking({ payment_status: 'pending' }));
  expect(response.status).toBe(409);
  noRefundOrCancellationEffects();
});

it.each([null, 'omitted'] as const)('truly comped booking with no recorded rental PI retains legitimate no-refund cancellation (%s)', async amount => {
  const { response, body } = await cancel(booking({ payment_status: 'comped', payment_intent_id: null, damage_deposit_authorization_id: undefined }), amount);
  expect(response.status).toBe(200);
  expect(body).toMatchObject({ success: true, refundIssued: false, refundAmount: null, stripeRefundId: null });
  expect(createStripeClient).not.toHaveBeenCalled();
  expect(withStripeFallback).not.toHaveBeenCalled();
  expect(primary.refunds.create).not.toHaveBeenCalled();
  expect(updateBookingCancellation).toHaveBeenCalledWith('booking-test', expect.objectContaining({ refundAmount: null, stripeRefundId: null }));
  expect(sendCancellationEmail).toHaveBeenCalledWith(expect.objectContaining({ refundAmount: null }), expect.anything());
});

it.each(['succeeded', 'pending', 'failed', 'comped', null])('positive request with no rental evidence is refused, including comped (%s)', async payment_status => {
  const { response } = await cancel(booking({ payment_status, payment_intent_id: null } as never), 25);
  expect(response.status).toBe(409);
  expect(createStripeClient).not.toHaveBeenCalled();
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
