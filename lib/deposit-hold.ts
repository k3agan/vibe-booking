import type Stripe from 'stripe';
import type { Booking } from './supabase';
import {
  claimDamageDepositAttempt,
  getBookingById,
  logEmailSent,
  markDamageDepositAuthorized,
  recordDamageDepositAttempt,
} from './database';
import { createStripeClient, stripeSecretKeyFor } from './stripe-accounts';
import {
  resolveBookingStripeAccount,
  stripeAccountAttemptOrder,
  StripeAccountLabel,
} from './stripe-account-id';
import { cancelBooking, CancelBookingError } from './cancel-booking';
import {
  alertDetailsTable,
  sendAdminAlertEmail,
  sendDamageDepositAuthNotification,
} from '../app/lib/email';
import {
  classifyStripeError,
  classifyUnsuccessfulIntent,
  declineCancellationReason,
  depositHoldIdempotencyKey,
  describeFailure,
  DepositFailure,
  isAutoCancelEnabled,
} from './damage-deposit';

/**
 * One damage-deposit hold attempt for one booking (used by
 * /api/cron/authorize-damage-deposits). Policy 2026-10-31-01:
 *
 *   RENTER_DECLINE (card_error)  → cancel booking, no refund, revoke door codes,
 *                                  email renter + admins   (kill switch: DEPOSIT_DECLINE_AUTOCANCEL=false)
 *   SYSTEM_FAILURE (anything else) → booking untouched, stays pending, admins
 *                                  alerted, retried on the next daily run
 *
 * Account: the hold is tried on the account that owns the card first
 * (bookings.stripe_account, else ID signature); if that fails for a non-card
 * reason (e.g. resource_missing) it is tried on the OTHER account. A card_error
 * on either account is a decline; only "both failed for system reasons" is a
 * system failure.
 *
 * Idempotent: the booking is claimed once per Vancouver day before anything
 * happens, the Stripe hold uses an Idempotency-Key per booking per day, and
 * every email carries a Resend idempotency key.
 */

export type DepositHoldOutcome =
  | 'authorized'
  | 'skipped'
  | 'declined_cancelled'
  | 'declined_autocancel_off'
  | 'declined_cancel_failed'
  | 'system_failure';

export interface DepositHoldResult {
  booking_ref: string;
  selected_date: string;
  outcome: DepositHoldOutcome;
  code?: string;
  message?: string;
  payment_intent_id?: string;
  stripe_account?: string;
}

export interface DepositRunContext {
  /** Today's date in Vancouver, YYYY-MM-DD. */
  today: string;
  /** Start of today in Vancouver as a UTC ISO timestamp. */
  startOfTodayIso: string;
}

function money(amount: number | null | undefined): string {
  return amount != null && !Number.isNaN(Number(amount)) ? `$${Number(amount).toFixed(2)} CAD` : '—';
}

function bookingRows(b: Booking): Array<[string, unknown]> {
  return [
    ['Booking ref', b.booking_ref],
    ['Event date', `${b.selected_date} ${b.start_time ?? ''}–${b.end_time ?? ''}`],
    ['Customer', `${b.customer_name} <${b.customer_email}>${b.customer_phone ? ` · ${b.customer_phone}` : ''}`],
    ['Deposit amount', money(b.damage_deposit_amount)],
  ];
}

function failureRows(f: DepositFailure, account?: string): Array<[string, unknown]> {
  return [
    ['Classification', f.kind === 'RENTER_DECLINE' ? 'Card declined by renter’s bank' : 'System failure (ours, not the renter’s)'],
    ['Code', f.code],
    ['Stripe message', f.message],
    ['Stripe account', account ?? '—'],
    ['PaymentIntent', f.paymentIntentId ? `${f.paymentIntentId} (${f.paymentIntentStatus ?? 'unknown'})` : '—'],
  ];
}

async function cancelIntentQuietly(stripe: Stripe, paymentIntentId: string): Promise<void> {
  try {
    await stripe.paymentIntents.cancel(paymentIntentId);
    console.log(`Cancelled failed deposit PaymentIntent ${paymentIntentId}`);
  } catch (err) {
    console.warn(`Could not cancel PaymentIntent ${paymentIntentId} (non-blocking):`, err instanceof Error ? err.message : err);
  }
}

