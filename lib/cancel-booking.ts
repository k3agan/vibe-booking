import Stripe from 'stripe';
import { google } from 'googleapis';
import { supabase, Booking } from './supabase';
import { logEmailSent, updateBookingCancellation } from './database';
import { revokeAccessCodesForBooking, RevokeAccessCodesResult } from './seam';
import { createStripeClient, isResourceMissing, withStripeFallback } from './stripe-accounts';
import { stripeAccountForObjectId } from './stripe-account-id';
import { sendCancellationEmail } from '../app/lib/email';

/**
 * The booking cancellation pipeline, shared by the admin portal
 * (/api/admin/cancel-booking) and the damage-deposit cron (auto-cancel on a
 * declined hold, policy 2026-10-31-01):
 *
 *   refund (optional) → release deposit hold → DB cancelled → delete calendar
 *   event → revoke Seam door codes → renter cancellation email
 */

/** A cancellation that must not proceed; `status` is the HTTP status the admin route returns. */
export class CancelBookingError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: { code: string; customerEmail: string }
  ) {
    super(message);
    this.name = 'CancelBookingError';
  }
}

export interface CancelBookingOptions {
  /**
   * Amount to refund in CAD. `null` = remaining captured Stripe balance (admin
   * default); `0` = no refund (deposit-decline policy). Deliberately required
   * so no caller gets a full refund by omission.
   */
  refundAmount: number | null;
  cancellationReason: string | null;
  /** Recorded on the Stripe refund metadata, e.g. 'admin'. */
  cancelledBy: string;
}

export interface CancelBookingResult {
  booking: Booking;
  refundAmount: number | null;
  stripeRefundId: string | null;
  damageDepositReleased: boolean;
  calendarEventDeleted: boolean;
  accessCodes: RevokeAccessCodesResult;
  cancellationEmailSent: boolean;
}

/**
 * Delete the Google Calendar event tied to a cancelled booking so the date
 * frees up on the public availability view (which reads straight from the
 * calendar). Best-effort: a calendar failure must never block the refund/DB
 * update that already succeeded, so this only logs on error. Mirrors the auth
 * pattern used by app/api/calendar/route.ts (service account + calendar scope).
 * Treats an already-gone event (404/410/deleted) as success.
 */
export async function deleteCalendarEvent(eventId: string | null | undefined): Promise<boolean> {
  if (!eventId) return false;
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    const authClient = await auth.getClient();
    const calendar = google.calendar({ version: 'v3' });
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'capitolhillhallrent@gmail.com';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await calendar.events.delete({ auth: authClient as any, calendarId, eventId });
    console.log(`✅ Calendar event deleted: ${eventId}`);
    return true;
  } catch (err) {
    const code = (err as { code?: number; status?: number })?.code ?? (err as { status?: number })?.status;
    if (code === 404 || code === 410) {
      // Already gone — treat as released.
      console.log(`Calendar event ${eventId} already absent (${code}) — treating as released`);
      return true;
    }
    console.error('Failed to delete calendar event (non-blocking):', err);
    return false;
  }
}

/** Clear calendar_event_id after the event is gone. */
export async function clearCalendarEventId(bookingId: string): Promise<void> {
  await supabase
    .from('bookings')
    .update({ calendar_event_id: null, updated_at: new Date().toISOString() })
    .eq('id', bookingId);
}

function refuseSecondaryRefund(booking: Booking): never {
  throw new CancelBookingError(
    `Stripe refunds on the SECONDARY account are disabled. Route any e-transfer refund for ${booking.customer_email} through Finance; no cancellation was performed.`,
    409,
    { code: 'SECONDARY_ACCOUNT_REFUND_REFUSED', customerEmail: booking.customer_email }
  );
}

