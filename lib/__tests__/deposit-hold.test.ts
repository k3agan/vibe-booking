/**
 * processDepositHold with every external dependency mocked (no Stripe, Supabase,
 * Seam, Google or Resend calls). Verifies policy 2026-10-31-01 end to end:
 * decline → cancel with NO refund; system failure → never cancel; idempotency.
 */
import Stripe from 'stripe';
import type { Booking } from '../supabase';

jest.mock('../database', () => ({
  claimDamageDepositAttempt: jest.fn(),
  getBookingById: jest.fn(),
  logEmailSent: jest.fn(),
  markDamageDepositAuthorized: jest.fn(),
  recordDamageDepositAttempt: jest.fn(),
}));
jest.mock('../stripe-accounts', () => ({
  stripeSecretKeyFor: jest.fn((account: string) => (account === 'primary' ? 'sk_P' : 'sk_S')),
  createStripeClient: jest.fn(),
}));
jest.mock('../cancel-booking', () => {
  class CancelBookingError extends Error {
    constructor(message: string, public readonly status: number) {
      super(message);
    }
  }
  return { cancelBooking: jest.fn(), CancelBookingError };
});
jest.mock('../../app/lib/email', () => ({
  alertDetailsTable: jest.fn(() => '<table></table>'),
  sendAdminAlertEmail: jest.fn().mockResolvedValue({ success: true }),
  sendDamageDepositAuthNotification: jest.fn().mockResolvedValue({ success: true }),
}));

import * as db from '../database';
import { createStripeClient, stripeSecretKeyFor } from '../stripe-accounts';
import { cancelBooking, CancelBookingError } from '../cancel-booking';
import { sendAdminAlertEmail, sendDamageDepositAuthNotification } from '../../app/lib/email';
import { processDepositHold } from '../deposit-hold';

const m = <T extends (...args: never[]) => unknown>(fn: T) => fn as unknown as jest.Mock;

const ctx = { today: '2026-10-31', startOfTodayIso: '2026-10-31T07:00:00.000Z' };

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'booking-1',
    booking_ref: 'CHH-1',
    customer_name: 'Pat Renter',
    customer_email: 'pat@example.com',
    customer_phone: '555',
    event_type: 'Party',
    guest_count: 50,
    selected_date: '2026-11-02',
    start_time: '18:00',
    end_time: '22:00',
    booking_type: 'hourly',
    duration: 4,
    calculated_price: 650,
    payment_intent_id: 'pi_rental_CQrvU0Yvn4',
    payment_status: 'succeeded',
    status: 'confirmed',
    created_at: '',
    updated_at: '',
    reminder_sent: false,
    followup_sent: false,
    payment_method_id: 'pm_1AbcCQrvU0Yvn4xyz',
    damage_deposit_amount: 325,
    damage_deposit_authorization_status: 'pending',
    ...overrides,
  } as Booking;
}

function fakeStripe(customer: string | null = 'cus_X') {
  return {
    paymentMethods: { retrieve: jest.fn().mockResolvedValue({ id: 'pm', customer }) },
    paymentIntents: {
      create: jest.fn(),
      cancel: jest.fn().mockResolvedValue({}),
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const resourceMissing = () => new Stripe.errors.StripeInvalidRequestError({ type: 'invalid_request_error', code: 'resource_missing', statusCode: 404, message: "No such PaymentMethod: 'pm_1'" } as any);

// `stripe` = PRIMARY account client (owner of pm_…CQrvU0Yvn4…), `other` = SECONDARY.
let stripe: ReturnType<typeof fakeStripe>;
let other: ReturnType<typeof fakeStripe>;
const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ORIGINAL_ENV };
  delete process.env.DEPOSIT_DECLINE_AUTOCANCEL;
  stripe = fakeStripe('cus_PRIMARY');
  other = fakeStripe('cus_SECONDARY');
  other.paymentMethods.retrieve.mockRejectedValue(resourceMissing());
  m(stripeSecretKeyFor).mockImplementation((a: string) => (a === 'primary' ? 'sk_P' : 'sk_S'));
  m(createStripeClient).mockImplementation((key: string) => (key === 'sk_P' ? stripe : other));
  m(db.claimDamageDepositAttempt).mockImplementation(async () => ({ state: 'claimed', booking: makeBooking() }));
  m(db.markDamageDepositAuthorized).mockImplementation(async () => makeBooking({ damage_deposit_authorization_status: 'authorized' }));
  m(cancelBooking).mockResolvedValue({
    booking: makeBooking({ status: 'cancelled' }),
    refundAmount: null,
    stripeRefundId: null,
    damageDepositReleased: false,
    calendarEventDeleted: true,
    accessCodes: { revoked: 2, errors: [] },
    cancellationEmailSent: true,
  });
});

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
  jest.restoreAllMocks();
});

