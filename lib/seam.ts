import { Seam } from 'seam';
import { fromZonedTime } from 'date-fns-tz';

// Initialize Seam client
const seam = new Seam({
  apiKey: process.env.SEAM_API_KEY || '',
});

const LOCK_ID = process.env.SEAM_LOCK_ID || '';

/**
 * Parses a date/time string as if it's in the specified timezone and converts to UTC
 * @param dateTimeStr - Date/time string in format "YYYY-MM-DD HH:mm:ss"
 * @param timeZone - IANA timezone string (e.g., "America/Vancouver")
 * @returns Date object in UTC
 */
function parseDateTimeInTimezone(dateTimeStr: string, timeZone: string): Date {
  // Parse the date/time components from "YYYY-MM-DD HH:mm:ss"
  const [datePart, timePart] = dateTimeStr.split(' ');
  
  if (!datePart || !timePart) {
    throw new Error(`Invalid date/time format: ${dateTimeStr}. Expected "YYYY-MM-DD HH:mm:ss"`);
  }
  
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);
  
  // Validate parsed values
  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute) || isNaN(second || 0)) {
    throw new Error(`Invalid date/time values in: ${dateTimeStr}`);
  }
  
  // Create a Date object with the components (this creates it in server's local timezone)
  const localDate = new Date(year, month - 1, day, hour, minute, second || 0);
  
  // Validate the date was created successfully
  if (isNaN(localDate.getTime())) {
    throw new Error(`Invalid date created from: ${dateTimeStr}`);
  }
  
  // Get what time this local date represents in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(localDate);
  const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');
  
  const tzYear = getPart('year');
  const tzMonth = getPart('month');
  const tzDay = getPart('day');
  const tzHour = getPart('hour');
  const tzMinute = getPart('minute');
  const tzSecond = getPart('second');
  
  // Calculate the difference between desired time and what the local date represents in target timezone
  // We want: year-month-day hour:minute:second in target timezone
  // We have: tzYear-tzMonth-tzDay tzHour:tzMinute:tzSecond in target timezone (from localDate)
  // So we need to adjust localDate by the difference
  
  const desiredUTC = Date.UTC(year, month - 1, day, hour, minute, second || 0);
  const actualUTC = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, tzSecond);
  const offsetMs = desiredUTC - actualUTC;
  
  // Adjust the local date by the calculated offset
  const adjustedDate = new Date(localDate.getTime() + offsetMs);
  
  // Validate adjusted date
  if (isNaN(adjustedDate.getTime())) {
    throw new Error(`Invalid adjusted date created from: ${dateTimeStr}`);
  }
  
  // Now fromZonedTime will interpret this Date object as being in the target timezone and convert to UTC
  const utcDate = fromZonedTime(adjustedDate, timeZone);
  
  // Final validation
  if (isNaN(utcDate.getTime())) {
    throw new Error(`Invalid UTC date created from: ${dateTimeStr} in timezone ${timeZone}`);
  }
  
  return utcDate;
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
    
    // Parse dates correctly: parse the string as if it's in Vancouver timezone, then convert to UTC
    // The date/time strings are in Vancouver timezone format: "YYYY-MM-DD HH:mm:ss"
    const startTimeStr = `${bookingData.selectedDate} ${bookingData.startTime}:00`;
    const startDateTime = parseDateTimeInTimezone(startTimeStr, vancouverTimezone);
    
    // Handle end time - if it's "00:00", it means midnight (end of day), so add 1 day
    let endDateTime: Date;
    if (bookingData.endTime === '00:00' || bookingData.endTime === '00:00:00') {
      // End time is midnight, so it's the next day
      // Parse the date and add 1 day properly
      const selectedDateParts = bookingData.selectedDate.split('-');
      const year = parseInt(selectedDateParts[0]);
      const month = parseInt(selectedDateParts[1]) - 1; // Month is 0-indexed
      const day = parseInt(selectedDateParts[2]);
      const nextDay = new Date(Date.UTC(year, month, day + 1));
      const nextDayStr = nextDay.toISOString().split('T')[0];
      const endTimeStr = `${nextDayStr} 00:00:00`;
      endDateTime = parseDateTimeInTimezone(endTimeStr, vancouverTimezone);
    } else {
      const endTimeStr = `${bookingData.selectedDate} ${bookingData.endTime}:00`;
      endDateTime = parseDateTimeInTimezone(endTimeStr, vancouverTimezone);
    }
    
    // Calculate access code validity window (15 minutes before/after in Vancouver time)
    const accessCodeStart = new Date(startDateTime.getTime() - 15 * 60 * 1000); // 15 minutes before
    const accessCodeEnd = new Date(endDateTime.getTime() + 15 * 60 * 1000); // 15 minutes after

    console.log(`Creating access code for ${bookingData.customerName}:`);
    console.log(`- Booking: ${bookingData.selectedDate} ${bookingData.startTime} - ${bookingData.endTime} (Vancouver time)`);
    console.log(`- Access window (UTC): ${accessCodeStart.toISOString()} to ${accessCodeEnd.toISOString()}`);
    console.log(`- Access window (Vancouver): ${accessCodeStart.toLocaleString("en-US", {timeZone: vancouverTimezone})} to ${accessCodeEnd.toLocaleString("en-US", {timeZone: vancouverTimezone})}`);

    // Create access code via Seam API
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
    const accessCodesResponse = await seam.accessCodes.list({
      device_id: LOCK_ID,
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
