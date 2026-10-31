import { NextRequest, NextResponse } from 'next/server';
import {
  calculateBookingPriceWithSurcharges,
  calculateEventTimes,
  validateBookingTimes,
  type BookingTimeInput,
} from '../../../lib/booking';
import { getDamageDepositForBooking } from '../../../lib/deposit-tiers-server';

/**
 * Pre-payment damage deposit quote.
 *
 * Recomputes price and times server-side from the same booking fields that
 * /api/payment-success uses, so the amount shown to the renter matches the
 * amount stored on the booking. Responds with the deposit amount ONLY — never
 * any booking history or whether a match was found.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const bookingData = body?.bookingData;

    if (
      !bookingData ||
      !bookingData.selectedDate ||
      (bookingData.bookingType !== 'hourly' && bookingData.bookingType !== 'fullday')
    ) {
      return NextResponse.json({ error: 'Missing booking date or type.' }, { status: 400 });
    }

    const timeInput: BookingTimeInput = {
      selectedDate: String(bookingData.selectedDate),
      startTime: bookingData.startTime ? String(bookingData.startTime) : undefined,
      bookingType: bookingData.bookingType,
      duration: Number(bookingData.duration) || 0,
      earlyAccessOption: bookingData.earlyAccessOption ?? 'none',
      lateAccessOption: bookingData.lateAccessOption ?? 'none',
    };

    const timeValidation = validateBookingTimes(timeInput);
    if (!timeValidation.valid) {
      return NextResponse.json(
        { error: timeValidation.error || 'Invalid booking time selection.' },
        { status: 400 }
      );
    }

    const { totalPrice } = calculateBookingPriceWithSurcharges(timeInput);
    const { dateOnly, startTime, endTime } = calculateEventTimes(timeInput);

    const damageDepositAmount = await getDamageDepositForBooking({
      calculatedPrice: totalPrice,
      selectedDate: dateOnly,
      startTime,
      endTime,
      email: typeof bookingData.email === 'string' ? bookingData.email : '',
      phone: typeof bookingData.phone === 'string' ? bookingData.phone : '',
    });

    return NextResponse.json(
      { damageDepositAmount },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error calculating damage deposit quote:', error);
    return NextResponse.json({ error: 'Failed to calculate damage deposit' }, { status: 500 });
  }
}
