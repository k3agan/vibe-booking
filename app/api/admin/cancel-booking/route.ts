import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { google } from 'googleapis';
import { supabase } from '../../../../lib/supabase';
import { getAllStripeSecretKeys } from '@/lib/api-key-rotation';
import { getBookingById, updateBookingCancellation } from '@/lib/database';
import { sendCancellationEmail } from '../../../lib/email';
import { logEmailSent } from '@/lib/database';

const STRIPE_API_VERSION = '2025-08-27.basil';

/**
 * Delete the Google Calendar event tied to a cancelled booking so the date
 * frees up on the public availability view (which reads straight from the
 * calendar). Best-effort: a calendar failure must never block the refund/DB
 * update that already succeeded, so this only logs on error. Mirrors the auth
 * pattern used by app/api/calendar/route.ts (service account + calendar scope).
 * Treats an already-gone event (404/410/deleted) as success.
 */
async function deleteCalendarEvent(eventId: string | null | undefined): Promise<boolean> {
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

/**
 * True when a Stripe error means "this resource doesn't exist on THIS account."
 * That's the signal to retry the same operation against the other rotated key,
 * since keys rotate daily and the payment may live on a different account than
 * the one active today.
 */
function isResourceMissing(err: unknown): boolean {
  if (err && typeof err === 'object') {
    const e = err as { code?: string; statusCode?: number; message?: string };
    if (e.code === 'resource_missing') return true;
    if (e.statusCode === 404) return true;
    if (typeof e.message === 'string' && /no such (payment_intent|charge|refund)/i.test(e.message)) {
      return true;
    }
  }
  return false;
}

/**
 * Run a Stripe operation against each configured key (active account first)
 * until one finds the referenced resource. Falls through to the next key ONLY
 * when the resource is missing on the current account — any other error
 * (e.g. charge already refunded, invalid amount) is thrown immediately so we
 * never double-act across accounts. This is what makes the admin portal's
 * cancel/refund work regardless of which rotated key processed the original
 * payment.
 */
async function withStripeFallback<T>(fn: (stripe: Stripe) => Promise<T>): Promise<T> {
  const keys = getAllStripeSecretKeys();
  if (keys.length === 0) {
    throw new Error('No Stripe secret key configured');
  }

  let lastErr: unknown;
  for (let i = 0; i < keys.length; i++) {
    const stripe = new Stripe(keys[i], { apiVersion: STRIPE_API_VERSION });
    try {
      return await fn(stripe);
    } catch (err) {
      lastErr = err;
      if (isResourceMissing(err) && i < keys.length - 1) {
        console.warn(
          `[cancel-booking] Stripe resource missing on key #${i + 1} (…${keys[i].slice(-4)}), trying next rotated key`
        );
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export async function POST(request: NextRequest) {
  try {
    const { bookingId, refundAmount, cancellationReason } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Fetch full booking record
    const booking = await getBookingById(bookingId);

    if (!booking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      );
    }

    // Guard against double-cancellation. Idempotent backfill: if a booking was
    // already cancelled but still carries a calendar event (older cancellations
    // pre-dating calendar cleanup), remove the event and clear the stored id
    // instead of erroring. No refund/email is re-run.
    if (booking.status === 'cancelled') {
      if (booking.calendar_event_id) {
        const deleted = await deleteCalendarEvent(booking.calendar_event_id);
        if (deleted) {
          await supabase
            .from('bookings')
            .update({ calendar_event_id: null, updated_at: new Date().toISOString() })
            .eq('id', bookingId);
        }
        return NextResponse.json({
          success: true,
          alreadyCancelled: true,
          calendarEventDeleted: deleted,
          message: deleted
            ? 'Booking already cancelled — lingering calendar event removed'
            : 'Booking already cancelled — calendar event could not be removed (see logs)',
        });
      }
      return NextResponse.json(
        { success: false, message: 'Booking is already cancelled' },
        { status: 400 }
      );
    }

    let stripeRefundId: string | null = null;
    let actualRefundAmount: number | null = null;
    let damageDepositReleased = false;

    // ── Stripe Refund ────────────────────────────────────────────────────────
    if (booking.payment_intent_id && booking.payment_status === 'succeeded') {
      // Validate refund amount — never refund more than what was charged
      const maxRefund = booking.calculated_price;
      const requestedRefund = refundAmount != null ? Number(refundAmount) : maxRefund;

      if (requestedRefund < 0) {
        return NextResponse.json(
          { success: false, message: 'Refund amount cannot be negative' },
          { status: 400 }
        );
      }

      if (requestedRefund > maxRefund) {
        return NextResponse.json(
          { success: false, message: `Refund amount ($${requestedRefund}) exceeds the amount charged ($${maxRefund}). Cannot over-refund.` },
          { status: 400 }
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
              cancelled_by: 'admin',
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
          return NextResponse.json(
            {
              success: false,
              message: `Stripe refund failed: ${stripeError instanceof Error ? stripeError.message : 'Unknown error'}`,
            },
            { status: 500 }
          );
        }
      }
    } else if (booking.payment_status === 'comped') {
      // Comped bookings: cancel without any Stripe calls
      console.log('Comped booking — skipping Stripe refund');
    } else if (booking.payment_status === 'cancelled') {
      return NextResponse.json(
        { success: false, message: 'Payment already cancelled for this booking' },
        { status: 400 }
      );
    }

    // ── Release Damage Deposit Hold ──────────────────────────────────────────
    if (
      booking.damage_deposit_authorization_id &&
      booking.damage_deposit_authorization_status === 'authorized'
    ) {
      try {
        await withStripeFallback((stripe) =>
          stripe.paymentIntents.cancel(booking.damage_deposit_authorization_id!)
        );
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
      cancellationReason: cancellationReason ?? null,
      damageDepositReleased,
    });

    // ── Remove Calendar Event ────────────────────────────────────────────────
    // Free the date on the public availability view. Non-blocking: refund + DB
    // are already done, so a calendar hiccup must not fail the request.
    const calendarEventDeleted = await deleteCalendarEvent(booking.calendar_event_id);
    if (calendarEventDeleted && booking.calendar_event_id) {
      await supabase
        .from('bookings')
        .update({ calendar_event_id: null, updated_at: new Date().toISOString() })
        .eq('id', bookingId);
    }

    // ── Send Cancellation Email ──────────────────────────────────────────────
    try {
      const emailResult = await sendCancellationEmail({
        customerName: booking.customer_name,
        customerEmail: booking.customer_email,
        bookingRef: booking.booking_ref,
        eventDate: booking.selected_date,
        eventType: booking.event_type,
        refundAmount: actualRefundAmount,
        cancellationReason: cancellationReason ?? null,
      });

      if (emailResult.success) {
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

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      refundIssued: actualRefundAmount != null && actualRefundAmount > 0,
      refundAmount: actualRefundAmount,
      stripeRefundId,
      damageDepositReleased,
      calendarEventDeleted,
      message: actualRefundAmount
        ? `Booking cancelled and refund of $${actualRefundAmount.toFixed(2)} CAD issued successfully`
        : 'Booking cancelled successfully (no refund issued)',
    });
  } catch (error) {
    console.error('Error in cancel-booking API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
