/**
 * Pure helpers for the damage-deposit hold cron. No I/O here, so it's unit-tested
 * (lib/__tests__/damage-deposit.test.ts).
 *
 * Policy 2026-10-31-01 (Keagan, treasurer): a hold that is genuinely DECLINED by
 * the renter's card → cancel the booking immediately, revoke door codes, no
 * refund. A hold that fails because of OUR system (wrong Stripe account, API or
 * network error, no card on file, …) must never cancel — alert admins and retry.
 */

export const VANCOUVER_TZ = 'America/Vancouver';

/** Holds are placed up to this many days before the event (catch-up window: today..today+N). */
export const DEPOSIT_HOLD_DAYS_AHEAD = 4;

/** The watchdog lists bookings within today..today+N that still have no hold. */
export const DEPOSIT_WATCHDOG_DAYS_AHEAD = 3;

export type DepositFailureKind = 'RENTER_DECLINE' | 'SYSTEM_FAILURE';

export interface DepositFailure {
  kind: DepositFailureKind;
  /** Stripe decline_code / error code, or our own code (e.g. missing_payment_method). */
  code: string;
  message: string;
  paymentIntentId?: string;
  paymentIntentStatus?: string;
}

/**
 * card_error codes that mean "the issuer couldn't answer right now — try again",
 * not "the card said no". Treated as SYSTEM_FAILURE (retry + alert) so a
 * transient issuer outage never cancels a booking.
 */
const TRANSIENT_CARD_CODES = new Set([
  'processing_error',
  'try_again_later',
  'issuer_not_available',
  'reenter_transaction',
]);

interface StripeErrorLike {
  type?: string;
  rawType?: string;
  code?: string;
  decline_code?: string;
  message?: string;
  payment_intent?: { id?: string; status?: string } | null;
}

interface LastPaymentErrorLike {
  type?: string;
  code?: string;
  decline_code?: string;
  message?: string;
}

function isCardErrorType(type: string | undefined): boolean {
  return type === 'card_error' || type === 'StripeCardError';
}

function fromCardError(
  e: LastPaymentErrorLike,
  paymentIntent?: { id?: string; status?: string } | null
): DepositFailure {
  const code = e.decline_code || e.code || 'card_declined';
  const transient =
    (e.code !== undefined && TRANSIENT_CARD_CODES.has(e.code)) ||
    (e.decline_code !== undefined && TRANSIENT_CARD_CODES.has(e.decline_code));
  return {
    kind: transient ? 'SYSTEM_FAILURE' : 'RENTER_DECLINE',
    code,
    message: e.message || 'Card declined',
    paymentIntentId: paymentIntent?.id,
    paymentIntentStatus: paymentIntent?.status,
  };
}

/** Classify an error thrown while placing the hold. */
export function classifyStripeError(err: unknown): DepositFailure {
  const e = (err && typeof err === 'object' ? err : {}) as StripeErrorLike;
  if (isCardErrorType(e.rawType) || isCardErrorType(e.type)) {
    return fromCardError(e, e.payment_intent);
  }
  return {
    kind: 'SYSTEM_FAILURE',
    code: e.code || e.rawType || e.type || 'unknown_error',
    message: e.message || (err instanceof Error ? err.message : String(err)),
    paymentIntentId: e.payment_intent?.id,
    paymentIntentStatus: e.payment_intent?.status,
  };
}

/**
 * Classify a PaymentIntent that was confirmed without throwing but did not end
 * up in requires_capture. Only "requires_payment_method + last_payment_error is
 * a card_error" is a renter decline; anything else (requires_action,
 * processing, …) is ours to look at.
 */
export function classifyUnsuccessfulIntent(pi: {
  id: string;
  status: string;
  last_payment_error?: LastPaymentErrorLike | null;
}): DepositFailure {
  const lpe = pi.last_payment_error;
  if (pi.status === 'requires_payment_method' && lpe && isCardErrorType(lpe.type)) {
    return fromCardError(lpe, pi);
  }
  return {
    kind: 'SYSTEM_FAILURE',
    code: `unexpected_status_${pi.status}`,
    message: lpe?.message || `PaymentIntent ended in status ${pi.status}`,
    paymentIntentId: pi.id,
    paymentIntentStatus: pi.status,
  };
}

/** Kill switch: DEPOSIT_DECLINE_AUTOCANCEL=false turns auto-cancel off (alert only). Default ON. */
export function isAutoCancelEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return (env.DEPOSIT_DECLINE_AUTOCANCEL ?? '').trim().toLowerCase() !== 'false';
}

export function declineCancellationReason(code: string): string {
  return `Damage deposit authorization declined (${code})`;
}

/** One-line telemetry string stored in bookings.damage_deposit_last_error. */
export function describeFailure(f: DepositFailure): string {
  return `${f.kind} ${f.code}: ${f.message}`.slice(0, 1000);
}

/** Stripe Idempotency-Key: at most one hold attempt per booking per Vancouver day. */
export function depositHoldIdempotencyKey(bookingId: string, vancouverDate: string): string {
  return `deposit-hold:${bookingId}:${vancouverDate}`;
}

/** Calendar date (YYYY-MM-DD) in Vancouver for `now`, shifted by offsetDays. */
export function vancouverDateString(now: Date, offsetDays = 0): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VANCOUVER_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const d = new Date(Date.UTC(get('year'), get('month') - 1, get('day') + offsetDays));
  return d.toISOString().slice(0, 10);
}
