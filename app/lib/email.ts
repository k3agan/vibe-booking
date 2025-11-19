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
  accessCode?: string;
}) {
  try {
    await resend.emails.send({
      from: 'Capitol Hill Hall <info@caphillhall.ca>',
      to: [bookingData.customerEmail],
      subject: `Event Reminder - ${bookingData.bookingRef} - Coming Up!`,
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
        .logo { max-width: 150px; height: auto; margin-bottom: 15px; }
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
        <img src="https://caphillhall.ca/logo.png" alt="Capitol Hill Hall Logo" style="max-width: 150px; height: auto; margin-bottom: 15px;" />
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
        <img src="https://caphillhall.ca/logo.png" alt="Capitol Hill Hall Logo" style="max-width: 150px; height: auto; margin-bottom: 15px;" />
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
  accessCode?: string;
}): string {
  const vancouverTimezone = 'America/Vancouver';
  
  // Create dates in Vancouver timezone for proper display
  const eventDate = format(new Date(bookingData.selectedDate), 'EEEE, MMMM d, yyyy', { timeZone: vancouverTimezone });

  // Normalize times to support both HH:MM and HH:MM:SS inputs
  const startTimeStr = bookingData.startTime.length === 5 ? `${bookingData.startTime}:00` : bookingData.startTime;
  const endTimeStr = bookingData.endTime.length === 5 ? `${bookingData.endTime}:00` : bookingData.endTime;

  const startTime = format(new Date(`2000-01-01T${startTimeStr}`), 'h:mm a', { timeZone: vancouverTimezone });
  const endTime = format(new Date(`2000-01-01T${endTimeStr}`), 'h:mm a', { timeZone: vancouverTimezone });

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
        <img src="https://caphillhall.ca/logo.png" alt="Capitol Hill Hall Logo" style="max-width: 150px; height: auto; margin-bottom: 15px;" />
        <h1>📅 Event Reminder</h1>
        <p>Your event is coming up!</p>
      </div>
      
      <div class="content">
        <h2>Hello ${bookingData.customerName}!</h2>
        <p>This is a friendly reminder that your <strong>${bookingData.eventType}</strong> is coming up soon at Capitol Hill Hall.</p>
        
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

        ${bookingData.accessCode ? `
        <div class="access-code" style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #4caf50;">
          <h3 style="color: #2e7d32; margin-top: 0;">🔑 Your Door Access Code</h3>
          <div style="font-size: 32px; font-weight: bold; color: #1b5e20; letter-spacing: 3px; margin: 15px 0; font-family: 'Courier New', monospace; background-color: white; padding: 15px; border-radius: 6px; border: 2px dashed #4caf50;">
            ${bookingData.accessCode}
          </div>
          <p style="margin: 10px 0; color: #2e7d32;"><strong>Valid:</strong> 15 minutes before your event until 15 minutes after</p>
          <p style="margin: 5px 0; color: #2e7d32; font-size: 14px;">Use this code on the smart lock at the main entrance</p>
        </div>
        ` : `
        <div class="access-fallback" style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3 style="color: #856404; margin-top: 0;">🔑 Door Access</h3>
          <p style="margin: 5px 0; color: #856404;">Please contact us at <strong>info@caphillhall.ca</strong> for your door access code.</p>
        </div>
        `}

        <div class="important">
          <h3>⚠️ Important Reminders</h3>
          <ul>
            <li><strong>Arrival Time:</strong> Please arrive 15 minutes before your scheduled start time</li>
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

  // Normalize times to support both HH:MM and HH:MM:SS inputs
  const startTimeStr = bookingData.startTime.length === 5 ? `${bookingData.startTime}:00` : bookingData.startTime;
  const endTimeStr = bookingData.endTime.length === 5 ? `${bookingData.endTime}:00` : bookingData.endTime;

  const startTime = format(new Date(`2000-01-01T${startTimeStr}`), 'h:mm a', { timeZone: vancouverTimezone });
  const endTime   = format(new Date(`2000-01-01T${endTimeStr}`),   'h:mm a', { timeZone: vancouverTimezone });

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
        <img src="https://caphillhall.ca/logo.png" alt="Capitol Hill Hall Logo" style="max-width: 150px; height: auto; margin-bottom: 15px;" />
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
        <img src="https://caphillhall.ca/logo.png" alt="Capitol Hill Hall Logo" style="max-width: 150px; height: auto; margin-bottom: 15px;" />
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

export async function sendFeedbackEmail(feedbackData: {
  name: string | null;
  email: string | null;
  bookingRef: string | null;
  ratings: {
    cleanliness: number;
    valueForMoney: number;
    easeOfBooking: number;
    amenitiesAvailable: number;
    buildingAccessCode: number;
    responsivenessOfStaff: number;
    overallSatisfaction: number;
  };
  improvements: {
    cleanliness: string | null;
    valueForMoney: string | null;
    easeOfBooking: string | null;
    amenitiesAvailable: string | null;
    buildingAccessCode: string | null;
    responsivenessOfStaff: string | null;
    overallSatisfaction: string | null;
  };
  generalFeedback: string | null;
}) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return { success: false, error: 'Email service not configured' };
    }

    // Build subject with name and/or booking reference
    let subjectParts = ['Feedback Received'];
    if (feedbackData.name) {
      subjectParts.push(`from ${feedbackData.name}`);
    }
    if (feedbackData.bookingRef) {
      subjectParts.push(`(${feedbackData.bookingRef})`);
    }
    const subject = subjectParts.join(' ');
    
    const result = await resend.emails.send({
      from: 'Capitol Hill Hall <info@caphillhall.ca>',
      to: ['info@caphillhall.ca'],
      subject,
      html: generateFeedbackEmailHTML(feedbackData),
    });

    if (result.error) {
      console.error('Resend API error:', result.error);
      return { success: false, error: result.error.message || 'Failed to send email' };
    }

    console.log('Feedback email sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Error sending feedback email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function generateFeedbackEmailHTML(feedbackData: {
  name: string | null;
  email: string | null;
  bookingRef: string | null;
  ratings: {
    cleanliness: number;
    valueForMoney: number;
    easeOfBooking: number;
    amenitiesAvailable: number;
    buildingAccessCode: number;
    responsivenessOfStaff: number;
    overallSatisfaction: number;
  };
  improvements: {
    cleanliness: string | null;
    valueForMoney: string | null;
    easeOfBooking: string | null;
    amenitiesAvailable: string | null;
    buildingAccessCode: string | null;
    responsivenessOfStaff: string | null;
    overallSatisfaction: string | null;
  };
  generalFeedback: string | null;
}): string {
  const getRatingStars = (rating: number) => {
    return '⭐'.repeat(rating) + '○'.repeat(5 - rating);
  };

  // Escape HTML to prevent XSS and ensure proper rendering
  const escapeHtml = (text: string | null): string => {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Feedback Received${feedbackData.bookingRef ? ` - ${feedbackData.bookingRef}` : ''}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2c5aa0; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .section { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; }
        .rating-row { display: flex; justify-content: space-between; align-items: center; margin: 15px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; }
        .rating-label { font-weight: bold; flex: 1; }
        .rating-value { font-size: 18px; }
        .improvement-box { background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #ffc107; }
        .improvement-label { font-weight: bold; color: #856404; margin-bottom: 5px; }
        .improvement-text { color: #856404; }
        .general-feedback-box { background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 10px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="https://caphillhall.ca/logo.png" alt="Capitol Hill Hall Logo" style="max-width: 150px; height: auto; margin-bottom: 15px;" />
        <h1>📝 Feedback Received</h1>
        <p>New feedback from a customer</p>
      </div>
      
      <div class="content">
        <div class="section">
          <h3>Customer Information</h3>
          ${feedbackData.name ? `
          <div class="detail-row">
            <span class="detail-label">Name:</span>
            <span>${escapeHtml(feedbackData.name)}</span>
          </div>
          ` : ''}
          ${feedbackData.email ? `
          <div class="detail-row">
            <span class="detail-label">Email:</span>
            <span>${escapeHtml(feedbackData.email)}</span>
          </div>
          ` : ''}
          ${feedbackData.bookingRef ? `
          <div class="detail-row">
            <span class="detail-label">Booking Reference:</span>
            <span>${escapeHtml(feedbackData.bookingRef)}</span>
          </div>
          ` : ''}
          ${!feedbackData.name && !feedbackData.email && !feedbackData.bookingRef ? `
          <div class="detail-row">
            <span class="detail-label">Information:</span>
            <span>No contact information provided</span>
          </div>
          ` : ''}
        </div>

        <div class="section">
          <h3>Ratings (1 = Poor, 5 = Excellent)</h3>
          
          <div class="rating-row">
            <span class="rating-label">Cleanliness:</span>
            <span class="rating-value">${getRatingStars(feedbackData.ratings.cleanliness)} (${feedbackData.ratings.cleanliness}/5)</span>
          </div>
          ${feedbackData.improvements.cleanliness ? `
          <div class="improvement-box">
            <div class="improvement-label">How to improve:</div>
            <div class="improvement-text">${escapeHtml(feedbackData.improvements.cleanliness)}</div>
          </div>
          ` : ''}

          <div class="rating-row">
            <span class="rating-label">Value for Money:</span>
            <span class="rating-value">${getRatingStars(feedbackData.ratings.valueForMoney)} (${feedbackData.ratings.valueForMoney}/5)</span>
          </div>
          ${feedbackData.improvements.valueForMoney ? `
          <div class="improvement-box">
            <div class="improvement-label">How to improve:</div>
            <div class="improvement-text">${escapeHtml(feedbackData.improvements.valueForMoney)}</div>
          </div>
          ` : ''}

          <div class="rating-row">
            <span class="rating-label">Ease of Booking:</span>
            <span class="rating-value">${getRatingStars(feedbackData.ratings.easeOfBooking)} (${feedbackData.ratings.easeOfBooking}/5)</span>
          </div>
          ${feedbackData.improvements.easeOfBooking ? `
          <div class="improvement-box">
            <div class="improvement-label">How to improve:</div>
            <div class="improvement-text">${escapeHtml(feedbackData.improvements.easeOfBooking)}</div>
          </div>
          ` : ''}

          <div class="rating-row">
            <span class="rating-label">Amenities Available:</span>
            <span class="rating-value">${getRatingStars(feedbackData.ratings.amenitiesAvailable)} (${feedbackData.ratings.amenitiesAvailable}/5)</span>
          </div>
          ${feedbackData.improvements.amenitiesAvailable ? `
          <div class="improvement-box">
            <div class="improvement-label">How to improve:</div>
            <div class="improvement-text">${escapeHtml(feedbackData.improvements.amenitiesAvailable)}</div>
          </div>
          ` : ''}

          <div class="rating-row">
            <span class="rating-label">Building Access Code:</span>
            <span class="rating-value">${getRatingStars(feedbackData.ratings.buildingAccessCode)} (${feedbackData.ratings.buildingAccessCode}/5)</span>
          </div>
          ${feedbackData.improvements.buildingAccessCode ? `
          <div class="improvement-box">
            <div class="improvement-label">How to improve:</div>
            <div class="improvement-text">${escapeHtml(feedbackData.improvements.buildingAccessCode)}</div>
          </div>
          ` : ''}

          <div class="rating-row">
            <span class="rating-label">Responsiveness of Staff:</span>
            <span class="rating-value">${getRatingStars(feedbackData.ratings.responsivenessOfStaff)} (${feedbackData.ratings.responsivenessOfStaff}/5)</span>
          </div>
          ${feedbackData.improvements.responsivenessOfStaff ? `
          <div class="improvement-box">
            <div class="improvement-label">How to improve:</div>
            <div class="improvement-text">${escapeHtml(feedbackData.improvements.responsivenessOfStaff)}</div>
          </div>
          ` : ''}

          <div class="rating-row">
            <span class="rating-label">Overall Satisfaction:</span>
            <span class="rating-value">${getRatingStars(feedbackData.ratings.overallSatisfaction)} (${feedbackData.ratings.overallSatisfaction}/5)</span>
          </div>
          ${feedbackData.improvements.overallSatisfaction ? `
          <div class="improvement-box">
            <div class="improvement-label">How to improve:</div>
            <div class="improvement-text">${escapeHtml(feedbackData.improvements.overallSatisfaction)}</div>
          </div>
          ` : ''}
        </div>

        ${feedbackData.generalFeedback ? `
        <div class="section">
          <h3>Additional Comments</h3>
          <div class="general-feedback-box">
            <p style="white-space: pre-wrap; margin: 0;">${escapeHtml(feedbackData.generalFeedback)}</p>
          </div>
        </div>
        ` : ''}

        <div class="footer">
          <p><strong>Capitol Hill Hall</strong><br>
          📧 info@caphillhall.ca | 📞 (604) 500-9505<br>
          🌐 <a href="https://caphillhall.ca">caphillhall.ca</a></p>
          <p><em>Feedback submitted via feedback form</em></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendFeedbackThankYouEmail(data: {
  customerEmail: string;
  customerName: string | null;
  averageRating: number;
}) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return { success: false, error: 'Email service not configured' };
    }

    const customerName = data.customerName || 'Valued Customer';
    
    await resend.emails.send({
      from: 'Capitol Hill Hall <info@caphillhall.ca>',
      to: [data.customerEmail],
      subject: 'Thank You for Your Feedback!',
      html: generateFeedbackThankYouEmailHTML(customerName, data.averageRating),
    });

    console.log('Thank you email sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Error sending thank you email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function generateFeedbackThankYouEmailHTML(customerName: string, averageRating: number): string {
  // Escape HTML to prevent XSS and ensure proper rendering
  const escapeHtml = (text: string | null): string => {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Thank You for Your Feedback</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2c5aa0; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="https://caphillhall.ca/logo.png" alt="Capitol Hill Hall Logo" style="max-width: 150px; height: auto; margin-bottom: 15px;" />
        <h1>🙏 Thank You!</h1>
        <p>We appreciate your feedback</p>
      </div>
      
      <div class="content">
        <h2>Hello ${escapeHtml(customerName)}!</h2>
        <p>Thank you so much for taking the time to share your feedback about your experience at Capitol Hill Hall. Your thoughts and suggestions are incredibly valuable to us and help us improve our services.</p>
        
        <p>We take all feedback seriously and will use your input to continue providing the best possible experience for our customers.</p>
        
        ${averageRating > 4.0 ? `
        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #4caf50;">
          <h3 style="margin-top: 0; color: #2e7d32;">⭐ Love Your Experience?</h3>
          <p style="margin: 10px 0;">We're thrilled you enjoyed your time at Capitol Hill Hall! If you have a moment, we'd be honored if you could share your experience with others by leaving us a review on Google.</p>
          <div style="margin: 20px 0;">
            <a href="https://www.google.com/maps/place/Capitol+Hill+Community+Hall/@49.2810398,-122.9866808,17z/data=!3m1!4b1!4m6!3m5!1s0x5486774d455d286f:0xb14757d048b9016b!8m2!3d49.2810398!4d-122.9841069!16s%2Fg%2F11c0m7nq0k?entry=ttu&hl=en" 
               target="_blank" 
               rel="noopener noreferrer"
               style="display: inline-block; background-color: #4285f4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 10px 0;">
              Leave a Google Review
            </a>
          </div>
          <p style="font-size: 14px; color: #666; margin: 10px 0 0 0;">Your review helps us continue serving our community and helps others discover our wonderful venue!</p>
        </div>
        ` : ''}
        
        <p>If you have any additional questions or concerns, please don't hesitate to reach out to us at <strong>info@caphillhall.ca</strong> or call us at <strong>(604) 500-9505</strong>.</p>
        
        <p>We hope to see you again soon!</p>
        
        <p>Best regards,<br>
        <strong>The Capitol Hill Hall Team</strong></p>

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