const declineError = () =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new Stripe.errors.StripeCardError({
    type: 'card_error',
    code: 'card_declined',
    decline_code: 'insufficient_funds',
    message: 'Your card has insufficient funds.',
    payment_intent: { id: 'pi_dep_1', status: 'requires_payment_method' },
  } as any);

describe('successful hold', () => {
  it('holds on the account that owns the card, with customer + per-day idempotency key', async () => {
    stripe.paymentIntents.create.mockResolvedValue({ id: 'pi_dep_ok', status: 'requires_capture' });

    const r = await processDepositHold(makeBooking(), ctx);

    expect(r.outcome).toBe('authorized');
    expect(r.stripe_account).toBe('PRIMARY');
    expect(createStripeClient).toHaveBeenCalledTimes(1); // owner account only, no fallback needed
    expect(stripe.paymentMethods.retrieve).toHaveBeenCalledWith('pm_1AbcCQrvU0Yvn4xyz');
    const [params, opts] = stripe.paymentIntents.create.mock.calls[0];
    expect(params).toMatchObject({
      amount: 32500,
      currency: 'cad',
      customer: 'cus_PRIMARY',
      payment_method: 'pm_1AbcCQrvU0Yvn4xyz',
      capture_method: 'manual',
      confirm: true,
      off_session: true,
      metadata: { booking_id: 'booking-1', type: 'damage_deposit', attempt_date: '2026-10-31', stripe_account: 'primary' },
    });
    expect(opts).toEqual({ idempotencyKey: 'deposit-hold:booking-1:2026-10-31' });
    expect(db.markDamageDepositAuthorized).toHaveBeenCalledWith('booking-1', 'pi_dep_ok');
    expect(db.recordDamageDepositAttempt).toHaveBeenCalledWith('booking-1', null, 'PRIMARY');
    expect(sendDamageDepositAuthNotification).toHaveBeenCalledTimes(1);
    expect(cancelBooking).not.toHaveBeenCalled();
    expect(sendAdminAlertEmail).not.toHaveBeenCalled();
  });

  it('omits customer when the card is not attached to one', async () => {
    stripe.paymentMethods.retrieve.mockResolvedValue({ id: 'pm_x', customer: null });
    stripe.paymentIntents.create.mockResolvedValue({ id: 'pi_ok', status: 'requires_capture' });
    await processDepositHold(makeBooking(), ctx);
    expect(stripe.paymentIntents.create.mock.calls[0][0]).not.toHaveProperty('customer');
  });

  it('does not email the renter twice if another run already recorded the hold', async () => {
    stripe.paymentIntents.create.mockResolvedValue({ id: 'pi_dep_ok', status: 'requires_capture' });
    m(db.markDamageDepositAuthorized).mockResolvedValue(null);
    const r = await processDepositHold(makeBooking(), ctx);
    expect(r.outcome).toBe('authorized');
    expect(sendDamageDepositAuthNotification).not.toHaveBeenCalled();
  });
});

describe('renter decline → cancel, no refund', () => {
  it('cancels the booking with refundAmount 0, cancels the failed PI, alerts admins', async () => {
    stripe.paymentIntents.create.mockRejectedValue(declineError());

    const r = await processDepositHold(makeBooking(), ctx);

    expect(r.outcome).toBe('declined_cancelled');
    expect(r.code).toBe('insufficient_funds');
    expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_dep_1');
    expect(cancelBooking).toHaveBeenCalledTimes(1);
    const [booking, opts] = m(cancelBooking).mock.calls[0];
    expect(booking.id).toBe('booking-1');
    expect(opts).toEqual({
      refundAmount: 0,
      cancellationReason: 'Damage deposit authorization declined (insufficient_funds)',
      cancelledBy: 'deposit-decline',
    });
    expect(db.recordDamageDepositAttempt).toHaveBeenCalledWith(
      'booking-1',
      expect.stringContaining('RENTER_DECLINE insufficient_funds'),
      'PRIMARY'
    );
    expect(sendAdminAlertEmail).toHaveBeenCalledTimes(1);
    expect(m(sendAdminAlertEmail).mock.calls[0][0].subject).toMatch(/auto-cancelled/);
  });

  it('treats a confirmed PI left in requires_payment_method with a card_error as a decline', async () => {
    stripe.paymentIntents.create.mockResolvedValue({
      id: 'pi_dep_2',
      status: 'requires_payment_method',
      last_payment_error: { type: 'card_error', code: 'expired_card', message: 'Your card has expired.' },
    });
    const r = await processDepositHold(makeBooking(), ctx);
    expect(r.outcome).toBe('declined_cancelled');
    expect(m(cancelBooking).mock.calls[0][1].refundAmount).toBe(0);
  });

  it('kill switch DEPOSIT_DECLINE_AUTOCANCEL=false → alert only, no cancellation', async () => {
    process.env.DEPOSIT_DECLINE_AUTOCANCEL = 'false';
    stripe.paymentIntents.create.mockRejectedValue(declineError());
    const r = await processDepositHold(makeBooking(), ctx);
    expect(r.outcome).toBe('declined_autocancel_off');
    expect(cancelBooking).not.toHaveBeenCalled();
    expect(m(sendAdminAlertEmail).mock.calls[0][0].subject).toMatch(/auto-cancel is OFF/);
  });

  it('alerts admins if cancellation itself fails', async () => {
    stripe.paymentIntents.create.mockRejectedValue(declineError());
    m(cancelBooking).mockRejectedValue(new Error('db down'));
    const r = await processDepositHold(makeBooking(), ctx);
    expect(r.outcome).toBe('declined_cancel_failed');
    expect(m(sendAdminAlertEmail).mock.calls[0][0].subject).toMatch(/auto-cancel FAILED/);
  });

  it('a concurrent cancellation is a no-op, not an error', async () => {
    stripe.paymentIntents.create.mockRejectedValue(declineError());
    m(cancelBooking).mockRejectedValue(new CancelBookingError('Booking is already cancelled', 400));
    const r = await processDepositHold(makeBooking(), ctx);
    expect(r.outcome).toBe('skipped');
    expect(sendAdminAlertEmail).not.toHaveBeenCalled();
  });
});

