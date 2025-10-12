import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getBookingsNeedingDamageDepositAuth, updateDamageDepositAuthorization, logEmailSent } from '../../../../lib/database';
import { sendDamageDepositAuthNotification } from '../../../lib/email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (optional security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔒 Starting damage deposit authorization cron job...');

    // Get bookings that are 3 days away and need damage deposit authorization
    const bookings = await getBookingsNeedingDamageDepositAuth(3);

    console.log(`Found ${bookings.length} booking(s) needing damage deposit authorization`);

    let successCount = 0;
    let failureCount = 0;
    const results = [];

    for (const booking of bookings) {
      try {
        console.log(`Processing booking ${booking.booking_ref} for ${booking.customer_name}`);

        // Create authorization (hold) for damage deposit
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(booking.damage_deposit_amount! * 100), // Convert to cents
          currency: 'cad',
          customer: undefined, // We're using payment_method directly
          payment_method: booking.payment_method_id!,
          confirm: false, // Don't capture immediately - just authorize
          capture_method: 'manual', // Important: Manual capture means it's a hold
          metadata: {
            booking_ref: booking.booking_ref,
            booking_id: booking.id,
            type: 'damage_deposit',
          },
          description: `Damage deposit hold for ${booking.event_type} - ${booking.customer_name}`,
        });

        // Confirm the payment intent to place the hold
        const confirmedIntent = await stripe.paymentIntents.confirm(paymentIntent.id, {
          payment_method: booking.payment_method_id!,
          off_session: true, // Customer is not present
        });

        if (confirmedIntent.status === 'requires_capture') {
          // Successfully authorized! Update database
          await updateDamageDepositAuthorization(
            booking.id,
            confirmedIntent.id,
            'authorized'
          );

          // Send notification email to customer
          try {
            const emailResult = await sendDamageDepositAuthNotification({
              customerName: booking.customer_name,
              customerEmail: booking.customer_email,
              bookingRef: booking.booking_ref,
              eventDate: booking.selected_date,
              damageDepositAmount: booking.damage_deposit_amount!,
              eventType: booking.event_type,
            });

            if (emailResult.success) {
              await logEmailSent(booking.id, 'reminder', booking.customer_email, 'sent');
            } else {
              await logEmailSent(booking.id, 'reminder', booking.customer_email, 'failed', emailResult.error);
            }
          } catch (emailError) {
            console.error(`Failed to send damage deposit notification for ${booking.booking_ref}:`, emailError);
            // Don't fail the authorization if email fails
          }

          successCount++;
          results.push({
            booking_ref: booking.booking_ref,
            status: 'success',
            amount: booking.damage_deposit_amount,
            authorization_id: confirmedIntent.id,
          });

          console.log(`✅ Damage deposit authorized for ${booking.booking_ref}: $${booking.damage_deposit_amount}`);
        } else {
          throw new Error(`Unexpected payment intent status: ${confirmedIntent.status}`);
        }
      } catch (error) {
        failureCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Failed to authorize damage deposit for ${booking.booking_ref}:`, errorMessage);
        
        results.push({
          booking_ref: booking.booking_ref,
          status: 'failed',
          error: errorMessage,
        });

        // Optionally: Log failure or send alert to admin
      }
    }

    console.log(`✅ Damage deposit authorization complete: ${successCount} success, ${failureCount} failed`);

    return NextResponse.json({
      success: true,
      message: `Processed ${bookings.length} bookings: ${successCount} authorized, ${failureCount} failed`,
      results,
    });
  } catch (error) {
    console.error('❌ Error in damage deposit authorization cron:', error);
    return NextResponse.json(
      {
        error: 'Failed to process damage deposit authorizations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

