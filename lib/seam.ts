import { Seam } from 'seam';

// Initialize Seam client
const seam = new Seam({
  apiKey: process.env.SEAM_API_KEY || '',
});

const LOCK_ID = process.env.SEAM_LOCK_ID || '';

export interface AccessCodeResult {
  success: boolean;
  accessCode?: string;
  error?: string;
}

/**
 * Creates a time-bound access code for a booking
 * @param bookingData - Booking information
 * @returns AccessCodeResult with success status and code or error
 */
export async function createAccessCode(bookingData: {
  customerName: string;
  selectedDate: string;
  startTime: string;
  endTime: string;
}): Promise<AccessCodeResult> {
  try {
    // Validate required environment variables
    if (!process.env.SEAM_API_KEY) {
      throw new Error('SEAM_API_KEY environment variable is not set');
    }
    if (!LOCK_ID) {
      throw new Error('SEAM_LOCK_ID environment variable is not set');
    }

    // Calculate access code validity window
    // 15 minutes before start_time to 15 minutes after end_time
    const vancouverTimezone = 'America/Vancouver';
    
    // Create start time (15 minutes before booking start)
    const startDateTime = new Date(`${bookingData.selectedDate}T${bookingData.startTime}:00`);
    const accessCodeStart = new Date(startDateTime.getTime() - 15 * 60 * 1000); // 15 minutes before
    
    // Create end time (15 minutes after booking end)
    const endDateTime = new Date(`${bookingData.selectedDate}T${bookingData.endTime}:00`);
    const accessCodeEnd = new Date(endDateTime.getTime() + 15 * 60 * 1000); // 15 minutes after

    console.log(`Creating access code for ${bookingData.customerName}:`);
    console.log(`- Booking: ${bookingData.selectedDate} ${bookingData.startTime} - ${bookingData.endTime}`);
    console.log(`- Access window: ${accessCodeStart.toISOString()} to ${accessCodeEnd.toISOString()}`);

    // Create access code via Seam API
    const accessCode = await seam.accessCodes.create({
      device_id: LOCK_ID,
      name: `${bookingData.customerName} - ${bookingData.selectedDate}`,
      code: undefined, // Let Seam generate the code
      starts_at: accessCodeStart.toISOString(),
      ends_at: accessCodeEnd.toISOString(),
    });

    console.log(`✅ Access code created successfully: ${accessCode.code}`);

    return {
      success: true,
      accessCode: accessCode.code,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to create access code:', errorMessage);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Deletes access codes for a specific booking
 * This is useful when a booking date/time is modified
 */
export async function deleteAccessCodesForBooking(customerName: string, oldDate: string): Promise<void> {
  try {
    if (!process.env.SEAM_API_KEY || !LOCK_ID) {
      console.log('Seam credentials not configured, skipping access code deletion');
      return;
    }

    // List all access codes for the lock
    const accessCodes = await seam.accessCodes.list({
      device_id: LOCK_ID,
    });

    // Find codes that match the customer name and old date
    const codesToDelete = accessCodes.access_codes.filter(code => 
      code.name?.includes(`${customerName} - ${oldDate}`)
    );

    // Delete matching codes
    for (const code of codesToDelete) {
      try {
        await seam.accessCodes.delete({
          access_code_id: code.access_code_id,
        });
        console.log(`✅ Deleted old access code: ${code.name}`);
      } catch (error) {
        console.error(`❌ Failed to delete access code ${code.name}:`, error);
      }
    }

    if (codesToDelete.length > 0) {
      console.log(`🗑️ Cleaned up ${codesToDelete.length} old access codes for ${customerName}`);
    }
  } catch (error) {
    console.error('❌ Error cleaning up old access codes:', error);
  }
}

/**
 * Sends an admin alert email when Seam access code creation fails
 */
export async function sendAdminAlert(bookingData: {
  bookingRef: string;
  customerName: string;
  customerEmail: string;
  selectedDate: string;
  startTime: string;
  endTime: string;
  error: string;
}): Promise<void> {
  try {
    // Import resend here to avoid circular dependencies
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const adminEmail = process.env.ADMIN_EMAIL || 'info@caphillhall.ca';
    
    await resend.emails.send({
      from: 'Capitol Hill Hall System <info@caphillhall.ca>',
      to: [adminEmail],
      subject: `🚨 Smart Lock Access Code Failed - ${bookingData.bookingRef}`,
      html: `
        <h2>Smart Lock Access Code Creation Failed</h2>
        <p><strong>Booking Reference:</strong> ${bookingData.bookingRef}</p>
        <p><strong>Customer:</strong> ${bookingData.customerName} (${bookingData.customerEmail})</p>
        <p><strong>Event Date:</strong> ${bookingData.selectedDate} ${bookingData.startTime}</p>
        <p><strong>Error:</strong> ${bookingData.error}</p>
        <p><strong>Action Required:</strong> Please manually create an access code for this customer or contact them directly.</p>
        <p>This is an automated alert from the Capitol Hill Hall booking system.</p>
      `,
    });

    console.log(`📧 Admin alert sent to ${adminEmail} for booking ${bookingData.bookingRef}`);
  } catch (error) {
    console.error('❌ Failed to send admin alert:', error);
  }
}
