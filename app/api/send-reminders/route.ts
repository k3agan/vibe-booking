import { NextRequest, NextResponse } from 'next/server';
import { getUpcomingBookings, markReminderSent, logEmailSent } from '../../../lib/database';
import { sendEventReminder } from '../../lib/email';

export async function POST(request: NextRequest) {
  try {
    // Get bookings happening in the next 24-48 hours
    const upcomingBookings = await getUpcomingBookings(2); // Next 2 days
    
    console.log(`Found ${upcomingBookings.length} upcoming bookings`);
    
    const results = [];
    
    for (const booking of upcomingBookings) {
      // Skip if reminder already sent
      if (booking.reminder_sent) {
        console.log(`Skipping booking ${booking.booking_ref} - reminder already sent`);
        continue;
      }
      
      // Check if booking is within 24-48 hours
      const eventDate = new Date(booking.selected_date);
      const now = new Date();
      const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      // Send reminder if event is between 24-48 hours away
      if (hoursUntilEvent >= 24 && hoursUntilEvent <= 48) {
        console.log(`Sending reminder for booking ${booking.booking_ref} (${hoursUntilEvent.toFixed(1)} hours away)`);
        
        try {
          // Send reminder email
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
            // Mark reminder as sent
            await markReminderSent(booking.id);
            
            // Log email sent
            await logEmailSent(booking.id, 'reminder', booking.customer_email, 'sent');
            
            results.push({
              bookingRef: booking.booking_ref,
              customerEmail: booking.customer_email,
              status: 'sent',
              hoursUntilEvent: Math.round(hoursUntilEvent)
            });
            
            console.log(`✅ Reminder sent for ${booking.booking_ref}`);
          } else {
            // Log email failure
            await logEmailSent(booking.id, 'reminder', booking.customer_email, 'failed', emailResult.error);
            
            results.push({
              bookingRef: booking.booking_ref,
              customerEmail: booking.customer_email,
              status: 'failed',
              error: emailResult.error,
              hoursUntilEvent: Math.round(hoursUntilEvent)
            });
            
            console.log(`❌ Failed to send reminder for ${booking.booking_ref}: ${emailResult.error}`);
          }
        } catch (error) {
          console.error(`Error sending reminder for ${booking.booking_ref}:`, error);
          
          // Log email failure
          await logEmailSent(booking.id, 'reminder', booking.customer_email, 'failed', error instanceof Error ? error.message : 'Unknown error');
          
          results.push({
            bookingRef: booking.booking_ref,
            customerEmail: booking.customer_email,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            hoursUntilEvent: Math.round(hoursUntilEvent)
          });
        }
      } else {
        console.log(`Booking ${booking.booking_ref} is ${hoursUntilEvent.toFixed(1)} hours away - not in reminder window`);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Processed ${upcomingBookings.length} upcoming bookings`,
      remindersSent: results.filter(r => r.status === 'sent').length,
      remindersFailed: results.filter(r => r.status === 'failed' || r.status === 'error').length,
      results
    });
  } catch (error) {
    console.error('Error processing reminders:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to process reminders'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check upcoming bookings without sending emails
export async function GET(request: NextRequest) {
  try {
    const upcomingBookings = await getUpcomingBookings(7); // Next 7 days
    
    const bookingsWithReminderStatus = upcomingBookings.map(booking => {
      const eventDate = new Date(booking.selected_date);
      const now = new Date();
      const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      return {
        bookingRef: booking.booking_ref,
        customerName: booking.customer_name,
        customerEmail: booking.customer_email,
        eventType: booking.event_type,
        eventDate: booking.selected_date,
        eventTime: booking.start_time,
        hoursUntilEvent: Math.round(hoursUntilEvent),
        reminderSent: booking.reminder_sent,
        needsReminder: hoursUntilEvent >= 24 && hoursUntilEvent <= 48 && !booking.reminder_sent
      };
    });
    
    return NextResponse.json({
      success: true,
      totalBookings: upcomingBookings.length,
      bookingsNeedingReminders: bookingsWithReminderStatus.filter(b => b.needsReminder).length,
      bookings: bookingsWithReminderStatus
    });
  } catch (error) {
    console.error('Error fetching upcoming bookings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to fetch upcoming bookings'
      },
      { status: 500 }
    );
  }
}
