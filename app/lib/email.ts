import { Resend } from 'resend';
import { format, toZonedTime } from 'date-fns-tz';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface BookingData {
  name: string;
  email: string;
  phone: string;
  organization?: string;
  eventType: string;
  guestCount: string;
  specialRequirements?: string;
  selectedDate: string;
  startTime: string;
  bookingType: 'hourly' | 'fullday';
  duration: number;
}

export interface BookingConfirmation {
  bookingRef: string;
  bookingData: BookingData;
  calculatedPrice: number;
  startDateTime: string;
  endDateTime: string;
}

export async function sendBookingConfirmation(confirmation: BookingConfirmation) {
  try {
    // Customer confirmation email
    await resend.emails.send({
      from: 'Capitol Hill Hall <info@caphillhall.ca>',
      to: [confirmation.bookingData.email],
      subject: `Booking Confirmed - ${confirmation.bookingRef}`,
      html: generateCustomerEmailHTML(confirmation),
    });

    // Management notification email
    await resend.emails.send({
      from: 'Capitol Hill Hall <info@caphillhall.ca>',
      to: ['capitol.hill.hall@gmail.com'], // Hall management email
      subject: `New Booking: ${confirmation.bookingData.eventType} - ${confirmation.bookingRef}`,
      html: generateManagementEmailHTML(confirmation),
    });

    console.log('Booking confirmation emails sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Error sending booking confirmation emails:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendEventReminder(bookingData: {
  bookingRef: string;
  customerName: string;
  customerEmail: string;
  eventType: string;
  selectedDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  specialRequirements?: string;
  organization?: string;
}) {
  try {
    await resend.emails.send({
      from: 'Capitol Hill Hall <info@caphillhall.ca>',
      to: [bookingData.customerEmail],
      subject: `Event Reminder - ${bookingData.bookingRef} - Tomorrow!`,
      html: generateReminderEmailHTML(bookingData),
    });

    console.log('Event reminder email sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Error sending event reminder email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendPostEventFollowUp(bookingData: {
  bookingRef: string;
  customerName: string;
  customerEmail: string;
  eventType: string;
  selectedDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  specialRequirements?: string;
  organization?: string;
}) {
  try {
    await resend.emails.send({
      from: 'Capitol Hill Hall <info@caphillhall.ca>',
      to: [bookingData.customerEmail],
      subject: `Thank you for your event! - ${bookingData.bookingRef}`,
      html: generateFollowUpEmailHTML(bookingData),
    });

    console.log('Post-event follow-up email sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Error sending post-event follow-up email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function generateCustomerEmailHTML(confirmation: BookingConfirmation): string {
  const { bookingRef, bookingData, calculatedPrice, startDateTime, endDateTime } = confirmation;
  const vancouverTimezone = 'America/Vancouver';
  
  // Convert UTC times to Vancouver timezone for display
  const startDateVancouver = toZonedTime(new Date(startDateTime), vancouverTimezone);
  const endDateVancouver = toZonedTime(new Date(endDateTime), vancouverTimezone);
  
  const startDate = format(startDateVancouver, 'EEEE, MMMM d, yyyy', { timeZone: vancouverTimezone });
  
  const startTime = format(startDateVancouver, 'h:mm a', { timeZone: vancouverTimezone });
  
  const endTime = format(endDateVancouver, 'h:mm a', { timeZone: vancouverTimezone });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Booking Confirmation - Capitol Hill Hall</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2c5aa0; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .booking-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; }
        .total { font-size: 18px; font-weight: bold; color: #2c5aa0; border-top: 2px solid #2c5aa0; padding-top: 10px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .cta { background-color: #2c5aa0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎉 Booking Confirmed!</h1>
        <p>Thank you for choosing Capitol Hill Hall</p>
      </div>
      
      <div class="content">
        <h2>Booking Details</h2>
        <div class="booking-details">
          <div class="detail-row">
            <span class="detail-label">Booking Reference:</span>
            <span>${bookingRef}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Event Type:</span>
            <span>${bookingData.eventType}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date:</span>
            <span>${startDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Time:</span>
            <span>${startTime} - ${endTime}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Duration:</span>
            <span>${bookingData.bookingType === 'hourly' ? `${bookingData.duration} hours` : 'Full day'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Guest Count:</span>
            <span>${bookingData.guestCount} people</span>
          </div>
          ${bookingData.organization ? `
          <div class="detail-row">
            <span class="detail-label">Organization:</span>
            <span>${bookingData.organization}</span>
          </div>
          ` : ''}
          ${bookingData.specialRequirements ? `
          <div class="detail-row">
            <span class="detail-label">Special Requirements:</span>
            <span>${bookingData.specialRequirements}</span>
          </div>
          ` : ''}
          <div class="detail-row total">
            <span>Total Amount Paid:</span>
            <span>$${calculatedPrice.toFixed(2)} CAD</span>
          </div>
        </div>

        <h3>What's Next?</h3>
        <p>Your booking has been confirmed and added to our calendar. You will receive a reminder email 24 hours before your event.</p>
        
        <p><strong>Important Notes:</strong></p>
        <ul>
          <li>Please arrive 15 minutes before your scheduled start time</li>
          <li>Kitchen facilities are available for re-heating only (no food preparation)</li>
          <li>Free WiFi is available on site</li>
          <li>Parking is available for 25 vehicles</li>
        </ul>

        <div style="text-align: center;">
          <a href="https://caphillhall.ca/availability" class="cta">View Calendar</a>
          <a href="https://caphillhall.ca/my-bookings" class="cta" style="background-color: #28a745; margin-left: 10px;">Manage My Booking</a>
        </div>

        <div class="footer">
          <p><strong>Capitol Hill Hall</strong><br>
          📧 info@caphillhall.ca | 📞 (604) 500-9505<br>
          🌐 <a href="https://caphillhall.ca">caphillhall.ca</a></p>
          <p><em>Your rental helps support local charities in our community!</em></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateManagementEmailHTML(confirmation: BookingConfirmation): string {
  const { bookingRef, bookingData, calculatedPrice, startDateTime, endDateTime } = confirmation;
  const vancouverTimezone = 'America/Vancouver';
  
  // Convert UTC times to Vancouver timezone for display
  const startDateVancouver = toZonedTime(new Date(startDateTime), vancouverTimezone);
  const endDateVancouver = toZonedTime(new Date(endDateTime), vancouverTimezone);
  
  const startDate = format(startDateVancouver, 'EEEE, MMMM d, yyyy', { timeZone: vancouverTimezone });
  
  const startTime = format(startDateVancouver, 'h:mm a', { timeZone: vancouverTimezone });
  
  const endTime = format(endDateVancouver, 'h:mm a', { timeZone: vancouverTimezone });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Booking - ${bookingRef}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #d32f2f; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .booking-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; }
        .contact-info { background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .total { font-size: 18px; font-weight: bold; color: #d32f2f; border-top: 2px solid #d32f2f; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📅 New Booking Received</h1>
        <p>Booking Reference: ${bookingRef}</p>
      </div>
      
      <div class="content">
        <h2>Event Details</h2>
        <div class="booking-details">
          <div class="detail-row">
            <span class="detail-label">Event Type:</span>
            <span>${bookingData.eventType}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date:</span>
            <span>${startDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Time:</span>
            <span>${startTime} - ${endTime}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Duration:</span>
            <span>${bookingData.bookingType === 'hourly' ? `${bookingData.duration} hours` : 'Full day'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Guest Count:</span>
            <span>${bookingData.guestCount} people</span>
          </div>
          <div class="detail-row total">
            <span>Revenue:</span>
            <span>$${calculatedPrice.toFixed(2)} CAD</span>
          </div>
        </div>

        <div class="contact-info">
          <h3>Contact Information</h3>
          <p><strong>Name:</strong> ${bookingData.name}</p>
          <p><strong>Email:</strong> ${bookingData.email}</p>
          <p><strong>Phone:</strong> ${bookingData.phone}</p>
          ${bookingData.organization ? `<p><strong>Organization:</strong> ${bookingData.organization}</p>` : ''}
          ${bookingData.specialRequirements ? `<p><strong>Special Requirements:</strong> ${bookingData.specialRequirements}</p>` : ''}
        </div>

        <p><strong>Action Required:</strong> This booking has been automatically added to the Google Calendar. No further action needed unless there are special requirements to address.</p>
      </div>
    </body>
    </html>
  `;
}

function generateReminderEmailHTML(bookingData: {
  bookingRef: string;
  customerName: string;
  customerEmail: string;
  eventType: string;
  selectedDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  specialRequirements?: string;
  organization?: string;
}): string {
  const vancouverTimezone = 'America/Vancouver';
  
  // Create dates in Vancouver timezone for proper display
  const eventDate = format(new Date(bookingData.selectedDate), 'EEEE, MMMM d, yyyy', { timeZone: vancouverTimezone });
  
  const startTime = format(new Date(`2000-01-01T${bookingData.startTime}:00`), 'h:mm a', { timeZone: vancouverTimezone });
  
  const endTime = format(new Date(`2000-01-01T${bookingData.endTime}:00`), 'h:mm a', { timeZone: vancouverTimezone });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Event Reminder - Capitol Hill Hall</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .event-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; }
        .important { background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }
        .checklist { background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .cta { background-color: #2c5aa0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📅 Event Reminder</h1>
        <p>Your event is tomorrow!</p>
      </div>
      
      <div class="content">
        <h2>Hello ${bookingData.customerName}!</h2>
        <p>This is a friendly reminder that your <strong>${bookingData.eventType}</strong> is scheduled for tomorrow at Capitol Hill Hall.</p>
        
        <div class="event-details">
          <h3>Event Details</h3>
          <div class="detail-row">
            <span class="detail-label">Booking Reference:</span>
            <span>${bookingData.bookingRef}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Event Type:</span>
            <span>${bookingData.eventType}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date:</span>
            <span>${eventDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Time:</span>
            <span>${startTime} - ${endTime}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Guest Count:</span>
            <span>${bookingData.guestCount} people</span>
          </div>
          ${bookingData.organization ? `
          <div class="detail-row">
            <span class="detail-label">Organization:</span>
            <span>${bookingData.organization}</span>
          </div>
          ` : ''}
          ${bookingData.specialRequirements ? `
          <div class="detail-row">
            <span class="detail-label">Special Requirements:</span>
            <span>${bookingData.specialRequirements}</span>
          </div>
          ` : ''}
        </div>

        <div class="important">
          <h3>⚠️ Important Reminders</h3>
          <ul>
            <li><strong>Arrival Time:</strong> Please arrive 15 minutes before your scheduled start time</li>
            <li><strong>Access:</strong> The hall will be unlocked and ready for you</li>
            <li><strong>Parking:</strong> 25 free parking spaces available on site</li>
            <li><strong>WiFi:</strong> High-speed gigabit fiber WiFi is available (password will be provided on site)</li>
          </ul>
        </div>

        <div class="checklist">
          <h3>✅ Pre-Event Checklist</h3>
          <ul>
            <li>Review your event setup requirements</li>
            <li>Confirm guest count and any special needs</li>
            <li>Plan your arrival time (15 minutes early)</li>
            <li>Bring any decorations or materials you need</li>
            <li>Review cleanup responsibilities</li>
          </ul>
        </div>

        <div class="important">
          <h3>📋 Setup & Cleanup</h3>
          <p><strong>Setup:</strong> Chairs and tables are provided. You are responsible for setup, takedown, cleaning, and stacking.</p>
          <p><strong>Kitchen:</strong> Available for re-heating only (no food preparation allowed).</p>
          <p><strong>Cleanup:</strong> Hall must be cleaned and vacated by 12 midnight. Please follow the Hall Closing Checklist below.</p>
        </div>

        <div class="checklist">
          <h3>🧹 Hall Closing Checklist</h3>
          <p><strong>Please ensure all items are completed before leaving:</strong></p>
          
          <h4>Entryway</h4>
          <ul>
            <li>Floors and carpets swept clean</li>
            <li>Door wedge left in entryway</li>
            <li>Double doors to Main Hall closed</li>
            <li>Entry doors closed and locked</li>
            <li>Entry door key left at office door, exit via Fire Exit door</li>
          </ul>

          <h4>Main Hall</h4>
          <ul>
            <li>All floors swept and wet mopped</li>
            <li>Fire door closed and locked</li>
            <li>Windows closed and locked, blinds closed</li>
            <li>Chairs washed and nested (50 per trolley)</li>
            <li>Rectangular tables washed and stored on end in Northwest corner cupboard</li>
            <li>Round tables washed and stored on edge in dollies (9-10 per dolly) in North wall cupboard</li>
            <li>Ladder returned to cupboard with round tables</li>
            <li>Ceiling fans turned off (switch on South wall doorway)</li>
            <li>Furnace control set to max 25°C during cold months, 15°C when leaving</li>
            <li>All lights switched off</li>
          </ul>

          <h4>Kitchen</h4>
          <ul>
            <li>Counters and sink left clean</li>
            <li>Fridge, stovetop and oven left clean</li>
            <li>Range knobs turned to off position</li>
            <li>Exhaust hood fan and light turned off</li>
            <li>Fridge doors closed</li>
            <li>All dishes removed from dishwasher</li>
            <li>Garbage containers emptied</li>
            <li>Wastepaper items in yellow recycling bin outside fire door</li>
            <li>Plastic and metal recycling in blue bin outside fire door</li>
            <li>Garbage in green waste bin in parking area</li>
          </ul>

          <h4>Washrooms</h4>
          <ul>
            <li>Floors wet mopped clean</li>
            <li>Trash bins emptied</li>
            <li>Paper items in yellow recycling bin outside fire door</li>
            <li>Garbage (diapers, sanitary products) in green waste bin in parking area</li>
          </ul>
        </div>

        <div style="text-align: center;">
          <a href="https://caphillhall.ca/contact" class="cta">Contact Us</a>
        </div>

        <div class="footer">
          <p><strong>Capitol Hill Hall</strong><br>
          📧 info@caphillhall.ca | 📞 (604) 500-9505<br>
          🌐 <a href="https://caphillhall.ca">caphillhall.ca</a></p>
          <p><em>We're excited to host your event!</em></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateFollowUpEmailHTML(bookingData: {
  bookingRef: string;
  customerName: string;
  customerEmail: string;
  eventType: string;
  selectedDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  specialRequirements?: string;
  organization?: string;
}): string {
  const vancouverTimezone = 'America/Vancouver';
  
  // Create dates in Vancouver timezone for proper display
  const eventDate = format(new Date(bookingData.selectedDate), 'EEEE, MMMM d, yyyy', { timeZone: vancouverTimezone });
  
  const startTime = format(new Date(`2000-01-01T${bookingData.startTime}:00`), 'h:mm a', { timeZone: vancouverTimezone });
  
  const endTime = format(new Date(`2000-01-01T${bookingData.endTime}:00`), 'h:mm a', { timeZone: vancouverTimezone });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Thank You - Capitol Hill Hall</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2c5aa0; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .event-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; }
        .feedback-section { background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .testimonial-section { background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }
        .cta-section { background-color: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .cta { background-color: #2c5aa0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px; }
        .feedback-link { background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px; }
        .testimonial-link { background-color: #ffc107; color: #333; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎉 Thank You!</h1>
        <p>We hope your event was a success!</p>
      </div>
      
      <div class="content">
        <h2>Hello ${bookingData.customerName}!</h2>
        <p>Thank you for choosing Capitol Hill Hall for your <strong>${bookingData.eventType}</strong>. We hope you and your ${bookingData.guestCount} guests had a wonderful time!</p>
        
        <div class="event-details">
          <h3>Your Event Details</h3>
          <div class="detail-row">
            <span class="detail-label">Booking Reference:</span>
            <span>${bookingData.bookingRef}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Event Type:</span>
            <span>${bookingData.eventType}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date:</span>
            <span>${eventDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Time:</span>
            <span>${startTime} - ${endTime}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Guest Count:</span>
            <span>${bookingData.guestCount} people</span>
          </div>
          ${bookingData.organization ? `
          <div class="detail-row">
            <span class="detail-label">Organization:</span>
            <span>${bookingData.organization}</span>
          </div>
          ` : ''}
        </div>

        <div class="feedback-section">
          <h3>📝 We'd Love Your Feedback!</h3>
          <p>Your experience matters to us! Please take a moment to share your thoughts about your event at Capitol Hill Hall.</p>
          <div style="text-align: center;">
            <a href="https://caphillhall.ca/feedback?booking=${bookingData.bookingRef}" class="feedback-link">
              Share Your Feedback
            </a>
          </div>
          <p style="font-size: 14px; color: #666; margin-top: 15px;">
            Your feedback helps us improve our services and helps other customers make informed decisions.
          </p>
        </div>

        <div class="testimonial-section">
          <h3>⭐ Share Your Experience</h3>
          <p>If you had a great experience, we'd be honored if you could share a testimonial with us!</p>
          <div style="text-align: center;">
            <a href="mailto:capitol.hill.hall@gmail.com?subject=Testimonial for ${bookingData.eventType} - ${bookingData.bookingRef}" class="testimonial-link">
              Write a Testimonial
            </a>
          </div>
          <p style="font-size: 14px; color: #666; margin-top: 15px;">
            Testimonials help us showcase the quality of our venue to future customers.
          </p>
        </div>

        <div class="cta-section">
          <h3>🔄 Book Your Next Event</h3>
          <p>Planning another celebration? We'd love to host you again!</p>
          <div style="text-align: center;">
            <a href="https://caphillhall.ca/book-now" class="cta">
              Book Again
            </a>
            <a href="https://caphillhall.ca/rates" class="cta">
              View Rates
            </a>
          </div>
        </div>

        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3>💡 Quick Tips for Future Events</h3>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Book early for popular dates and times</li>
            <li>Consider our full-day rates for longer celebrations</li>
            <li>Check out our <a href="https://caphillhall.ca/gallery">photo gallery</a> for setup inspiration</li>
            <li>Follow us on social media for special offers and updates</li>
          </ul>
        </div>

        <div class="footer">
          <p><strong>Capitol Hill Hall</strong><br>
          📧 capitol.hill.hall@gmail.com | 📞 (604) 500-9505<br>
          🌐 <a href="https://caphillhall.ca">caphillhall.ca</a></p>
          <p><em>Thank you for supporting our community hall and local charities!</em></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendDamageDepositAuthNotification(data: {
  customerName: string;
  customerEmail: string;
  bookingRef: string;
  eventDate: string;
  damageDepositAmount: number;
  eventType: string;
}) {
  try {
    await resend.emails.send({
      from: 'Capitol Hill Hall <info@caphillhall.ca>',
      to: [data.customerEmail],
      subject: `Damage Deposit Hold Placed - ${data.bookingRef}`,
      html: generateDamageDepositEmailHTML(data),
    });

    console.log('Damage deposit notification email sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Error sending damage deposit notification email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function generateDamageDepositEmailHTML(data: {
  customerName: string;
  customerEmail: string;
  bookingRef: string;
  eventDate: string;
  damageDepositAmount: number;
  eventType: string;
}): string {
  const vancouverTimezone = 'America/Vancouver';
  
  // Create date in Vancouver timezone for proper display
  const eventDate = format(new Date(data.eventDate), 'EEEE, MMMM d, yyyy', { timeZone: vancouverTimezone });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Damage Deposit Hold - Capitol Hill Hall</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2c5aa0; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .info-box { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2c5aa0; }
        .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; }
        .important { background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1976d2; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .amount { font-size: 24px; font-weight: bold; color: #2c5aa0; text-align: center; padding: 15px; background-color: #e3f2fd; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔒 Damage Deposit Hold Placed</h1>
        <p>Your event is coming up soon!</p>
      </div>
      
      <div class="content">
        <h2>Hello ${data.customerName}!</h2>
        <p>Your <strong>${data.eventType}</strong> at Capitol Hill Hall is scheduled for <strong>${eventDate}</strong>.</p>
        
        <p>As part of our standard booking process, we've placed a <strong>temporary hold</strong> on your payment method for the damage deposit.</p>

        <div class="amount">
          $${data.damageDepositAmount.toFixed(2)} CAD
        </div>

        <div class="info-box">
          <h3>📋 What This Means</h3>
          <div class="detail-row">
            <span class="detail-label">Hold Type:</span>
            <span>Temporary Authorization</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Amount:</span>
            <span>$${data.damageDepositAmount.toFixed(2)} CAD</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span>Authorized (not charged)</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Booking Reference:</span>
            <span>${data.bookingRef}</span>
          </div>
        </div>

        <div class="important">
          <h3>✅ Important Information</h3>
          <p><strong>This is a temporary hold, not a charge.</strong> You will see this amount as "pending" on your card, but it has not been charged to your account.</p>
          
          <p><strong>What happens next:</strong></p>
          <ul>
            <li><strong>If there is no damage:</strong> The hold will be automatically released within 2-4 business days after your event. You will not be charged.</li>
            <li><strong>If damage occurs:</strong> Only then will the hold be captured (charged) to cover repair or cleaning costs. Any unused portion will be released.</li>
          </ul>

          <p><strong>Hold Duration:</strong> The hold typically lasts up to 7 days. If we don't capture it, it will automatically expire and disappear from your card.</p>
        </div>

        <div class="info-box">
          <h3>🏛️ Hall Care Expectations</h3>
          <p>To ensure your deposit is fully released, please:</p>
          <ul>
            <li>Complete all cleanup tasks per the Hall Closing Checklist</li>
            <li>Leave the hall in the same condition as you found it</li>
            <li>Report any accidental damage immediately</li>
            <li>Ensure all items are removed by midnight</li>
          </ul>
          <p style="font-size: 14px; color: #666; margin-top: 10px;">
            <em>Most events have no issues and the hold is released automatically. We're here to help if you have any questions!</em>
          </p>
        </div>

        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p><strong>💳 Note About Your Card Statement:</strong></p>
          <p>You may see this as a "pending" transaction on your card. This is normal and expected. The amount is reserved but not charged.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <p><strong>Questions about the damage deposit?</strong></p>
          <p>Contact us at: 📧 info@caphillhall.ca | 📞 (604) 500-9505</p>
        </div>

        <div class="footer">
          <p><strong>Capitol Hill Hall</strong><br>
          📧 info@caphillhall.ca | 📞 (604) 500-9505<br>
          🌐 <a href="https://caphillhall.ca">caphillhall.ca</a></p>
          <p><em>Thank you for choosing Capitol Hill Hall!</em></p>
        </div>
      </div>
    </body>
    </html>
  `;
}
