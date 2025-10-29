import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { supabase } from '../../../../lib/supabase';
import { deleteAccessCodesForBooking } from '../../../../lib/seam';

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

/**
 * Google Calendar webhook endpoint
 * Receives push notifications when calendar events are modified
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('📅 Google Calendar webhook received:', JSON.stringify(body, null, 2));

    // Verify this is a valid Google Calendar notification
    if (!body || !body.channelId) {
      console.log('❌ Invalid webhook payload - missing channelId');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Handle different notification types
    if (body.type === 'sync') {
      console.log('🔄 Sync notification received - calendar events may have changed');
      await syncCalendarEvents();
    } else if (body.type === 'stop') {
      console.log('🛑 Webhook channel stopped - need to re-register');
      // In production, you might want to automatically re-register here
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error processing calendar webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Syncs Google Calendar events with database bookings
 * This is the core function that keeps everything in sync
 */
async function syncCalendarEvents() {
  try {
    console.log('🔄 Starting calendar sync...');

    const authClient = await auth.getClient();

    // Get all events from the last 30 days to the next 90 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const response = await calendar.events.list({
      auth: authClient as any,
      calendarId,
      timeMin: thirtyDaysAgo.toISOString(),
      timeMax: ninetyDaysFromNow.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    console.log(`📅 Found ${events.length} calendar events to sync`);

    // Get all bookings from the database
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .gte('selected_date', thirtyDaysAgo.toISOString().split('T')[0])
      .lte('selected_date', ninetyDaysFromNow.toISOString().split('T')[0])
      .eq('status', 'confirmed');

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError);
      return;
    }

    console.log(`📊 Found ${bookings?.length || 0} database bookings to compare`);

    // Process each calendar event
    for (const event of events) {
      await processCalendarEvent(event, bookings || []);
    }

    console.log('✅ Calendar sync completed');
  } catch (error) {
    console.error('❌ Error during calendar sync:', error);
  }
}

/**
 * Processes a single calendar event and updates the database if needed
 */
async function processCalendarEvent(event: any, bookings: any[]) {
  try {
    // Extract booking information from event description
    const description = event.description || '';
    const bookingId = extractFromDescription(description, 'Booking ID:');
    const eventType = extractFromDescription(description, 'Event Type:');
    const contactName = extractFromDescription(description, 'Contact:');
    const email = extractFromDescription(description, 'Contact:')?.match(/\(([^,]+)/)?.[1];
    const phone = extractFromDescription(description, 'Contact:')?.match(/\([^,]+,\s*([^)]+)/)?.[1];
    const guestCount = extractFromDescription(description, 'Attendees:')?.match(/(\d+)/)?.[1];
    const organization = extractFromDescription(description, 'Organization:');
    const specialRequirements = extractFromDescription(description, 'Special Requirements:');

    // Skip if this doesn't look like a booking event
    if (!eventType || !contactName || !email) {
      console.log(`⏭️ Skipping event ${event.id} - not a booking event`);
      return;
    }

    // Find matching booking - prefer booking ID if available, fallback to name/email
    let matchingBooking;
    if (bookingId) {
      console.log(`🔍 Looking for booking by ID: ${bookingId}`);
      matchingBooking = bookings.find(b => b.id === bookingId);
    }
    
    if (!matchingBooking) {
      console.log(`🔍 Looking for booking by name/email: ${contactName} / ${email}`);
      matchingBooking = bookings.find(b => 
        b.customer_name === contactName && b.customer_email === email
      );
    }

    // Parse event times
    const startTime = event.start?.dateTime || event.start?.date;
    const endTime = event.end?.dateTime || event.end?.date;

    if (!startTime || !endTime) {
      console.log(`⏭️ Skipping event ${event.id} - missing start/end times`);
      return;
    }


    // Convert to Vancouver timezone
    const vancouverTimezone = 'America/Vancouver';
    const startDateVancouver = toZonedTime(new Date(startTime), vancouverTimezone);
    const endDateVancouver = toZonedTime(new Date(endTime), vancouverTimezone);

    const selectedDate = startDateVancouver.toISOString().split('T')[0];
    const startTimeStr = startDateVancouver.toTimeString().split(' ')[0].substring(0, 5);
    const endTimeStr = endDateVancouver.toTimeString().split(' ')[0].substring(0, 5);

    if (!matchingBooking) {
      console.log(`⏭️ No matching booking found for event ${event.id}`);
      return;
    }

    // Check if the booking needs to be updated
    const needsUpdate = 
      matchingBooking.selected_date !== selectedDate ||
      matchingBooking.start_time !== startTimeStr ||
      matchingBooking.end_time !== endTimeStr;

    if (!needsUpdate) {
      console.log(`✅ Booking ${matchingBooking.booking_ref} is already in sync`);
      return;
    }

    console.log(`🔄 Updating booking ${matchingBooking.booking_ref} with new times:`);
    console.log(`   Old: ${matchingBooking.selected_date} ${matchingBooking.start_time}-${matchingBooking.end_time}`);
    console.log(`   New: ${selectedDate} ${startTimeStr}-${endTimeStr}`);

    // Clean up old access codes
    await deleteAccessCodesForBooking(matchingBooking.customer_name, matchingBooking.selected_date);

    // Update the booking in database
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        selected_date: selectedDate,
        start_time: startTimeStr,
        end_time: endTimeStr,
        reminder_sent: false, // Reset so new access code will be created
        followup_sent: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', matchingBooking.id);

    if (updateError) {
      console.error(`❌ Error updating booking ${matchingBooking.booking_ref}:`, updateError);
      return;
    }

    console.log(`✅ Successfully updated booking ${matchingBooking.booking_ref}`);
    console.log(`   New access code will be created 24-48 hours before the new event date`);

  } catch (error) {
    console.error(`❌ Error processing event ${event.id}:`, error);
  }
}

/**
 * Helper function to extract information from event description
 */
function extractFromDescription(description: string, label: string): string | null {
  const regex = new RegExp(`${label}\\s*([^\\n]+)`, 'i');
  const match = description.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * GET endpoint to manually trigger a sync (for testing)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    if (!force) {
      return NextResponse.json({
        message: 'Add ?force=true to trigger manual sync',
        note: 'This endpoint is for testing the calendar sync functionality'
      });
    }

    console.log('🔄 Manual calendar sync triggered');
    await syncCalendarEvents();

    return NextResponse.json({
      success: true,
      message: 'Calendar sync completed'
    });
  } catch (error) {
    console.error('❌ Error in manual sync:', error);
    return NextResponse.json(
      { error: 'Manual sync failed' },
      { status: 500 }
    );
  }
}
