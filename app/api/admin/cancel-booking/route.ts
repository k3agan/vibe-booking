import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '../../../../lib/supabase';
import { getStripeApiKey } from '@/lib/api-key-rotation';
import { getBookingById, updateBookingCancellation } from '@/lib/database';
import { sendCancellationEmail } from '../../../lib/email';
import { logEmailSent } from '@/lib/database';

const stripe = new Stripe(getStripeApiKey(), {
  apiVersion: '2025-08-27.basil',
});

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

    // Guard against double-cancellation
    if (booking.status === 'cancelled') {
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

          const refund = await stripe.refunds.create(refundParams);
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
        await stripe.paymentIntents.cancel(booking.damage_deposit_authorization_id);
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
