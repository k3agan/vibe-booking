import { NextRequest, NextResponse } from 'next/server';
import { getBookingById } from '@/lib/database';
import { requireAdmin } from '@/lib/admin-auth';
import {
  cancelBooking,
  CancelBookingError,
  clearCalendarEventId,
  deleteCalendarEvent,
} from '@/lib/cancel-booking';

/**
 * Admin cancellation. The pipeline itself (refund across both Stripe accounts,
 * deposit-hold release, DB, calendar, Seam door codes, email) lives in
 * lib/cancel-booking.ts so the damage-deposit cron cancels bookings the exact
 * same way.
 */
export async function POST(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

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
          await clearCalendarEventId(bookingId);
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

    let result;
    try {
      result = await cancelBooking(booking, {
        // null/undefined = full refund (unchanged admin default)
        refundAmount: refundAmount != null ? Number(refundAmount) : null,
        cancellationReason: cancellationReason ?? null,
        cancelledBy: 'admin',
      });
    } catch (err) {
      if (err instanceof CancelBookingError) {
        return NextResponse.json({ success: false, message: err.message }, { status: err.status });
      }
      throw err;
    }

    const actualRefundAmount = result.refundAmount;
    return NextResponse.json({
      success: true,
      booking: result.booking,
      refundIssued: actualRefundAmount != null && actualRefundAmount > 0,
      refundAmount: actualRefundAmount,
      stripeRefundId: result.stripeRefundId,
      damageDepositReleased: result.damageDepositReleased,
      calendarEventDeleted: result.calendarEventDeleted,
      accessCodesRevoked: result.accessCodes.revoked,
      accessCodeErrors: result.accessCodes.errors,
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
