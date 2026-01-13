import { Seam } from 'seam';
import { fromZonedTime } from 'date-fns-tz';

// Initialize Seam client
const seam = new Seam({
  apiKey: process.env.SEAM_API_KEY || '',
});

const LOCK_ID = process.env.SEAM_LOCK_ID || '';
const KITCHEN_LOCK_ID = process.env.SEAM_KITCHEN_LOCK_ID || '';

/**
 * Normalizes a time string to HH:mm format
 * Handles both HH:mm and HH:mm:ss formats from database
 * @param time - Time string in HH:mm or HH:mm:ss format
 * @returns Time string in HH:mm format
 */
function normalizeTimeToHHMM(time: string): string {
  const parts = time.split(':');
  if (parts.length >= 2) {
    // Ensure we always return HH:mm (strip seconds if present)
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  // Fallback: return original if format is unexpected
  return time;
}

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
    // Validate input parameters
    if (!bookingData.customerName || !bookingData.selectedDate || !bookingData.startTime || !bookingData.endTime) {
      throw new Error('Missing required booking data: customerName, selectedDate, startTime, endTime');
    }

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
    
    // Parse dates correctly using fromZonedTime (same approach as payment-success route)
    // The date/time strings are in Vancouver timezone, so we use fromZonedTime to convert to UTC
    // Note: Database may return times in HH:mm:ss format, so we normalize to HH:mm first
    const normalizedStartTime = normalizeTimeToHHMM(bookingData.startTime);
    const startTimeStr = `${bookingData.selectedDate} ${normalizedStartTime}:00`;
    const startDateTime = fromZonedTime(startTimeStr, vancouverTimezone);
    
    // Handle end time - if it's "00:00", it means midnight (end of day), so add 1 day
    // Note: Database may return times in HH:mm:ss format, so we normalize to HH:mm first
    const normalizedEndTime = normalizeTimeToHHMM(bookingData.endTime);
    let endDateTime: Date;
    if (normalizedEndTime === '00:00') {
      // End time is midnight, so it's the next day
      // Parse the date and add 1 day properly
      const selectedDateParts = bookingData.selectedDate.split('-');
      const year = parseInt(selectedDateParts[0]);
      const month = parseInt(selectedDateParts[1]) - 1; // Month is 0-indexed
      const day = parseInt(selectedDateParts[2]);
      const nextDay = new Date(Date.UTC(year, month, day + 1));
      const nextDayStr = nextDay.toISOString().split('T')[0];
      const endTimeStr = `${nextDayStr} 00:00:00`;
      endDateTime = fromZonedTime(endTimeStr, vancouverTimezone);
    } else {
      const endTimeStr = `${bookingData.selectedDate} ${normalizedEndTime}:00`;
      endDateTime = fromZonedTime(endTimeStr, vancouverTimezone);
    }
    
    // Calculate access code validity window (15 minutes before/after in Vancouver time)
    const accessCodeStart = new Date(startDateTime.getTime() - 15 * 60 * 1000); // 15 minutes before
    const accessCodeEnd = new Date(endDateTime.getTime() + 15 * 60 * 1000); // 15 minutes after

    console.log(`Creating access code for ${bookingData.customerName}:`);
    console.log(`- Raw input: date=${bookingData.selectedDate}, start=${bookingData.startTime}, end=${bookingData.endTime}`);
    console.log(`- Normalized: start=${normalizedStartTime}, end=${normalizedEndTime}`);
    console.log(`- Booking: ${bookingData.selectedDate} ${normalizedStartTime} - ${normalizedEndTime} (Vancouver time)`);
    console.log(`- Access window (UTC): ${accessCodeStart.toISOString()} to ${accessCodeEnd.toISOString()}`);
    console.log(`- Access window (Vancouver): ${accessCodeStart.toLocaleString("en-US", {timeZone: vancouverTimezone})} to ${accessCodeEnd.toLocaleString("en-US", {timeZone: vancouverTimezone})}`);

    // Create access code for main door via Seam API
    const accessCode = await seam.accessCodes.create({
      device_id: LOCK_ID,
      name: `${bookingData.customerName} - ${bookingData.selectedDate}`,
      code: undefined, // Let Seam generate the code
      starts_at: accessCodeStart.toISOString(),
      ends_at: accessCodeEnd.toISOString(),
    });

    if (!accessCode.code) {
      throw new Error('Seam API returned access code but code is null/undefined');
    }

    console.log(`✅ Main door access code created successfully: ${accessCode.code}`);

    // Create matching access code for kitchen lock (same PIN)
    if (KITCHEN_LOCK_ID) {
      try {
        await seam.accessCodes.create({
          device_id: KITCHEN_LOCK_ID,
          name: `${bookingData.customerName} - ${bookingData.selectedDate}`,
          code: accessCode.code, // Use the same PIN as main door
          starts_at: accessCodeStart.toISOString(),
          ends_at: accessCodeEnd.toISOString(),
        });
        console.log(`✅ Kitchen lock access code created successfully: ${accessCode.code}`);
      } catch (kitchenError) {
        // Log but don't fail - main door code still works
        console.error('⚠️ Failed to create kitchen lock access code:', kitchenError instanceof Error ? kitchenError.message : 'Unknown error');
      }
    }

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
 * Deletes access codes for a specific booking from all locks
 * This is useful when a booking date/time is modified
 */
export async function deleteAccessCodesForBooking(customerName: string, oldDate: string): Promise<void> {
  if (!process.env.SEAM_API_KEY || !LOCK_ID) {
    console.log('Seam credentials not configured, skipping access code deletion');
    return;
  }

  const lockIds = [LOCK_ID, KITCHEN_LOCK_ID].filter(Boolean);
  let totalDeleted = 0;

  for (const lockId of lockIds) {
    try {
      // List all access codes for the lock
      const accessCodesResponse = await seam.accessCodes.list({
        device_id: lockId,
      });

      // Find codes that match the customer name and old date
      const codesToDelete = (accessCodesResponse as any).access_codes?.filter((code: any) => 
        code.name?.includes(`${customerName} - ${oldDate}`)
      ) || [];

      // Delete matching codes
      for (const code of codesToDelete) {
        try {
          await seam.accessCodes.delete({
            access_code_id: code.access_code_id,
          });
          console.log(`✅ Deleted old access code: ${code.name} (lock: ${lockId})`);
          totalDeleted++;
        } catch (error) {
          console.error(`❌ Failed to delete access code ${code.name}:`, error);
        }
      }
    } catch (error) {
      console.error(`❌ Error cleaning up access codes for lock ${lockId}:`, error);
    }
  }

  if (totalDeleted > 0) {
    console.log(`🗑️ Cleaned up ${totalDeleted} old access codes for ${customerName}`);
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
