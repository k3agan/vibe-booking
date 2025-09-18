import { NextRequest, NextResponse } from 'next/server';
import { getUpcomingBookings, markReminderSent, logEmailSent } from '../../../../lib/database';
import { sendEventReminder } from '../../../lib/email';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (optional security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get bookings happening in the next 24-48 hours
    const upcomingBookings = await getUpcomingBookings(2); // Next 2 days
    
    console.log(`[CRON] Found ${upcomingBookings.length} upcoming bookings`);
    
    const results = [];
    let remindersSent = 0;
    let remindersFailed = 0;
    
    for (const booking of upcomingBookings) {
      // Skip if reminder already sent
      if (booking.reminder_sent) {
        console.log(`[CRON] Skipping booking ${booking.booking_ref} - reminder already sent`);
        continue;
      }
      
      // Calculate hours until event
      const eventDateTime = new Date(`${booking.selected_date}T${booking.start_time}`);
      const now = new Date();
      const hoursUntilEvent = (eventDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      // Send reminder if event is within 24-48 hours
      if (hoursUntilEvent > 0 && hoursUntilEvent <= 48) {
        console.log(`[CRON] Sending reminder for booking ${booking.booking_ref} (${hoursUntilEvent.toFixed(1)}h until event)`);
        
        const emailResult = await sendEventReminder({
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
          remindersSent++;
          await markReminderSent(booking.id);
          await logEmailSent(booking.id, 'reminder', booking.customer_email, 'sent');
          results.push({ bookingRef: booking.booking_ref, status: 'sent' });
          console.log(`[CRON] Reminder sent successfully for ${booking.booking_ref}`);
        } else {
          remindersFailed++;
          await logEmailSent(booking.id, 'reminder', booking.customer_email, 'failed', emailResult.error);
          results.push({ bookingRef: booking.booking_ref, status: 'failed', error: emailResult.error });
          console.error(`[CRON] Failed to send reminder for ${booking.booking_ref}:`, emailResult.error);
        }
      } else {
        console.log(`[CRON] Booking ${booking.booking_ref} is not within reminder window (${hoursUntilEvent.toFixed(1)}h until event)`);
      }
    }

    const response = {
      success: true,
      message: `Cron job completed. Processed ${upcomingBookings.length} bookings.`,
      remindersSent,
      remindersFailed,
      results,
      timestamp: new Date().toISOString()
    };

    console.log(`[CRON] Reminder job completed:`, response);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[CRON] Error in reminder cron job:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
