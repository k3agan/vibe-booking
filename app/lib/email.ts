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
      to: ['info@caphillhall.ca'], // Hall management email
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
