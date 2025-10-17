import { NextRequest, NextResponse } from 'next/server';
import { sendBookingConfirmation, sendDamageDepositAuthNotification } from '../../lib/email';
import { createBooking, logEmailSent, updateBookingPaymentMethod, updateDamageDepositAuthorization } from '../../../lib/database';
import Stripe from 'stripe';
import { fromZonedTime, toZonedTime, format } from 'date-fns-tz';
import { getStripeApiKey } from '@/lib/api-key-rotation';

const stripe = new Stripe(getStripeApiKey(), {
  apiVersion: '2025-08-27.basil',
});

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId, bookingData } = await request.json();

    console.log('Payment successful:', {
      paymentIntentId,
      bookingData,
    });

    // Generate a booking reference number
    const bookingRef = `CHH-${Date.now()}`;

    // Calculate pricing
    const isWeekend = [5, 6, 0].includes(new Date(bookingData.selectedDate).getDay()); // Fri, Sat, Sun
    const hourlyRate = isWeekend ? 100 : 50;
    const fullDayRate = isWeekend ? 900 : 750;
    
    let calculatedPrice = 0;
    if (bookingData.bookingType === 'fullday') {
      calculatedPrice = fullDayRate;
    } else {
      calculatedPrice = hourlyRate * bookingData.duration;
    }

    // Calculate event times
    // Extract just the date part (YYYY-MM-DD) from the selectedDate
    const dateOnly = bookingData.selectedDate.split('T')[0];
    const vancouverTimezone = 'America/Vancouver';
    let startDateTime, endDateTime;
    
    if (bookingData.bookingType === 'fullday') {
      // Full day: 8 AM to 11 PM Pacific Time (ignore user-provided start time)
      // Create dates in Vancouver timezone and convert to UTC
      const startTimeStr = `${dateOnly} 08:00:00`;
      const endTimeStr = `${dateOnly} 23:00:00`;
      
      startDateTime = fromZonedTime(startTimeStr, vancouverTimezone);
      endDateTime = fromZonedTime(endTimeStr, vancouverTimezone);
    } else {
      // Hourly: use user-provided start time and add duration in Pacific Time
      const startTimeStr = `${dateOnly} ${bookingData.startTime}:00`;
      startDateTime = fromZonedTime(startTimeStr, vancouverTimezone);
      
      // Calculate end time by adding duration to start time in Pacific timezone
      const endTimeStr = `${dateOnly} ${bookingData.startTime}:00`;
      const endTimeDate = fromZonedTime(endTimeStr, vancouverTimezone);
      endDateTime = new Date(endTimeDate.getTime() + (bookingData.duration * 60 * 60 * 1000));
    }

    console.log('Date calculation:', {
      selectedDate: bookingData.selectedDate,
      dateOnly,
      startTime: bookingData.startTime,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      duration: bookingData.duration
    });

    // Create calendar event (with production error handling)
    let calendarEventId: string | undefined;
    try {
      // Check if we're in production and disable calendar creation if there are key issues
      if (process.env.NODE_ENV === 'production' && !process.env.GOOGLE_PRIVATE_KEY) {
        console.log('Calendar event creation disabled in production - missing private key');
        console.log('Booking details for manual entry:', {
          eventType: bookingData.eventType,
          name: bookingData.name,
          email: bookingData.email,
          phone: bookingData.phone,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          guestCount: bookingData.guestCount
        });
      } else {
        // Import the calendar API function directly instead of making HTTP request
        const { google } = await import('googleapis');
        
        // Initialize Google Calendar API
        const calendar = google.calendar({ version: 'v3' });
        
        // Set up authentication with better error handling
        const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
        
        if (!privateKey || !process.env.GOOGLE_CLIENT_EMAIL) {
          throw new Error('Missing Google Calendar credentials');
        }
        
        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: privateKey,
          },
          scopes: ['https://www.googleapis.com/auth/calendar'],
        });

        const calendarId = process.env.GOOGLE_CALENDAR_ID || 'capitolhillhallrent@gmail.com';
        const authClient = await auth.getClient();

        // Create event details
        const eventSummary = `${bookingData.eventType} - ${bookingData.name}`;
        const eventDescription = `
Event Type: ${bookingData.eventType}
Contact: ${bookingData.name} (${bookingData.email}, ${bookingData.phone})
Attendees: ${bookingData.guestCount} people
${bookingData.organization ? `Organization: ${bookingData.organization}` : ''}
${bookingData.specialRequirements ? `Special Requirements: ${bookingData.specialRequirements}` : ''}

Booking Details:
- Duration: ${bookingData.bookingType === 'hourly' ? `${bookingData.duration} hours` : 'Full day'}
- Start Time: ${new Date(startDateTime.toISOString()).toLocaleString()}
- End Time: ${new Date(endDateTime.toISOString()).toLocaleString()}
        `.trim();

        // Create the calendar event
        const event = await calendar.events.insert({
          auth: authClient as any,
          calendarId,
          requestBody: {
            summary: eventSummary,
            description: eventDescription,
            start: {
              dateTime: startDateTime.toISOString(),
              timeZone: 'America/Vancouver',
            },
            end: {
              dateTime: endDateTime.toISOString(),
              timeZone: 'America/Vancouver',
            },
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'email', minutes: 24 * 60 }, // 1 day before
                { method: 'popup', minutes: 60 }, // 1 hour before
              ],
            },
          },
        });

        calendarEventId = event.data?.id || undefined;
        console.log('Calendar event created:', calendarEventId);
      }
    } catch (calendarError) {
      console.error('Calendar error:', calendarError);
      // Don't fail the booking if calendar creation fails
    }

    // Save booking to database
    let savedBooking;
    try {
      savedBooking = await createBooking({
        bookingRef,
        customerName: bookingData.name,
        customerEmail: bookingData.email,
        customerPhone: bookingData.phone,
        organization: bookingData.organization,
        eventType: bookingData.eventType,
        guestCount: parseInt(bookingData.guestCount),
        specialRequirements: bookingData.specialRequirements,
        selectedDate: dateOnly,
        startTime: bookingData.startTime,
        endTime: format(toZonedTime(endDateTime, vancouverTimezone), 'HH:mm', { timeZone: vancouverTimezone }),
        bookingType: bookingData.bookingType,
        duration: bookingData.duration,
        calculatedPrice,
        paymentIntentId,
        calendarEventId
      });
      console.log('Booking saved to database:', savedBooking.id);

      // Retrieve payment intent to get the payment method
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        const paymentMethodId = paymentIntent.payment_method as string;
        
        if (paymentMethodId) {
          // Calculate damage deposit (50% of rental fee)
          const damageDepositAmount = calculatedPrice * 0.5;
          
          // Save payment method and damage deposit amount
          await updateBookingPaymentMethod(savedBooking.id, paymentMethodId, damageDepositAmount);
          
          // Check if event is within 3 days - if so, authorize deposit immediately
          const vancouverTimezone = 'America/Vancouver';
          const eventDate = fromZonedTime(`${dateOnly} 00:00:00`, vancouverTimezone);
          const today = new Date();
          const todayVancouver = toZonedTime(today, vancouverTimezone);
          todayVancouver.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
          const daysUntilEvent = Math.ceil((eventDate.getTime() - todayVancouver.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilEvent <= 3) {
            console.log(`Event is in ${daysUntilEvent} days - authorizing damage deposit immediately`);
            
            try {
              // Try to find existing customer by email for damage deposit authorization
              let customerId;
              try {
                const existingCustomers = await stripe.customers.list({
                  email: bookingData.email,
                  limit: 1,
                });
                if (existingCustomers.data.length > 0) {
                  customerId = existingCustomers.data[0].id;
                }
              } catch (customerError) {
                console.log('Could not find customer for damage deposit, proceeding without customer association');
              }

              // Create authorization (hold) for damage deposit
              const authIntent = await stripe.paymentIntents.create({
                amount: Math.round(damageDepositAmount * 100), // Convert to cents
                currency: 'cad',
                customer: customerId, // Associate with customer if found
                payment_method: paymentMethodId,
                confirm: false,
                capture_method: 'manual', // Hold, not charge
                metadata: {
                  booking_ref: bookingRef,
                  booking_id: savedBooking.id,
                  type: 'damage_deposit',
                },
                description: `Damage deposit hold for ${bookingData.eventType} - ${bookingData.name}`,
              });

              // Confirm the authorization
              const confirmedIntent = await stripe.paymentIntents.confirm(authIntent.id, {
                payment_method: paymentMethodId,
                off_session: true,
              });

              if (confirmedIntent.status === 'requires_capture') {
                // Successfully authorized
                await updateDamageDepositAuthorization(savedBooking.id, confirmedIntent.id, 'authorized');
                
                // Send notification email
                await sendDamageDepositAuthNotification({
                  customerName: bookingData.name,
                  customerEmail: bookingData.email,
                  bookingRef: bookingRef,
                  eventDate: dateOnly,
                  damageDepositAmount: damageDepositAmount,
                  eventType: bookingData.eventType,
                });
                
                console.log(`✅ Damage deposit authorized immediately: $${damageDepositAmount}`);
              } else {
                console.error(`Unexpected authorization status: ${confirmedIntent.status}`);
              }
            } catch (authError) {
              console.error('Failed to authorize damage deposit immediately:', authError);
              // Don't fail the booking - cron will retry in 3 days if needed
            }
          } else {
            console.log(`Event is in ${daysUntilEvent} days - damage deposit will be authorized by cron job 3 days before`);
          }
        }
      } catch (paymentMethodError) {
        console.error('Error saving payment method:', paymentMethodError);
        // Don't fail the booking if this fails
      }
    } catch (dbError) {
      console.error('Error saving booking to database:', dbError);
      // Continue with email sending even if DB save fails
    }

    // Send confirmation emails
    try {
      const emailResult = await sendBookingConfirmation({
        bookingRef,
        bookingData,
        calculatedPrice,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
      });
      
      if (emailResult.success) {
        console.log('Confirmation emails sent successfully');
        
        // Log email sent in database
        if (savedBooking) {
          await logEmailSent(savedBooking.id, 'confirmation', bookingData.email, 'sent');
          await logEmailSent(savedBooking.id, 'confirmation', 'info@caphillhall.ca', 'sent');
        }
      } else {
        console.error('Failed to send confirmation emails:', emailResult.error);
        
        // Log email failure in database
        if (savedBooking) {
          await logEmailSent(savedBooking.id, 'confirmation', bookingData.email, 'failed', emailResult.error);
        }
      }
    } catch (emailError) {
      console.error('Error sending confirmation emails:', emailError);
      
      // Log email failure in database
      if (savedBooking) {
        await logEmailSent(savedBooking.id, 'confirmation', bookingData.email, 'failed', emailError instanceof Error ? emailError.message : 'Unknown error');
      }
    }

    return NextResponse.json({
      success: true,
      bookingRef,
      message: 'Booking confirmed successfully!',
      eventCreated: true,
    });
  } catch (error) {
    console.error('Error processing payment success:', error);
    return NextResponse.json(
      { error: 'Failed to process booking' },
      { status: 500 }
    );
  }
}