async function handleAuthorized(
  b: Booking,
  ctx: DepositRunContext,
  intent: Stripe.PaymentIntent,
  account: string
): Promise<DepositHoldResult> {
  const base = { booking_ref: b.booking_ref, selected_date: b.selected_date, payment_intent_id: intent.id, stripe_account: account };

  let marked: Booking | null;
  try {
    marked = await markDamageDepositAuthorized(b.id, intent.id);
  } catch (err) {
    // The hold exists in Stripe but isn't recorded — tomorrow's run would hold again. A human must fix it.
    const message = err instanceof Error ? err.message : String(err);
    await sendAdminAlertEmail({
      subject: `🚨 Deposit hold placed but NOT recorded – ${b.booking_ref}`,
      html:
        `<h2>Deposit hold placed but not saved to the database</h2>` +
        `<p>Stripe authorized the hold, but updating the booking failed. Set <code>damage_deposit_authorization_status='authorized'</code> and <code>damage_deposit_authorization_id</code> manually, or the next run may place a second hold.</p>` +
        alertDetailsTable([...bookingRows(b), ['PaymentIntent', intent.id], ['Stripe account', account], ['DB error', message]]),
      idempotencyKey: `deposit-unrecorded:${b.id}:${ctx.today}`,
    });
    return { ...base, outcome: 'system_failure', code: 'db_update_failed', message };
  }

  await recordDamageDepositAttempt(b.id, null, account);

  if (!marked) {
    return { ...base, outcome: 'authorized', message: 'Already recorded by another run' };
  }

  try {
    const emailResult = await sendDamageDepositAuthNotification(
      {
        customerName: b.customer_name,
        customerEmail: b.customer_email,
        bookingRef: b.booking_ref,
        eventDate: b.selected_date,
        damageDepositAmount: Number(b.damage_deposit_amount),
        eventType: b.event_type,
      },
      { idempotencyKey: `deposit-authorized:${b.id}` }
    );
    await logEmailSent(b.id, 'reminder', b.customer_email, emailResult.success ? 'sent' : 'failed', emailResult.error);
  } catch (emailError) {
    console.error(`Failed to send damage deposit notification for ${b.booking_ref}:`, emailError);
  }

  console.log(`✅ Damage deposit authorized for ${b.booking_ref}: ${money(b.damage_deposit_amount)} on ${account}`);
  return { ...base, outcome: 'authorized' };
}

async function handleRenterDecline(
  b: Booking,
  ctx: DepositRunContext,
  failure: DepositFailure,
  stripe: Stripe,
  account: string
): Promise<DepositHoldResult> {
  const base = {
    booking_ref: b.booking_ref,
    selected_date: b.selected_date,
    code: failure.code,
    message: failure.message,
    payment_intent_id: failure.paymentIntentId,
    stripe_account: account,
  };

  if (failure.paymentIntentId) await cancelIntentQuietly(stripe, failure.paymentIntentId);
  await recordDamageDepositAttempt(b.id, describeFailure(failure), account);

  if (!isAutoCancelEnabled()) {
    await sendAdminAlertEmail({
      subject: `⚠️ Deposit hold DECLINED – ${b.booking_ref} (auto-cancel is OFF)`,
      html:
        `<h2>Damage-deposit hold declined — booking NOT cancelled</h2>` +
        `<p>The renter’s card declined the hold. <code>DEPOSIT_DECLINE_AUTOCANCEL=false</code>, so nothing was cancelled. ` +
        `Decide manually (Admin → cancel with $0 refund per policy 2026-10-31-01). The hold will be retried on the next daily run.</p>` +
        alertDetailsTable([...bookingRows(b), ...failureRows(failure, account)]),
      idempotencyKey: `deposit-declined-noauto:${b.id}:${ctx.today}`,
    });
    return { ...base, outcome: 'declined_autocancel_off' };
  }

  let result;
  try {
    result = await cancelBooking(b, {
      refundAmount: 0, // policy 2026-10-31-01: no refund
      cancellationReason: declineCancellationReason(failure.code),
      cancelledBy: 'deposit-decline',
    });
  } catch (err) {
    if (err instanceof CancelBookingError && /already cancelled/i.test(err.message)) {
      return { ...base, outcome: 'skipped', message: 'Booking already cancelled by another process' };
    }
    const message = err instanceof Error ? err.message : String(err);
    await sendAdminAlertEmail({
      subject: `🚨 Deposit DECLINED but auto-cancel FAILED – ${b.booking_ref}`,
      html:
        `<h2>Deposit hold declined — cancellation failed</h2>` +
        `<p>The renter’s card declined the hold, but cancelling the booking failed. <strong>Cancel it manually (no refund) and remove the door codes.</strong></p>` +
        alertDetailsTable([...bookingRows(b), ...failureRows(failure, account), ['Cancellation error', message]]),
      idempotencyKey: `deposit-cancel-failed:${b.id}:${ctx.today}`,
    });
    return { ...base, outcome: 'declined_cancel_failed', message };
  }

  const codes = result.accessCodes;
  const codesLine = codes.skipped
    ? `Not checked (${codes.skipped}) — CHECK THE LOCKS MANUALLY`
    : codes.errors.length > 0
      ? `${codes.revoked} revoked, ERRORS: ${codes.errors.join('; ')} — CHECK THE LOCKS MANUALLY`
      : `${codes.revoked} revoked`;

  await sendAdminAlertEmail({
    subject: `🚫 Booking auto-cancelled: deposit hold declined – ${b.booking_ref} (${b.selected_date})`,
    html:
      `<h2>Booking cancelled — damage-deposit hold declined</h2>` +
      `<p>Per policy 2026-10-31-01 the booking was cancelled with <strong>no refund</strong>.</p>` +
      alertDetailsTable([
        ...bookingRows(b),
        ...failureRows(failure, account),
        ['Refund', 'None (rental fee retained)'],
        ['Calendar event deleted', result.calendarEventDeleted ? 'yes' : b.calendar_event_id ? 'NO — remove it manually' : 'no event on file'],
        ['Door codes', codesLine],
        ['Renter cancellation email', result.cancellationEmailSent ? 'sent' : 'FAILED — contact the renter'],
      ]) +
      `<p>Kill switch: set <code>DEPOSIT_DECLINE_AUTOCANCEL=false</code> in Vercel to alert-only.</p>`,
    idempotencyKey: `deposit-declined:${b.id}`,
  });

  console.log(`🚫 ${b.booking_ref} cancelled: deposit hold declined (${failure.code})`);
  return { ...base, outcome: 'declined_cancelled' };
}

