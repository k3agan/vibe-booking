import { BookingDataInput } from './booking';

export async function createCalendarEventForBooking(
  bookingData: BookingDataInput,
  startDateTime: Date,
  endDateTime: Date
): Promise<string | undefined> {
  try {
    if (process.env.NODE_ENV === 'production' && !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('Calendar event creation disabled in production - missing private key');
      console.log('Booking details for manual entry:', {
        eventType: bookingData.eventType,
        name: bookingData.name,
        email: bookingData.email,
        phone: bookingData.phone,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        guestCount: bookingData.guestCount,
      });
      return undefined;
    }

    const { google: googleApi } = await import('googleapis');
    const calendar = googleApi.calendar({ version: 'v3' });

    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!privateKey || !process.env.GOOGLE_CLIENT_EMAIL) {
      throw new Error('Missing Google Calendar credentials');
    }

    const auth = new googleApi.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'capitolhillhallrent@gmail.com';
    const authClient = await auth.getClient();

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
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 60 },
          ],
        },
      },
    });

    return event.data?.id || undefined;
  } catch (error) {
    console.error('Calendar error:', error);
    return undefined;
  }
}
