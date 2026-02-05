 import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { calculateEventTimes, validateBookingTimes } from '@/lib/booking';

// Initialize Google Calendar API
const calendar = google.calendar({ version: 'v3' });

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

const calendarId = process.env.GOOGLE_CALENDAR_ID || 'capitolhillhallrent@gmail.com';

export async function POST(request: NextRequest) {
  try {
    const { selectedDate, startTime, duration, bookingType, earlyAccessOption, lateAccessOption } = await request.json();

    if (!selectedDate) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    const timeValidation = validateBookingTimes({
      selectedDate,
      startTime,
      duration,
      bookingType,
      earlyAccessOption,
      lateAccessOption,
    });
    if (!timeValidation.valid) {
      return NextResponse.json(
        { error: timeValidation.error || 'Invalid booking time selection.' },
        { status: 400 }
      );
    }

    // Check if we're in production and have calendar credentials
    if (process.env.NODE_ENV === 'production' && !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('Calendar availability check disabled in production - missing private key');
      // Return available to allow bookings to proceed (manual calendar management required)
      return NextResponse.json({
        available: true,
        conflictingEvents: [],
        requestedTime: {
          start: new Date(`${selectedDate}T${startTime}:00`).toISOString(),
          end: new Date(`${selectedDate}T${startTime}:00`).toISOString(),
        },
        note: 'Calendar integration disabled - manual availability check required'
      });
    }

    // Calculate start and end times
    const { startDateTime, endDateTime } = calculateEventTimes({
      selectedDate,
      startTime,
      duration,
      bookingType,
      earlyAccessOption,
      lateAccessOption,
    });

    const authClient = await auth.getClient();

    // Check for conflicts
    const response = await calendar.events.list({
      auth: authClient as any,
      calendarId,
      timeMin: startDateTime.toISOString(),
      timeMax: endDateTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const conflictingEvents = response.data.items || [];

    // Check if there are any conflicts
    const hasConflict = conflictingEvents.some(event => {
      const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
      const eventEnd = new Date(event.end?.dateTime || event.end?.date || '');
      
      // Check if events overlap
      return (eventStart < endDateTime && eventEnd > startDateTime);
    });

    return NextResponse.json({
      available: !hasConflict,
      conflictingEvents: conflictingEvents.map(event => ({
        summary: event.summary,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
      })),
      requestedTime: {
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    );
  }
}