/** Positive/default refunds never use rotated keys or a cross-account WRITE fallback. */
async function refundRental(booking: Booking, opts: CancelBookingOptions): Promise<{ id: string; amount: number }> {
  const intentId = booking.payment_intent_id;
  if (!intentId) throw new CancelBookingError('No rental PaymentIntent recorded; refund cannot be verified', 409);
  if (stripeAccountForObjectId(intentId) === 'secondary') refuseSecondaryRefund(booking);

  // Do not guess whether the rotating/legacy key happens to be PRIMARY today.
  const key = process.env.STRIPE_SECRET_KEY_PRIMARY;
  if (!key || key === process.env.STRIPE_SECRET_KEY_SECONDARY) {
    throw new CancelBookingError('A distinct PRIMARY Stripe key must be configured for refunds', 503);
  }
  const stripe = createStripeClient(key);
  try {
    let intent: Stripe.PaymentIntent;
    try {
      intent = await stripe.paymentIntents.retrieve(intentId, { expand: ['latest_charge'] });
    } catch (err) {
      const secondaryKey = process.env.STRIPE_SECRET_KEY_SECONDARY;
      if (isResourceMissing(err) && !stripeAccountForObjectId(intentId) && secondaryKey) {
        // Unknown legacy IDs may live on SECONDARY. Only look them up there;
        // never pass a refund/cancellation callback to an account fallback.
        await createStripeClient(secondaryKey).paymentIntents.retrieve(intentId);
        refuseSecondaryRefund(booking);
      }
      throw err;
    }
    if (stripeAccountForObjectId(intent.id) === 'secondary') refuseSecondaryRefund(booking);
    if (intent.status !== 'succeeded' || intent.currency !== 'cad' || !intent.latest_charge) {
      throw new CancelBookingError('Rental payment has no succeeded CAD charge to refund', 409);
    }
    const charge = typeof intent.latest_charge === 'string'
      ? await stripe.charges.retrieve(intent.latest_charge)
      : intent.latest_charge;
    const captured = charge.amount_captured;
    const refunded = charge.amount_refunded;
    if (!charge.paid || !charge.captured || charge.currency !== 'cad' ||
        !Number.isSafeInteger(captured) || !Number.isSafeInteger(refunded) ||
        captured < 0 || refunded < 0 || refunded > captured) {
      throw new CancelBookingError('Stripe charge state cannot be safely refunded', 409);
    }
    const remaining = captured - refunded;
    if (remaining === 0) {
      throw new CancelBookingError('Rental payment is already fully refunded; use explicit 0 to cancel without a refund', 409);
    }
    const cents = opts.refundAmount === null ? remaining : Math.round(opts.refundAmount * 100);
    if (cents > remaining) {
      throw new CancelBookingError(`Refund exceeds remaining Stripe balance ($${(remaining / 100).toFixed(2)} CAD)`, 400);
    }
    const refund = await stripe.refunds.create({
      payment_intent: intentId,
      amount: cents,
      reason: 'requested_by_customer',
      metadata: { booking_ref: booking.booking_ref, booking_id: booking.id, cancelled_by: opts.cancelledBy },
    }, { idempotencyKey: `cancellation-refund:${booking.id}` });
    return { id: refund.id, amount: cents / 100 };
  } catch (err) {
    if (err instanceof CancelBookingError) throw err;
    // Stripe remains the final guard against a concurrent external refund.
    // Never continue cancellation on lookup/refund failure or expose raw errors.
    throw new CancelBookingError('Stripe refund could not be verified or issued; booking was not cancelled. Check Stripe before retrying.', 502);
  }
}