async function handleSystemFailure(
  b: Booking,
  ctx: DepositRunContext,
  failure: DepositFailure,
  account?: string
): Promise<DepositHoldResult> {
  await recordDamageDepositAttempt(b.id, describeFailure(failure));

  const lastChance = b.selected_date <= ctx.today;
  await sendAdminAlertEmail({
    subject: `🚨 Deposit hold FAILED (system, not a decline) – ${b.booking_ref} – event ${b.selected_date}`,
    html:
      `<h2>Damage-deposit hold could not be placed</h2>` +
      `<p>This is <strong>not</strong> a card decline — the booking was <strong>not cancelled</strong>. ` +
      `It stays pending and is retried on every daily run until the event date.</p>` +
      (lastChance ? `<p><strong>The event is today — there will be no further automatic retry.</strong></p>` : '') +
      alertDetailsTable([...bookingRows(b), ...failureRows(failure, account)]),
    idempotencyKey: `deposit-system-failure:${b.id}:${ctx.today}`,
  });

  console.error(`❌ Deposit hold system failure for ${b.booking_ref}: ${describeFailure(failure)}`);
  return {
    booking_ref: b.booking_ref,
    selected_date: b.selected_date,
    outcome: 'system_failure',
    code: failure.code,
    message: failure.message,
    payment_intent_id: failure.paymentIntentId,
    stripe_account: account,
  };
}

