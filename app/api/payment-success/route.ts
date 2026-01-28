import { NextRequest, NextResponse } from 'next/server';
import { sendBookingConfirmation, sendDamageDepositAuthNotification } from '../../lib/email';
import { createBooking, logEmailSent, updateBookingPaymentMethod, updateDamageDepositAuthorization } from '../../../lib/database';
import Stripe from 'stripe';
import { fromZonedTime, toZonedTime, format } from 'date-fns-tz';
import { getStripeApiKey } from '@/lib/api-key-rotation';
import { sendConversionToGoogleAds, calculateDaysUntilEvent } from '../../../lib/enhanced-conversions';
import { calculateBookingPrice, calculateEventTimes, createCalendarEventForBooking } from '../../../lib/booking';

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
    const calculatedPrice = calculateBookingPrice(bookingData);

    // Calculate event times
    const { dateOnly, startDateTime, endDateTime } = calculateEventTimes(bookingData);

    console.log('Date calculation:', {
      selectedDate: bookingData.selectedDate,
      dateOnly,
      startTime: bookingData.startTime,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      duration: bookingData.duration
    });

    // Create calendar event (with production error handling)
    const calendarEventId = await createCalendarEventForBooking(bookingData, startDateTime, endDateTime);

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

    // Send Google Ads conversion tracking
    try {
      const daysUntilEvent = calculateDaysUntilEvent(bookingData.selectedDate);
      
      const conversionData = {
        transaction_id: bookingRef,
        value: calculatedPrice,
        currency: 'CAD',
        event_type: bookingData.eventType,
        booking_type: bookingData.bookingType,
        days_until_event: daysUntilEvent,
        guest_count: parseInt(bookingData.guestCount),
        enhanced_conversions: {
          email: bookingData.email,
          phone: bookingData.phone,
          name: bookingData.name,
        }
      };

      const conversionSent = await sendConversionToGoogleAds(conversionData);
      if (conversionSent) {
        console.log('Google Ads conversion sent successfully:', bookingRef);
      } else {
        console.warn('Failed to send Google Ads conversion');
      }
    } catch (conversionError) {
      console.error('Error sending Google Ads conversion:', conversionError);
      // Don't fail the booking if conversion tracking fails
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
