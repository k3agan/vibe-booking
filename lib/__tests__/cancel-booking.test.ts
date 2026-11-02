import type { Booking } from '../supabase';
import type Stripe from 'stripe';

jest.mock('../supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('../database', () => ({ updateBookingCancellation: jest.fn(), logEmailSent: jest.fn() }));
jest.mock('../seam', () => ({ revokeAccessCodesForBooking: jest.fn() }));
jest.mock('googleapis', () => ({ google: { auth: { GoogleAuth: jest.fn() }, calendar: jest.fn() } }));
jest.mock('../../app/lib/email', () => ({ sendCancellationEmail: jest.fn() }));
jest.mock('../stripe-accounts', () => ({
  ...jest.requireActual('../stripe-accounts'),
  createStripeClient: jest.fn(),
  withStripeFallback: jest.fn(),
}));

import { cancelBooking } from '../cancel-booking';
import { updateBookingCancellation } from '../database';
import { revokeAccessCodesForBooking } from '../seam';
import { sendCancellationEmail } from '../../app/lib/email';
import { createStripeClient, withStripeFallback } from '../stripe-accounts';

const originalEnv = process.env;
const booking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'booking-test', booking_ref: 'CHH-TEST', customer_name: 'Test Renter', customer_email: 'renter@example.test',
  selected_date: '2026-12-01', event_type: 'Test', status: 'confirmed', payment_status: 'succeeded',
  payment_intent_id: 'pi_test_CQrvU0Yvn4', calculated_price: 100, ...overrides,
} as Booking);
const options = (refundAmount: number | null) => ({ refundAmount, cancellationReason: null, cancelledBy: 'admin' });
const charge = (overrides = {}) => ({ id: 'ch_test', amount_captured: 10000, amount_refunded: 0, currency: 'cad', paid: true, captured: true, ...overrides });
function fakeStripe() {
  return {
    paymentIntents: {
      retrieve: jest.fn().mockResolvedValue({ id: 'pi_test_CQrvU0Yvn4', status: 'succeeded', currency: 'cad', latest_charge: charge() }),
      cancel: jest.fn().mockResolvedValue({}),
    },
    charges: { retrieve: jest.fn().mockResolvedValue(charge()) },
    refunds: { create: jest.fn().mockResolvedValue({ id: 're_test', status: 'succeeded' }) },
  };
}
let primary: ReturnType<typeof fakeStripe>;
let secondary: ReturnType<typeof fakeStripe>;
function noCancellationEffects() {
  expect(primary.refunds.create).not.toHaveBeenCalled();
  expect(secondary.refunds.create).not.toHaveBeenCalled();
  expect(primary.paymentIntents.cancel).not.toHaveBeenCalled();
  expect(updateBookingCancellation).not.toHaveBeenCalled();
  expect(revokeAccessCodesForBooking).not.toHaveBeenCalled();
  expect(sendCancellationEmail).not.toHaveBeenCalled();
}
beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv, STRIPE_SECRET_KEY_PRIMARY: 'test-primary-key', STRIPE_SECRET_KEY_SECONDARY: 'test-secondary-key' };
  primary = fakeStripe(); secondary = fakeStripe();
  jest.mocked(createStripeClient).mockImplementation(key => (key === 'test-primary-key' ? primary : secondary) as unknown as Stripe);
  jest.mocked(withStripeFallback).mockImplementation(fn => fn(primary as unknown as Stripe));
  jest.mocked(updateBookingCancellation).mockResolvedValue(booking({ status: 'cancelled' }));
  jest.mocked(revokeAccessCodesForBooking).mockResolvedValue({ revoked: 1, errors: [] });
  jest.mocked(sendCancellationEmail).mockResolvedValue({ success: true } as never);
});
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => { process.env = originalEnv; jest.restoreAllMocks(); });

