import { NextRequest, NextResponse } from 'next/server';
import { format, toZonedTime } from 'date-fns-tz';
import { createBooking, logEmailSent } from '../../../lib/database';
import { sendBookingConfirmation } from '../../lib/email';
import { calculateBookingPrice, calculateEventTimes, createCalendarEventForBooking } from '../../../lib/booking';
import { validateAndConsumeDiscountCode } from '../../../lib/discount-codes';

const FRIEND_CODE_REGEX = /(friend|discount)\s*code\s*[:#]\s*([a-z0-9_-]+)/i;

function extractFriendCode(notes?: string): string | null {
  if (!notes) return null;
  const match = notes.match(FRIEND_CODE_REGEX);
  return match?.[2] ?? null;
}

function stripFriendCode(notes?: string): string | undefined {
  if (!notes) return undefined;
  const stripped = notes.replace(FRIEND_CODE_REGEX, '').trim();
  return stripped.length > 0 ? stripped : undefined;
}

export async function POST(request: NextRequest) {
  try {
    const { bookingData } = await request.json();

    if (!bookingData) {
      return NextResponse.json({ error: 'Booking data is required' }, { status: 400 });
    }

    if (!bookingData.name || !bookingData.email || !bookingData.phone || !bookingData.eventType) {
      return NextResponse.json({ error: 'Missing required booking fields' }, { status: 400 });
    }

    if (bookingData.bookingType === 'hourly' && !bookingData.startTime) {
      return NextResponse.json({ error: 'Start time is required for hourly bookings' }, { status: 400 });
    }

    const friendCode = extractFriendCode(bookingData.specialRequirements);
    if (!friendCode) {
      return NextResponse.json({ error: 'Friend code not found in notes' }, { status: 400 });
    }

    const normalizedCode = friendCode.trim().toUpperCase();
    const discountCode = await validateAndConsumeDiscountCode(normalizedCode);

    if (!discountCode) {
      return NextResponse.json({ error: 'Invalid or expired friend code' }, { status: 400 });
    }

    const basePrice = calculateBookingPrice(bookingData);
    let discountedPrice = basePrice;

    if (discountCode.discount_type === 'full') {
      discountedPrice = 0;
    } else if (discountCode.discount_type === 'percent') {
      discountedPrice = Math.max(0, basePrice * (1 - discountCode.discount_value / 100));
    } else if (discountCode.discount_type === 'fixed') {
      discountedPrice = Math.max(0, basePrice - discountCode.discount_value);
    }

    discountedPrice = Number(discountedPrice.toFixed(2));

    if (discountedPrice > 0) {
      return NextResponse.json(
        { error: 'Friend code does not cover full booking amount' },
        { status: 400 }
      );
    }

    const bookingRef = `CHH-${Date.now()}`;
    const sanitizedBookingData = {
      ...bookingData,
      startTime: bookingData.bookingType === 'fullday' ? '08:00' : bookingData.startTime,
      specialRequirements: stripFriendCode(bookingData.specialRequirements),
    };

    const { dateOnly, startDateTime, endDateTime } = calculateEventTimes(sanitizedBookingData);

    const calendarEventId = await createCalendarEventForBooking(
      sanitizedBookingData,
      startDateTime,
      endDateTime
    );

    const savedBooking = await createBooking({
      bookingRef,
      customerName: sanitizedBookingData.name,
      customerEmail: sanitizedBookingData.email,
      customerPhone: sanitizedBookingData.phone,
      organization: sanitizedBookingData.organization,
      eventType: sanitizedBookingData.eventType,
      guestCount: parseInt(sanitizedBookingData.guestCount),
      specialRequirements: sanitizedBookingData.specialRequirements,
      selectedDate: dateOnly,
      startTime: sanitizedBookingData.startTime,
      endTime: format(toZonedTime(endDateTime, 'America/Vancouver'), 'HH:mm', {
        timeZone: 'America/Vancouver',
      }),
      bookingType: sanitizedBookingData.bookingType,
      duration: sanitizedBookingData.duration,
      calculatedPrice: discountedPrice,
      paymentIntentId: null,
      paymentStatus: 'comped',
      calendarEventId,
      discountCode: discountCode.code,
      discountType: discountCode.discount_type,
      discountValue: discountCode.discount_value,
      comped: true,
    });

    try {
      const emailResult = await sendBookingConfirmation({
        bookingRef,
        bookingData: sanitizedBookingData,
        calculatedPrice: discountedPrice,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        comped: true,
      });

      if (emailResult.success) {
        await logEmailSent(savedBooking.id, 'confirmation', sanitizedBookingData.email, 'sent');
        await logEmailSent(savedBooking.id, 'confirmation', 'info@caphillhall.ca', 'sent');
      } else {
        await logEmailSent(
          savedBooking.id,
          'confirmation',
          sanitizedBookingData.email,
          'failed',
          emailResult.error
        );
      }
    } catch (emailError) {
      console.error('Error sending confirmation emails:', emailError);
      await logEmailSent(
        savedBooking.id,
        'confirmation',
        sanitizedBookingData.email,
        'failed',
        emailError instanceof Error ? emailError.message : 'Unknown error'
      );
    }

    return NextResponse.json({
      success: true,
      bookingRef,
      message: 'Friend booking confirmed successfully!',
    });
  } catch (error) {
    console.error('Error processing friend booking:', error);
    return NextResponse.json(
      { error: 'Failed to process friend booking' },
      { status: 500 }
    );
  }
}
