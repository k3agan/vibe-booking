import { Resend } from 'resend';

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
      from: 'Capitol Hill Hall <bookings@caphillhall.ca>',
      to: [confirmation.bookingData.email],
      subject: `Booking Confirmed - ${confirmation.bookingRef}`,
      html: generateCustomerEmailHTML(confirmation),
    });

    // Management notification email
    await resend.emails.send({
      from: 'Capitol Hill Hall <bookings@caphillhall.ca>',
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
      from: 'Capitol Hill Hall <bookings@caphillhall.ca>',
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
      from: 'Capitol Hill Hall <bookings@caphillhall.ca>',
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
  
  const startDate = new Date(startDateTime).toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const startTime = new Date(startDateTime).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  const endTime = new Date(endDateTime).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

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
          📧 info@caphillhall.ca | 📞 (778) 885-4208<br>
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
  
  const startDate = new Date(startDateTime).toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const startTime = new Date(startDateTime).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  const endTime = new Date(endDateTime).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

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
  const eventDate = new Date(bookingData.selectedDate).toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const startTime = new Date(`${bookingData.selectedDate}T${bookingData.startTime}:00`).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  const endTime = new Date(`${bookingData.selectedDate}T${bookingData.endTime}:00`).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

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
          <p><strong>Cleanup:</strong> Hall must be cleaned and vacated by 12 midnight. Please follow the Hall Closing Checklist.</p>
        </div>

        <div style="text-align: center;">
          <a href="https://caphillhall.ca/contact" class="cta">Contact Us</a>
        </div>

        <div class="footer">
          <p><strong>Capitol Hill Hall</strong><br>
          📧 info@caphillhall.ca | 📞 (778) 885-4208<br>
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
  const eventDate = new Date(bookingData.selectedDate).toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const startTime = new Date(`${bookingData.selectedDate}T${bookingData.startTime}:00`).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  const endTime = new Date(`${bookingData.selectedDate}T${bookingData.endTime}:00`).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

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
          📧 capitol.hill.hall@gmail.com | 📞 (778) 885-4208<br>
          🌐 <a href="https://caphillhall.ca">caphillhall.ca</a></p>
          <p><em>Thank you for supporting our community hall and local charities!</em></p>
        </div>
      </div>
    </body>
    </html>
  `;
}
