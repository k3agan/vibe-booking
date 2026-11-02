import Stripe from 'stripe';
import { google } from 'googleapis';
import { supabase, Booking } from './supabase';
import { logEmailSent, updateBookingCancellation } from './database';
import { revokeAccessCodesForBooking, RevokeAccessCodesResult } from './seam';
import { withStripeFallback } from './stripe-accounts';
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
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'CancelBookingError';
  }
}

export interface CancelBookingOptions {
  /**
   * Amount to refund in CAD. `null` = FULL refund of calculated_price (admin
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

export async function cancelBooking(booking: Booking, opts: CancelBookingOptions): Promise<CancelBookingResult> {
  const bookingId = booking.id;

  if (booking.status === 'cancelled') {
    throw new CancelBookingError('Booking is already cancelled', 400);
  }

  let stripeRefundId: string | null = null;
  let actualRefundAmount: number | null = null;
  let damageDepositReleased = false;

  // ── Stripe Refund ────────────────────────────────────────────────────────
  if (booking.payment_intent_id && booking.payment_status === 'succeeded') {
    // Validate refund amount — never refund more than what was charged
    const maxRefund = booking.calculated_price;
    const requestedRefund = opts.refundAmount != null ? Number(opts.refundAmount) : maxRefund;

    if (requestedRefund < 0) {
      throw new CancelBookingError('Refund amount cannot be negative', 400);
    }

    if (requestedRefund > maxRefund) {
      throw new CancelBookingError(
        `Refund amount ($${requestedRefund}) exceeds the amount charged ($${maxRefund}). Cannot over-refund.`,
        400
      );
    }

    if (requestedRefund > 0) {
      try {
        const refundParams: Stripe.RefundCreateParams = {
          payment_intent: booking.payment_intent_id,
          amount: Math.round(requestedRefund * 100), // Convert to cents
          reason: 'requested_by_customer',
          metadata: {
            booking_ref: booking.booking_ref,
            booking_id: bookingId,
            cancelled_by: opts.cancelledBy,
          },
        };

        // Retry across rotated Stripe keys: the payment may have been
        // processed under whichever account was active that day.
        const refund = await withStripeFallback((stripe) => stripe.refunds.create(refundParams));
        stripeRefundId = refund.id;
        actualRefundAmount = requestedRefund;
        console.log(`✅ Stripe refund created: ${refund.id} for $${requestedRefund}`);
      } catch (stripeError) {
        console.error('Stripe refund failed:', stripeError);
        throw new CancelBookingError(
          `Stripe refund failed: ${stripeError instanceof Error ? stripeError.message : 'Unknown error'}`,
          500
        );
      }
    }
  } else if (booking.payment_status === 'comped') {
    // Comped bookings: cancel without any Stripe calls
    console.log('Comped booking — skipping Stripe refund');
  } else if (booking.payment_status === 'cancelled') {
    throw new CancelBookingError('Payment already cancelled for this booking', 400);
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