it.each([null, 25])('refuses secondary rental PI refund %s with renter routing details before any writes', async (amount) => {
  await expect(cancelBooking(booking({ payment_intent_id: 'pi_test_JAT5KpLHRq', stripe_account: 'primary' }), options(amount)))
    .rejects.toMatchObject({ status: 409, details: { code: 'SECONDARY_ACCOUNT_REFUND_REFUSED', customerEmail: 'renter@example.test' } });
  noCancellationEffects();
  expect(createStripeClient).not.toHaveBeenCalled();
});

it('allows explicit zero-refund secondary cancellation for deposit decline with no Stripe rental calls', async () => {
  const result = await cancelBooking(booking({ payment_intent_id: 'pi_test_JAT5KpLHRq' }), options(0));
  expect(result.stripeRefundId).toBeNull();
  expect(createStripeClient).not.toHaveBeenCalled();
  expect(primary.refunds.create).not.toHaveBeenCalled();
  expect(updateBookingCancellation).toHaveBeenCalled();
});

it('uses the rental PI, not a secondary saved card/stored label, to choose refund ownership', async () => {
  await cancelBooking(booking({ stripe_account: 'secondary', payment_method_id: 'pm_test_JAT5KpLHRq' }), options(25));
  expect(primary.paymentIntents.retrieve).toHaveBeenCalledWith('pi_test_CQrvU0Yvn4', { expand: ['latest_charge'] });
  expect(primary.refunds.create).toHaveBeenCalledTimes(1);
  expect(secondary.refunds.create).not.toHaveBeenCalled();
});

it('defaults full refund to remaining captured cents after an existing partial refund, not DB price', async () => {
  primary.paymentIntents.retrieve.mockResolvedValue({ id: 'pi_test_CQrvU0Yvn4', status: 'succeeded', currency: 'cad', latest_charge: charge({ amount_captured: 12000, amount_refunded: 3501 }) });
  const result = await cancelBooking(booking({ calculated_price: 999 }), options(null));
  expect(result.refundAmount).toBe(84.99);
  expect(primary.refunds.create).toHaveBeenCalledWith(
    expect.objectContaining({ payment_intent: 'pi_test_CQrvU0Yvn4', amount: 8499 }),
    { idempotencyKey: 'cancellation-refund:booking-test' }
  );
});

it('allows amounts above stale DB price when Stripe captured enough', async () => {
  await cancelBooking(booking({ calculated_price: 10 }), options(50));
  expect(primary.refunds.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 5000 }), expect.anything());
});

it('rejects refund above remaining Stripe balance before any cancellation side effects', async () => {
  primary.paymentIntents.retrieve.mockResolvedValue({ id: 'pi_test_CQrvU0Yvn4', status: 'succeeded', currency: 'cad', latest_charge: charge({ amount_refunded: 7500 }) });
  await expect(cancelBooking(booking(), options(25.01))).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/remaining.*25\.00/i) });
  noCancellationEffects();
});

it('rejects full refund when the rental is already fully refunded (explicit zero remains available)', async () => {
  primary.paymentIntents.retrieve.mockResolvedValue({ id: 'pi_test_CQrvU0Yvn4', status: 'succeeded', currency: 'cad', latest_charge: charge({ amount_refunded: 10000 }) });
  await expect(cancelBooking(booking(), options(null))).rejects.toMatchObject({ status: 409 });
  noCancellationEffects();
});

it('retrieves an unexpanded charge before checking refunds', async () => {
  primary.paymentIntents.retrieve.mockResolvedValue({ id: 'pi_test_CQrvU0Yvn4', status: 'succeeded', currency: 'cad', latest_charge: 'ch_test' } as never);
  await cancelBooking(booking(), options(10));
  expect(primary.charges.retrieve).toHaveBeenCalledWith('ch_test');
});