export async function processDepositHold(booking: Booking, ctx: DepositRunContext): Promise<DepositHoldResult> {
  const skipped = (message: string): DepositHoldResult => ({
    booking_ref: booking.booking_ref,
    selected_date: booking.selected_date,
    outcome: 'skipped',
    message,
  });

  // 1. Claim today's attempt (no second run today touches this booking), then re-check status.
  const claim = await claimDamageDepositAttempt(booking.id, ctx.startOfTodayIso);
  if (claim.state === 'already_attempted') return skipped('Already attempted today, or no longer confirmed');
  if (claim.state === 'tracking_unavailable') {
    console.warn('Deposit telemetry columns missing — run database/add_damage_deposit_attempt_tracking.sql');
  }
  const b = claim.state === 'claimed' ? claim.booking : await getBookingById(booking.id);
  if (!b || b.status !== 'confirmed') return skipped('Booking is no longer confirmed');
  if (b.damage_deposit_authorization_status && b.damage_deposit_authorization_status !== 'pending') {
    return skipped(`Deposit already ${b.damage_deposit_authorization_status}`);
  }

  // 2. Preconditions. Anything missing here is our problem, never the renter's.
  if (!b.payment_method_id) {
    if (!b.payment_intent_id) {
      await recordDamageDepositAttempt(b.id, 'SKIPPED no card payment on file (paid offline?)');
      return skipped('No card payment on file');
    }
    return handleSystemFailure(b, ctx, {
      kind: 'SYSTEM_FAILURE',
      code: 'missing_payment_method',
      message: 'Booking was paid by card but no payment_method_id was saved',
    });
  }
  const amount = Number(b.damage_deposit_amount);
  if (!(amount > 0)) {
    return handleSystemFailure(b, ctx, {
      kind: 'SYSTEM_FAILURE',
      code: 'invalid_deposit_amount',
      message: `damage_deposit_amount is ${b.damage_deposit_amount}`,
    });
  }

  // 3. Owner account first (stored stripe_account, else ID signature); the
  //    OTHER account only if the first fails for a non-card reason.
  const order = stripeAccountAttemptOrder(resolveBookingStripeAccount(b));
  const attempts: Array<{ account: string; failure: DepositFailure }> = [];
  const triedKeys = new Set<string>();

  for (const accountLabel of order) {
    const key = stripeSecretKeyFor(accountLabel);
    if (!key || triedKeys.has(key)) continue; // not configured, or same key as the account already tried
    triedKeys.add(key);
    const account = accountLabel.toUpperCase();
    const stripe = createStripeClient(key);

    const attempt = await attemptHold(stripe, accountLabel, b, ctx, amount);
    if (attempt.intent) return handleAuthorized(b, ctx, attempt.intent, account);
    const failure = attempt.failure!;
    if (failure.kind === 'RENTER_DECLINE') return handleRenterDecline(b, ctx, failure, stripe, account);

    attempts.push({ account, failure });
    if (failure.paymentIntentStatus === 'processing') break; // a hold may still land on this account — don't risk a second one
    if (failure.paymentIntentId) await cancelIntentQuietly(stripe, failure.paymentIntentId);
  }

  if (attempts.length === 0) {
    return handleSystemFailure(b, ctx, {
      kind: 'SYSTEM_FAILURE',
      code: 'no_stripe_key',
      message: 'No Stripe secret key configured',
    });
  }
  // Every account failed for system reasons → never cancel.
  const withPi = attempts.find((a) => a.failure.paymentIntentId);
  return handleSystemFailure(
    b,
    ctx,
    {
      kind: 'SYSTEM_FAILURE',
      code: attempts[0].failure.code,
      message: attempts.map((a) => `${a.account}: ${a.failure.code} — ${a.failure.message}`).join(' | '),
      paymentIntentId: withPi?.failure.paymentIntentId,
      paymentIntentStatus: withPi?.failure.paymentIntentStatus,
    },
    attempts.map((a) => a.account).join(' → ')
  );
}

/** One hold attempt on one account: look up the card there (for its customer), then hold. */
async function attemptHold(
  stripe: Stripe,
  accountLabel: StripeAccountLabel,
  b: Booking,
  ctx: DepositRunContext,
  amount: number
): Promise<{ intent?: Stripe.PaymentIntent; failure?: DepositFailure }> {
  let paymentMethod: Stripe.PaymentMethod;
  try {
    paymentMethod = await stripe.paymentMethods.retrieve(b.payment_method_id!);
  } catch (err) {
    // Looking a card up can't be a decline (e.g. resource_missing = wrong account).
    return { failure: { ...classifyStripeError(err), kind: 'SYSTEM_FAILURE' } };
  }
  const customer = typeof paymentMethod.customer === 'string' ? paymentMethod.customer : paymentMethod.customer?.id;

  let intent: Stripe.PaymentIntent;
  try {
    // Idempotency-Key = one hold per booking per day per account, even across concurrent runs.
    intent = await stripe.paymentIntents.create(
      {
        amount: Math.round(amount * 100),
        currency: 'cad',
        ...(customer ? { customer } : {}),
        payment_method: b.payment_method_id!,
        capture_method: 'manual', // a hold, not a charge
        confirm: true,
        off_session: true,
        metadata: {
          booking_ref: b.booking_ref,
          booking_id: b.id,
          type: 'damage_deposit',
          attempt_date: ctx.today,
          stripe_account: accountLabel,
        },
        description: `Damage deposit hold for ${b.event_type} - ${b.customer_name}`,
      },
      { idempotencyKey: depositHoldIdempotencyKey(b.id, ctx.today) }
    );
  } catch (err) {
    return { failure: classifyStripeError(err) };
  }

  if (intent.status === 'requires_capture') return { intent };
  return { failure: classifyUnsuccessfulIntent(intent) };
}

/** Last-resort alert when processDepositHold itself throws (e.g. database unreachable). Never cancels. */
export async function alertUnexpectedDepositError(booking: Booking, ctx: DepositRunContext, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  await sendAdminAlertEmail({
    subject: `🚨 Deposit hold FAILED (system, not a decline) – ${booking.booking_ref} – event ${booking.selected_date}`,
    html:
      `<h2>Damage-deposit cron error</h2>` +
      `<p>An unexpected error stopped the hold attempt. The booking was <strong>not cancelled</strong>; it will be retried on the next run.</p>` +
      alertDetailsTable([...bookingRows(booking), ['Error', message]]),
    idempotencyKey: `deposit-unexpected:${booking.id}:${ctx.today}`,
  });
}