describe('system failure → never cancel, alert, retry next run', () => {
  it('card not found on EITHER account → system failure, both accounts tried', async () => {
    stripe.paymentMethods.retrieve.mockRejectedValue(resourceMissing());
    const r = await processDepositHold(makeBooking(), ctx);
    expect(r.outcome).toBe('system_failure');
    expect(r.code).toBe('resource_missing');
    expect(r.stripe_account).toBe('PRIMARY → SECONDARY');
    expect(r.message).toMatch(/PRIMARY: resource_missing.*SECONDARY: resource_missing/);
    expect(other.paymentMethods.retrieve).toHaveBeenCalled();
    expect(cancelBooking).not.toHaveBeenCalled();
    expect(sendAdminAlertEmail).toHaveBeenCalledTimes(1);
    expect(m(sendAdminAlertEmail).mock.calls[0][0].idempotencyKey).toBe('deposit-system-failure:booking-1:2026-10-31');
  });

  it('resource_missing thrown by create on both accounts', async () => {
    other.paymentMethods.retrieve.mockResolvedValue({ id: 'pm', customer: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    other.paymentIntents.create.mockRejectedValue(resourceMissing());
    stripe.paymentIntents.create.mockRejectedValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new Stripe.errors.StripeInvalidRequestError({ type: 'invalid_request_error', code: 'resource_missing', message: 'No such PaymentMethod' } as any)
    );
    const r = await processDepositHold(makeBooking(), ctx);
    expect(r.outcome).toBe('system_failure');
    expect(cancelBooking).not.toHaveBeenCalled();
  });

  it('Stripe API error', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stripe.paymentIntents.create.mockRejectedValue(new Stripe.errors.StripeAPIError({ type: 'api_error', message: 'boom' } as any));
    const r = await processDepositHold(makeBooking(), ctx);
    expect(r.outcome).toBe('system_failure');
    expect(cancelBooking).not.toHaveBeenCalled();
  });

  it('paid by card but no payment_method_id saved', async () => {
    m(db.claimDamageDepositAttempt).mockResolvedValue({ state: 'claimed', booking: makeBooking({ payment_method_id: undefined }) });
    const r = await processDepositHold(makeBooking(), ctx);
    expect(r.outcome).toBe('system_failure');
    expect(r.code).toBe('missing_payment_method');
    expect(createStripeClient).not.toHaveBeenCalled();
    expect(cancelBooking).not.toHaveBeenCalled();
  });

  it('cancels a half-made PI (requires_action) but never cancels the booking', async () => {
    stripe.paymentIntents.create.mockResolvedValue({ id: 'pi_ra', status: 'requires_action' });
    const r = await processDepositHold(makeBooking(), ctx);
    expect(r.outcome).toBe('system_failure');
    expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_ra');
    expect(cancelBooking).not.toHaveBeenCalled();
  });

  it('leaves a processing PI alone and does NOT try the other account (no double hold)', async () => {
    stripe.paymentIntents.create.mockResolvedValue({ id: 'pi_proc', status: 'processing' });
    await processDepositHold(makeBooking(), ctx);
    expect(stripe.paymentIntents.cancel).not.toHaveBeenCalled();
    expect(createStripeClient).toHaveBeenCalledTimes(1);
  });
});

