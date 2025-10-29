import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { toZonedTime, format } from 'date-fns-tz';

// Initialize Google Calendar API
const calendar = google.calendar({ version: 'v3' });

// Set up authentication (you'll need to set up OAuth2 or use a service account)
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

const calendarId = process.env.GOOGLE_CALENDAR_ID || 'capitolhillhallrent@gmail.com';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const authClient = await auth.getClient();

    // Get events from calendar
    const response = await calendar.events.list({
      auth: authClient as any,
      calendarId,
      timeMin: startDate,
      timeMax: endDate,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];

    return NextResponse.json({
      events: events.map(event => ({
        id: event.id,
        summary: event.summary,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        description: event.description,
      })),
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { bookingData, startTime, endTime } = await request.json();

    if (!bookingData || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required booking data' },
        { status: 400 }
      );
    }

    const authClient = await auth.getClient();

    // Create event details
    const eventSummary = `${bookingData.eventType} - ${bookingData.name}`;
    const eventDescription = `
Booking ID: ${bookingData.id}
Event Type: ${bookingData.eventType}
Contact: ${bookingData.name} (${bookingData.email}, ${bookingData.phone})
Attendees: ${bookingData.guestCount} people
${bookingData.organization ? `Organization: ${bookingData.organization}` : ''}
${bookingData.specialRequirements ? `Special Requirements: ${bookingData.specialRequirements}` : ''}

Booking Details:
- Duration: ${bookingData.bookingType === 'hourly' ? `${bookingData.duration} hours` : 'Full day'}
- Start Time: ${format(toZonedTime(new Date(startTime), 'America/Vancouver'), 'MMM d, yyyy h:mm a', { timeZone: 'America/Vancouver' })}
- End Time: ${format(toZonedTime(new Date(endTime), 'America/Vancouver'), 'MMM d, yyyy h:mm a', { timeZone: 'America/Vancouver' })}
    `.trim();

    // Create the calendar event
    const event = await calendar.events.insert({
      auth: authClient as any,
      calendarId,
      requestBody: {
        summary: eventSummary,
        description: eventDescription,
        start: {
          dateTime: startTime,
          timeZone: 'America/Vancouver',
        },
        end: {
          dateTime: endTime,
          timeZone: 'America/Vancouver',
        },
        // Note: Service accounts can't invite attendees, so we'll include contact info in description instead
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 60 }, // 1 hour before
          ],
        },
      },
    });

    return NextResponse.json({
      success: true,
      eventId: event.data.id,
      eventLink: event.data.htmlLink,
    });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      status: (error as any)?.status,
      calendarId
    });
    return NextResponse.json(
      { error: 'Failed to create calendar event', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
