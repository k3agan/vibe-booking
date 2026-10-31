import Stripe from 'stripe';
import {
  DEPOSIT_HOLD_DAYS_AHEAD,
  DEPOSIT_WATCHDOG_DAYS_AHEAD,
  classifyStripeError,
  classifyUnsuccessfulIntent,
  declineCancellationReason,
  depositHoldIdempotencyKey,
  describeFailure,
  isAutoCancelEnabled,
  vancouverDateString,
} from '../damage-deposit';

// Real stripe-node error classes, so the classifier is tested against the shapes the SDK actually throws.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cardError = (raw: Record<string, unknown>) => new Stripe.errors.StripeCardError(raw as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const invalidRequest = (raw: Record<string, unknown>) => new Stripe.errors.StripeInvalidRequestError(raw as any);

describe('classifyStripeError — renter declines (policy: cancel, no refund)', () => {
  it.each([
    ['card_declined', 'insufficient_funds', 'insufficient_funds'],
    ['card_declined', 'generic_decline', 'generic_decline'],
    ['expired_card', undefined, 'expired_card'],
    ['authentication_required', 'authentication_required', 'authentication_required'],
    ['incorrect_cvc', undefined, 'incorrect_cvc'],
    ['card_declined', 'lost_card', 'lost_card'],
  ])('code=%s decline_code=%s → RENTER_DECLINE (%s)', (code, decline_code, expected) => {
    const err = cardError({
      type: 'card_error',
      code,
      decline_code,
      message: 'Your card was declined.',
      payment_intent: { id: 'pi_123', status: 'requires_payment_method' },
    });
    const f = classifyStripeError(err);
    expect(f.kind).toBe('RENTER_DECLINE');
    expect(f.code).toBe(expected);
    expect(f.paymentIntentId).toBe('pi_123');
    expect(f.paymentIntentStatus).toBe('requires_payment_method');
  });

  it('accepts a plain card_error object (raw API shape)', () => {
    expect(classifyStripeError({ type: 'card_error', code: 'card_declined', decline_code: 'do_not_honor' }).kind).toBe(
      'RENTER_DECLINE'
    );
  });
});