export async function cancelBooking(booking: Booking, opts: CancelBookingOptions): Promise<CancelBookingResult> {
  const bookingId = booking.id;

  if (booking.status === 'cancelled') {
    throw new CancelBookingError('Booking is already cancelled', 400);
  }

  if (opts.refundAmount !== null) {
    const amount = opts.refundAmount;
    const cents = Math.round(amount * 100);
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 ||
        !Number.isSafeInteger(cents) || Math.abs(cents / 100 - amount) > 1e-9) {
      throw new CancelBookingError('Refund amount must be a finite, non-negative CAD number with at most two decimal places', 400);
    }
  }

  let stripeRefundId: string | null = null;
  let actualRefundAmount: number | null = null;
  let damageDepositReleased = false;

  // ── Stripe Refund ────────────────────────────────────────────────────────
  if (booking.payment_status === 'succeeded' && opts.refundAmount !== 0) {
    const refund = await refundRental(booking, opts);
    stripeRefundId = refund.id;
    actualRefundAmount = refund.amount;
  } else if (booking.payment_status === 'cancelled') {
    throw new CancelBookingError('Payment already cancelled for this booking', 400);
  } else if (opts.refundAmount !== null && opts.refundAmount > 0) {
    throw new CancelBookingError('No succeeded rental payment to refund', 409);
  } else if (booking.payment_status === 'comped') {
    // Comped bookings: cancel without any Stripe calls
    console.log('Comped booking — skipping Stripe refund');
  }

  // ── Release Damage Deposit Hold ──────────────────────────────────────────
  if (booking.damage_deposit_authorization_id && booking.damage_deposit_authorization_status === 'authorized') {
    try {
      await withStripeFallback((stripe) => stripe.paymentIntents.cancel(booking.damage_deposit_authorization_id!));
      damageDepositReleased = true;
      console.log(`✅ Damage deposit hold released: ${booking.damage_deposit_authorization_id}`);
    } catch (depositError) {
      // Log but don't block the cancellation — deposit release can be done manually
      console.error('Failed to release damage deposit hold:', depositError);
    }
  }

  // ── Update DB ────────────────────────────────────────────────────────────
  const updatedBooking = await updateBookingCancellation(bookingId, {
    stripeRefundId,
    refundAmount: actualRefundAmount,
    cancellationReason: opts.cancellationReason,
    damageDepositReleased,
  });
  if (!updatedBooking) {
    // Someone else cancelled it between our read and this write — stop here so
    // the calendar/door-code/email steps aren't run twice.
    throw new CancelBookingError('Booking is already cancelled', 400);
  }

  // ── Remove Calendar Event ────────────────────────────────────────────────
  // Free the date on the public availability view. Non-blocking: refund + DB
  // are already done, so a calendar hiccup must not fail the request.
  const calendarEventDeleted = await deleteCalendarEvent(booking.calendar_event_id);
  if (calendarEventDeleted && booking.calendar_event_id) {
    await clearCalendarEventId(bookingId);
  }

  // ── Revoke Door Codes ────────────────────────────────────────────────────
  // A cancelled booking must never keep working door codes. Never throws.
  const accessCodes = await revokeAccessCodesForBooking(booking.customer_name, booking.selected_date);

  // ── Send Cancellation Email ──────────────────────────────────────────────
  let cancellationEmailSent = false;
  try {
    const emailResult = await sendCancellationEmail(
      {
        customerName: booking.customer_name,
        customerEmail: booking.customer_email,
        bookingRef: booking.booking_ref,
        eventDate: booking.selected_date,
        eventType: booking.event_type,
        refundAmount: actualRefundAmount,
        cancellationReason: opts.cancellationReason,
      },
      { idempotencyKey: `booking-cancelled:${bookingId}` }
    );

    if (emailResult.success) {
      cancellationEmailSent = true;
      await logEmailSent(bookingId, 'cancellation', booking.customer_email, 'sent');
    } else {
      await logEmailSent(bookingId, 'cancellation', booking.customer_email, 'failed', emailResult.error);
    }
  } catch (emailError) {
    console.error('Error sending cancellation email:', emailError);
    await logEmailSent(
      bookingId,
      'cancellation',
      booking.customer_email,
      'failed',
      emailError instanceof Error ? emailError.message : 'Unknown error'
    );
  }

  return {
    booking: updatedBooking,
    refundAmount: actualRefundAmount,
    stripeRefundId,
    damageDepositReleased,
    calendarEventDeleted,
    accessCodes,
    cancellationEmailSent,
  };
}
