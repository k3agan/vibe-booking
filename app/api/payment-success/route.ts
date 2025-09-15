import { NextRequest, NextResponse } from 'next/server';
import { sendBookingConfirmation } from '../../lib/email';

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId, bookingData } = await request.json();

    console.log('Payment successful:', {
      paymentIntentId,
      bookingData,
    });

    // Generate a booking reference number
    const bookingRef = `CHH-${Date.now()}`;

    // Calculate pricing
    const isWeekend = [5, 6, 0].includes(new Date(bookingData.selectedDate).getDay()); // Fri, Sat, Sun
    const hourlyRate = isWeekend ? 100 : 50;
    const fullDayRate = isWeekend ? 900 : 750;
    
    let calculatedPrice = 0;
    if (bookingData.bookingType === 'fullday') {
      calculatedPrice = fullDayRate;
    } else {
      calculatedPrice = hourlyRate * bookingData.duration;
    }

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

    // Create calendar event (with production error handling)
    try {
      // Check if we're in production and disable calendar creation if there are key issues
      if (process.env.NODE_ENV === 'production' && !process.env.GOOGLE_PRIVATE_KEY) {
        console.log('Calendar event creation disabled in production - missing private key');
        console.log('Booking details for manual entry:', {
          eventType: bookingData.eventType,
          name: bookingData.name,
          email: bookingData.email,
          phone: bookingData.phone,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          guestCount: bookingData.guestCount
        });
      } else {
        // Import the calendar API function directly instead of making HTTP request
        const { google } = await import('googleapis');
        
        // Initialize Google Calendar API
        const calendar = google.calendar({ version: 'v3' });
        
        // Set up authentication with better error handling
        const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
        
        if (!privateKey || !process.env.GOOGLE_CLIENT_EMAIL) {
          throw new Error('Missing Google Calendar credentials');
        }
        
        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: privateKey,
          },
          scopes: ['https://www.googleapis.com/auth/calendar'],
        });

        const calendarId = process.env.GOOGLE_CALENDAR_ID || 'capitolhillhallrent@gmail.com';
        const authClient = await auth.getClient();

        // Create event details
        const eventSummary = `${bookingData.eventType} - ${bookingData.name}`;
        const eventDescription = `
Event Type: ${bookingData.eventType}
Contact: ${bookingData.name} (${bookingData.email}, ${bookingData.phone})
Attendees: ${bookingData.guestCount} people
${bookingData.organization ? `Organization: ${bookingData.organization}` : ''}
${bookingData.specialRequirements ? `Special Requirements: ${bookingData.specialRequirements}` : ''}

Booking Details:
- Duration: ${bookingData.bookingType === 'hourly' ? `${bookingData.duration} hours` : 'Full day'}
- Start Time: ${new Date(startDateTime.toISOString()).toLocaleString()}
- End Time: ${new Date(endDateTime.toISOString()).toLocaleString()}
        `.trim();

        // Create the calendar event
        const event = await calendar.events.insert({
          auth: authClient as any,
          calendarId,
          requestBody: {
            summary: eventSummary,
            description: eventDescription,
            start: {
              dateTime: startDateTime.toISOString(),
              timeZone: 'America/Vancouver',
            },
            end: {
              dateTime: endDateTime.toISOString(),
              timeZone: 'America/Vancouver',
            },
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'email', minutes: 24 * 60 }, // 1 day before
                { method: 'popup', minutes: 60 }, // 1 hour before
              ],
            },
          },
        });

        console.log('Calendar event created:', event.data.id);
      }
    } catch (calendarError) {
      console.error('Calendar error:', calendarError);
      // Don't fail the booking if calendar creation fails
    }

    // Send confirmation emails
    try {
      const emailResult = await sendBookingConfirmation({
        bookingRef,
        bookingData,
        calculatedPrice,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
      });
      
      if (emailResult.success) {
        console.log('Confirmation emails sent successfully');
      } else {
        console.error('Failed to send confirmation emails:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Error sending confirmation emails:', emailError);
      // Don't fail the booking if email sending fails
    }

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