describe('classifyStripeError — system failures (never cancel)', () => {
  it('wrong Stripe account: resource_missing "No such PaymentMethod"', () => {
    const f = classifyStripeError(
      invalidRequest({
        type: 'invalid_request_error',
        code: 'resource_missing',
        message: "No such PaymentMethod: 'pm_1AbcJAT5KpLHRqxyz'",
      })
    );
    expect(f.kind).toBe('SYSTEM_FAILURE');
    expect(f.code).toBe('resource_missing');
  });

  it('PaymentMethod not reusable (invalid_request_error)', () => {
    const f = classifyStripeError(
      invalidRequest({
        type: 'invalid_request_error',
        message: 'The provided PaymentMethod was previously used with a PaymentIntent without Customer attachment',
      })
    );
    expect(f.kind).toBe('SYSTEM_FAILURE');
  });

  it('Stripe API / connection / auth / rate-limit errors', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = new Stripe.errors.StripeAPIError({ type: 'api_error', message: 'boom' } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = new Stripe.errors.StripeConnectionError({ message: 'ECONNRESET' } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auth = new Stripe.errors.StripeAuthenticationError({ message: 'Invalid API Key' } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rate = new Stripe.errors.StripeRateLimitError({ type: 'invalid_request_error', code: 'rate_limit' } as any);
    for (const err of [api, conn, auth, rate]) {
      expect(classifyStripeError(err).kind).toBe('SYSTEM_FAILURE');
    }
  });

  it('non-Stripe errors and junk', () => {
    expect(classifyStripeError(new Error('fetch failed')).kind).toBe('SYSTEM_FAILURE');
    expect(classifyStripeError(undefined).kind).toBe('SYSTEM_FAILURE');
    expect(classifyStripeError('string error').message).toBe('string error');
  });

  it.each(['processing_error', 'try_again_later', 'issuer_not_available', 'reenter_transaction'])(
    'transient issuer code %s is retried, not treated as a decline',
    (code) => {
      const asCode = cardError({ type: 'card_error', code, message: 'try again' });
      const asDecline = cardError({ type: 'card_error', code: 'card_declined', decline_code: code });
      expect(classifyStripeError(asCode).kind).toBe('SYSTEM_FAILURE');
      expect(classifyStripeError(asDecline).kind).toBe('SYSTEM_FAILURE');
    }
  );
});

describe('classifyUnsuccessfulIntent', () => {
  it('requires_payment_method + card_error last_payment_error → RENTER_DECLINE', () => {
    const f = classifyUnsuccessfulIntent({
      id: 'pi_1',
      status: 'requires_payment_method',
      last_payment_error: { type: 'card_error', code: 'card_declined', decline_code: 'insufficient_funds', message: 'Declined' },
    });
    expect(f).toMatchObject({ kind: 'RENTER_DECLINE', code: 'insufficient_funds', paymentIntentId: 'pi_1' });
  });

  it('requires_payment_method with a non-card error → SYSTEM_FAILURE', () => {
    expect(
      classifyUnsuccessfulIntent({
        id: 'pi_2',
        status: 'requires_payment_method',
        last_payment_error: { type: 'invalid_request_error', message: 'x' },
      }).kind
    ).toBe('SYSTEM_FAILURE');
    expect(classifyUnsuccessfulIntent({ id: 'pi_3', status: 'requires_payment_method' }).kind).toBe('SYSTEM_FAILURE');
  });

  it.each(['requires_action', 'processing', 'requires_confirmation', 'succeeded'])('status %s → SYSTEM_FAILURE', (status) => {
    const f = classifyUnsuccessfulIntent({ id: 'pi_4', status });
    expect(f.kind).toBe('SYSTEM_FAILURE');
    expect(f.code).toBe(`unexpected_status_${status}`);
    expect(f.paymentIntentStatus).toBe(status);
  });
});

describe('kill switch DEPOSIT_DECLINE_AUTOCANCEL', () => {
  it('defaults ON', () => {
    expect(isAutoCancelEnabled({})).toBe(true);
    expect(isAutoCancelEnabled({ DEPOSIT_DECLINE_AUTOCANCEL: '' })).toBe(true);
    expect(isAutoCancelEnabled({ DEPOSIT_DECLINE_AUTOCANCEL: 'true' })).toBe(true);
  });
  it("only 'false' turns it off", () => {
    expect(isAutoCancelEnabled({ DEPOSIT_DECLINE_AUTOCANCEL: 'false' })).toBe(false);
    expect(isAutoCancelEnabled({ DEPOSIT_DECLINE_AUTOCANCEL: ' FALSE ' })).toBe(false);
  });
});

describe('vancouverDateString', () => {
  it('uses the Vancouver calendar date, not UTC', () => {
    // 2026-11-01 04:30 UTC = 2026-10-31 21:30 PDT
    expect(vancouverDateString(new Date('2026-11-01T04:30:00Z'))).toBe('2026-10-31');
    // 2026-01-15 07:59 UTC = 2026-01-14 23:59 PST. (Avoids dates after 2026-11-01: B.C. moves to
    // permanent UTC-7 then, and the answer depends on the runtime's tzdata version.)
    expect(vancouverDateString(new Date('2026-01-15T07:59:00Z'))).toBe('2026-01-14');
    expect(vancouverDateString(new Date('2026-01-15T08:00:00Z'))).toBe('2026-01-15');
  });

  it('builds the today..today+4 window across DST and month/year ends', () => {
    const now = new Date('2026-10-31T17:00:00Z'); // 10:00 PDT, the day before B.C.'s last clock change would have been
    expect([0, 1, 2, 3, 4].map((d) => vancouverDateString(now, d))).toEqual([
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
    ]);
    expect(DEPOSIT_HOLD_DAYS_AHEAD).toBe(4);
    expect(DEPOSIT_WATCHDOG_DAYS_AHEAD).toBe(3);
    expect(vancouverDateString(new Date('2026-12-30T20:00:00Z'), 3)).toBe('2027-01-02');
  });
});

describe('misc', () => {
  it('idempotency key is per booking per day', () => {
    expect(depositHoldIdempotencyKey('b1', '2026-10-31')).toBe('deposit-hold:b1:2026-10-31');
    expect(depositHoldIdempotencyKey('b1', '2026-11-01')).not.toBe(depositHoldIdempotencyKey('b1', '2026-10-31'));
  });
  it('cancellation reason and telemetry string', () => {
    expect(declineCancellationReason('insufficient_funds')).toBe('Damage deposit authorization declined (insufficient_funds)');
    expect(describeFailure({ kind: 'SYSTEM_FAILURE', code: 'resource_missing', message: 'No such PaymentMethod' })).toBe(
      'SYSTEM_FAILURE resource_missing: No such PaymentMethod'
    );
  });
});
