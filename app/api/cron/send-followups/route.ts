import { NextRequest, NextResponse } from 'next/server';
import { getCompletedBookings, logEmailSent, markFollowupSent } from '../../../../lib/database';
import { sendPostEventFollowUp } from '../../../lib/email';
import { fromZonedTime } from 'date-fns-tz';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (optional security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch bookings that ended 1-2 days ago and haven't had a follow-up sent
    const completedBookings = await getCompletedBookings(2); // Events completed in the last 2 days
    console.log(`[CRON] Found ${completedBookings.length} completed bookings needing follow-up`);

    let followUpsSent = 0;
    let followUpsFailed = 0;
    const results = [];

    for (const booking of completedBookings) {
      // Ensure the event actually ended and is within the 1-2 day window
      const vancouverTimezone = 'America/Vancouver';
      const eventEndDateTime = fromZonedTime(`${booking.selected_date} ${booking.end_time}:00`, vancouverTimezone);
      const nowVancouver = new Date(new Date().toLocaleString("en-US", {timeZone: vancouverTimezone}));
      const diffHours = (nowVancouver.getTime() - eventEndDateTime.getTime()) / (1000 * 60 * 60);

      // Send follow-up if event ended between 24 and 48 hours ago and follow-up not sent
      if (diffHours > 24 && diffHours <= 48 && !booking.followup_sent) {
        console.log(`[CRON] Sending follow-up for booking ${booking.booking_ref} (${diffHours.toFixed(1)}h after event)`);
        
        const emailResult = await sendPostEventFollowUp({
          bookingRef: booking.booking_ref,
          customerName: booking.customer_name,
          customerEmail: booking.customer_email,
          eventType: booking.event_type,
          selectedDate: booking.selected_date,
          startTime: booking.start_time,
          endTime: booking.end_time,
          guestCount: booking.guest_count,
          specialRequirements: booking.special_requirements || undefined,
          organization: booking.organization || undefined,
        });

        if (emailResult.success) {
          followUpsSent++;
          await markFollowupSent(booking.id);
          await logEmailSent(booking.id, 'followup', booking.customer_email, 'sent');
          results.push({ bookingRef: booking.booking_ref, status: 'sent' });
          console.log(`[CRON] Follow-up sent successfully for ${booking.booking_ref}`);
        } else {
          followUpsFailed++;
          await logEmailSent(booking.id, 'followup', booking.customer_email, 'failed', emailResult.error);
          results.push({ bookingRef: booking.booking_ref, status: 'failed', error: emailResult.error });
          console.error(`[CRON] Failed to send follow-up for ${booking.booking_ref}:`, emailResult.error);
        }
      } else {
        console.log(`[CRON] Booking ${booking.booking_ref} is not within the follow-up window or already sent (${diffHours.toFixed(1)}h after event)`);
      }
    }

    const response = {
      success: true,
      message: `Cron job completed. Processed ${completedBookings.length} completed bookings.`,
      followUpsSent,
      followUpsFailed,
      results,
      timestamp: new Date().toISOString()
    };

    console.log(`[CRON] Follow-up job completed:`, response);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[CRON] Error in follow-up cron job:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