describe('account fallback', () => {
  it('owner account says resource_missing → hold lands on the OTHER account (recorded)', async () => {
    stripe.paymentMethods.retrieve.mockRejectedValue(resourceMissing());
    other.paymentMethods.retrieve.mockResolvedValue({ id: 'pm', customer: 'cus_SECONDARY' });
    other.paymentIntents.create.mockResolvedValue({ id: 'pi_sec', status: 'requires_capture' });

    const r = await processDepositHold(makeBooking(), ctx);

    expect(r).toMatchObject({ outcome: 'authorized', stripe_account: 'SECONDARY', payment_intent_id: 'pi_sec' });
    expect(other.paymentIntents.create.mock.calls[0][0]).toMatchObject({ customer: 'cus_SECONDARY', metadata: { stripe_account: 'secondary' } });
    expect(db.recordDamageDepositAttempt).toHaveBeenCalledWith('booking-1', null, 'SECONDARY');
    expect(cancelBooking).not.toHaveBeenCalled();
  });

  it('owner account API error, other account card_error decline → RENTER_DECLINE → cancel, no refund', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stripe.paymentIntents.create.mockRejectedValue(new Stripe.errors.StripeAPIError({ type: 'api_error', message: 'boom' } as any));
    other.paymentMethods.retrieve.mockResolvedValue({ id: 'pm', customer: null });
    other.paymentIntents.create.mockRejectedValue(declineError());

    const r = await processDepositHold(makeBooking(), ctx);

    expect(r).toMatchObject({ outcome: 'declined_cancelled', stripe_account: 'SECONDARY', code: 'insufficient_funds' });
    expect(m(cancelBooking).mock.calls[0][1].refundAmount).toBe(0);
    expect(other.paymentIntents.cancel).toHaveBeenCalledWith('pi_dep_1');
  });

  it('a decline on the owner account is final — the other account is not tried', async () => {
    stripe.paymentIntents.create.mockRejectedValue(declineError());
    await processDepositHold(makeBooking(), ctx);
    expect(createStripeClient).toHaveBeenCalledTimes(1);
    expect(other.paymentMethods.retrieve).not.toHaveBeenCalled();
  });

  it('stored stripe_account column decides which account is tried first', async () => {
    m(db.claimDamageDepositAttempt).mockResolvedValue({
      state: 'claimed',
      booking: makeBooking({ stripe_account: 'secondary', payment_method_id: 'pm_no_signature' }),
    });
    other.paymentMethods.retrieve.mockResolvedValue({ id: 'pm', customer: null });
    other.paymentIntents.create.mockResolvedValue({ id: 'pi_sec', status: 'requires_capture' });
    const r = await processDepositHold(makeBooking(), ctx);
    expect(r.stripe_account).toBe('SECONDARY');
    expect(m(createStripeClient).mock.calls[0][0]).toBe('sk_S');
    expect(stripe.paymentMethods.retrieve).not.toHaveBeenCalled();
  });

  it('only one key configured (legacy STRIPE_SECRET_KEY) → tried once', async () => {
    m(stripeSecretKeyFor).mockReturnValue('sk_P');
    stripe.paymentMethods.retrieve.mockRejectedValue(resourceMissing());
    const r = await processDepositHold(makeBooking(), ctx);
    expect(r.outcome).toBe('system_failure');
    expect(createStripeClient).toHaveBeenCalledTimes(1);
  });
});

describe('idempotency', () => {
  it('second run the same day does nothing', async () => {
    m(db.claimDamageDepositAttempt).mockResolvedValue({ state: 'already_attempted' });
    const r = await processDepositHold(makeBooking(), ctx);
    expect(r.outcome).toBe('skipped');
    expect(createStripeClient).not.toHaveBeenCalled();
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    expect(cancelBooking).not.toHaveBeenCalled();
    expect(sendAdminAlertEmail).not.toHaveBeenCalled();
  });

  it('re-checks status before acting (booking cancelled / hold already placed)', async () => {
    m(db.claimDamageDepositAttempt).mockResolvedValue({ state: 'tracking_unavailable' });
    m(db.getBookingById).mockResolvedValueOnce(makeBooking({ status: 'cancelled' }));
    expect((await processDepositHold(makeBooking(), ctx)).outcome).toBe('skipped');

    m(db.getBookingById).mockResolvedValueOnce(makeBooking({ damage_deposit_authorization_status: 'authorized' }));
    expect((await processDepositHold(makeBooking(), ctx)).outcome).toBe('skipped');
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
  });

  it('still works (unclaimed) before the telemetry migration is applied', async () => {
    m(db.claimDamageDepositAttempt).mockResolvedValue({ state: 'tracking_unavailable' });
    m(db.getBookingById).mockResolvedValue(makeBooking());
    stripe.paymentIntents.create.mockResolvedValue({ id: 'pi_ok', status: 'requires_capture' });
    expect((await processDepositHold(makeBooking(), ctx)).outcome).toBe('authorized');
  });
});
