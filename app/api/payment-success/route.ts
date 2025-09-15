import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId, bookingData } = await request.json();

    console.log('Payment successful:', {
      paymentIntentId,
      bookingData,
    });

    // Generate a booking reference number
    const bookingRef = `CHH-${Date.now()}`;

    // Calculate event times
    // Extract just the date part (YYYY-MM-DD) from the selectedDate
    const dateOnly = bookingData.selectedDate.split('T')[0];
    const startDateTime = new Date(`${dateOnly}T${bookingData.startTime}:00`);
    let endDateTime;
    
    if (bookingData.bookingType === 'fullday') {
      // Full day: 8 AM to 11 PM
      endDateTime = new Date(`${dateOnly}T23:00:00`);
    } else {
      // Hourly: add duration to start time
      endDateTime = new Date(startDateTime.getTime() + (bookingData.duration * 60 * 60 * 1000));
    }

    console.log('Date calculation:', {
      selectedDate: bookingData.selectedDate,
      dateOnly,
      startTime: bookingData.startTime,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      duration: bookingData.duration
    });

    // Create calendar event
    try {
      const calendarResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingData,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
        }),
      });

      if (calendarResponse.ok) {
        const calendarResult = await calendarResponse.json();
        console.log('Calendar event created:', calendarResult.eventId);
      } else {
        console.error('Failed to create calendar event');
      }
    } catch (calendarError) {
      console.error('Calendar error:', calendarError);
      // Don't fail the booking if calendar creation fails
    }

    // TODO: Send confirmation email
    // TODO: Save to database

    return NextResponse.json({
      success: true,
      bookingRef,
      message: 'Booking confirmed successfully!',
      eventCreated: true,
    });
  } catch (error) {
    console.error('Error processing payment success:', error);
    return NextResponse.json(
      { error: 'Failed to process booking' },
      { status: 500 }
    );
  }
}
