import { NextRequest, NextResponse } from 'next/server';
import { getCompletedBookings, markFollowUpSent, logEmailSent } from '../../../lib/database';
import { sendPostEventFollowUp } from '../../lib/email';

export async function POST(request: NextRequest) {
  try {
    // Get bookings that completed 1-2 days ago and haven't had follow-up sent
    const completedBookings = await getCompletedBookings(2); // Last 2 days
    
    console.log(`Found ${completedBookings.length} completed bookings needing follow-up`);
    
    const results = [];
    
    for (const booking of completedBookings) {
      // Skip if follow-up already sent
      if (booking.followup_sent) {
        console.log(`Skipping booking ${booking.booking_ref} - follow-up already sent`);
        continue;
      }
      
      // Check if booking completed 1-2 days ago
      const eventDate = new Date(booking.selected_date);
      const now = new Date();
      const daysSinceEvent = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Send follow-up if event was 1-2 days ago
      if (daysSinceEvent >= 1 && daysSinceEvent <= 2) {
        console.log(`Sending follow-up for booking ${booking.booking_ref} (${daysSinceEvent.toFixed(1)} days ago)`);
        
        try {
          // Send follow-up email
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
            // Mark follow-up as sent
            await markFollowUpSent(booking.id);
            
            // Log email sent
            await logEmailSent(booking.id, 'followup', booking.customer_email, 'sent');
            
            results.push({
              bookingRef: booking.booking_ref,
              customerEmail: booking.customer_email,
              status: 'sent',
              daysSinceEvent: Math.round(daysSinceEvent)
            });
            
            console.log(`✅ Follow-up sent for ${booking.booking_ref}`);
          } else {
            // Log email failure
            await logEmailSent(booking.id, 'followup', booking.customer_email, 'failed', emailResult.error);
            
            results.push({
              bookingRef: booking.booking_ref,
              customerEmail: booking.customer_email,
              status: 'failed',
              error: emailResult.error,
              daysSinceEvent: Math.round(daysSinceEvent)
            });
            
            console.log(`❌ Failed to send follow-up for ${booking.booking_ref}: ${emailResult.error}`);
          }
        } catch (error) {
          console.error(`Error sending follow-up for ${booking.booking_ref}:`, error);
          
          // Log email failure
          await logEmailSent(booking.id, 'followup', booking.customer_email, 'failed', error instanceof Error ? error.message : 'Unknown error');
          
          results.push({
            bookingRef: booking.booking_ref,
            customerEmail: booking.customer_email,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            daysSinceEvent: Math.round(daysSinceEvent)
          });
        }
      } else {
        console.log(`Booking ${booking.booking_ref} was ${daysSinceEvent.toFixed(1)} days ago - not in follow-up window`);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Processed ${completedBookings.length} completed bookings`,
      followUpsSent: results.filter(r => r.status === 'sent').length,
      followUpsFailed: results.filter(r => r.status === 'failed' || r.status === 'error').length,
      results
    });
  } catch (error) {
    console.error('Error processing follow-ups:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to process follow-ups'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check completed bookings without sending emails
export async function GET(request: NextRequest) {
  try {
    const completedBookings = await getCompletedBookings(7); // Last 7 days
    
    const bookingsWithFollowUpStatus = completedBookings.map(booking => {
      const eventDate = new Date(booking.selected_date);
      const now = new Date();
      const daysSinceEvent = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24);
      
      return {
        bookingRef: booking.booking_ref,
        customerName: booking.customer_name,
        customerEmail: booking.customer_email,
        eventType: booking.event_type,
        eventDate: booking.selected_date,
        eventTime: booking.start_time,
        daysSinceEvent: Math.round(daysSinceEvent),
        followUpSent: booking.followup_sent,
        needsFollowUp: daysSinceEvent >= 1 && daysSinceEvent <= 2 && !booking.followup_sent
      };
    });
    
    return NextResponse.json({
      success: true,
      totalBookings: completedBookings.length,
      bookingsNeedingFollowUp: bookingsWithFollowUpStatus.filter(b => b.needsFollowUp).length,
      bookings: bookingsWithFollowUpStatus
    });
  } catch (error) {
    console.error('Error fetching completed bookings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to fetch completed bookings'
      },
      { status: 500 }
    );
  }
}