it.each([NaN, Infinity, -1, 1.005, '20', '', false, {}, 9007199254740991])('rejects invalid monetary input %s before any work', async amount => {
  await expect(cancelBooking(booking(), options(amount as number))).rejects.toMatchObject({ status: 400 });
  noCancellationEffects();
  expect(createStripeClient).not.toHaveBeenCalled();
});

it.each([
  { amount_refunded: -1 }, { amount_refunded: 10001 }, { amount_captured: NaN },
  { currency: 'usd' }, { captured: false }, { paid: false }, { amount_refunded: 1.5 },
])('fails closed on invalid/unusable Stripe charge state %s', async overrides => {
  primary.paymentIntents.retrieve.mockResolvedValue({ id: 'pi_test_CQrvU0Yvn4', status: 'succeeded', currency: 'cad', latest_charge: charge(overrides) });
  await expect(cancelBooking(booking(), options(10))).rejects.toMatchObject({ status: 409 });
  noCancellationEffects();
});

it.each(['processing', 'requires_capture'])('refuses non-succeeded PI state %s', async status => {
  primary.paymentIntents.retrieve.mockResolvedValue({ id: 'pi_test_CQrvU0Yvn4', status, currency: 'cad', latest_charge: charge() });
  await expect(cancelBooking(booking(), options(10))).rejects.toMatchObject({ status: 409 });
  noCancellationEffects();
});

it('refuses refund if no rental PI is recorded', async () => {
  await expect(cancelBooking(booking({ payment_intent_id: null }), options(null))).rejects.toMatchObject({ status: 409 });
  noCancellationEffects();
});

it('requires explicitly configured PRIMARY credentials rather than an ambiguous rotated legacy key', async () => {
  delete process.env.STRIPE_SECRET_KEY_PRIMARY;
  process.env.STRIPE_SECRET_KEY = 'test-secondary-key';
  await expect(cancelBooking(booking(), options(10))).rejects.toMatchObject({ status: 503 });
  noCancellationEffects();
});

it('unknown PI found only on secondary is read-only refused, never retried as a refund there', async () => {
  primary.paymentIntents.retrieve.mockRejectedValue({ code: 'resource_missing' });
  await expect(cancelBooking(booking({ payment_intent_id: 'pi_unknown' }), options(10)))
    .rejects.toMatchObject({ status: 409, details: { code: 'SECONDARY_ACCOUNT_REFUND_REFUSED', customerEmail: 'renter@example.test' } });
  expect(secondary.paymentIntents.retrieve).toHaveBeenCalledWith('pi_unknown');
  noCancellationEffects();
});

it('does not probe/refund secondary on primary API failure', async () => {
  primary.paymentIntents.retrieve.mockRejectedValue(new Error('test Stripe unavailable'));
  await expect(cancelBooking(booking(), options(10))).rejects.toMatchObject({ status: 502 });
  expect(secondary.paymentIntents.retrieve).not.toHaveBeenCalled();
  noCancellationEffects();
});

it('Stripe refund failure cannot fall through to cancellation or secondary writes', async () => {
  primary.refunds.create.mockRejectedValue({ code: 'charge_already_refunded' });
  await expect(cancelBooking(booking(), options(10))).rejects.toMatchObject({ status: 502 });
  expect(secondary.refunds.create).not.toHaveBeenCalled();
  expect(updateBookingCancellation).not.toHaveBeenCalled();
  expect(sendCancellationEmail).not.toHaveBeenCalled();
});

it('zero-refund path still releases a saved hold across accounts and continues cleanup', async () => {
  await cancelBooking(booking({ damage_deposit_authorization_id: 'pi_hold_JAT5KpLHRq', damage_deposit_authorization_status: 'authorized' }), options(0));
  expect(primary.paymentIntents.cancel).toHaveBeenCalledWith('pi_hold_JAT5KpLHRq');
  expect(primary.refunds.create).not.toHaveBeenCalled();
  expect(revokeAccessCodesForBooking).toHaveBeenCalled();
  expect(sendCancellationEmail).toHaveBeenCalled();
});
