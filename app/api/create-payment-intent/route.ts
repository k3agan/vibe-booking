import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeApiKey } from '@/lib/api-key-rotation';

const stripe = new Stripe(getStripeApiKey(), {
  apiVersion: '2025-08-27.basil',
});

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    const stripeKey = getStripeApiKey();
    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY not configured');
      return NextResponse.json(
        { error: 'Payment system not configured. Please contact support.' },
        { status: 500 }
      );
    }

    const { amount, bookingData } = await request.json();

    // Validate amount
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    console.log('Creating payment intent for amount:', amount);

    // Create or retrieve Stripe customer
    let customer;
    try {
      // First, try to find existing customer by email
      const existingCustomers = await stripe.customers.list({
        email: bookingData.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        // Update existing customer with latest information
        customer = await stripe.customers.update(existingCustomers.data[0].id, {
          name: bookingData.name,
          email: bookingData.email,
          phone: bookingData.phone,
          metadata: {
            organization: bookingData.organization || '',
            last_booking_date: bookingData.selectedDate,
          },
        });
        console.log('Updated existing customer:', customer.id);
      } else {
        // Create new customer
        customer = await stripe.customers.create({
          name: bookingData.name,
          email: bookingData.email,
          phone: bookingData.phone,
          metadata: {
            organization: bookingData.organization || '',
            first_booking_date: bookingData.selectedDate,
          },
        });
        console.log('Created new customer:', customer.id);
      }
    } catch (customerError) {
      console.error('Error creating/updating customer:', customerError);
      // Continue without customer if there's an error
    }

    // Create payment intent with setup_future_usage to save payment method
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'cad',
      customer: customer?.id, // Associate with customer if created
      metadata: {
        bookingData: JSON.stringify(bookingData),
      },
      automatic_payment_methods: {
        enabled: true,
      },
      setup_future_usage: 'off_session', // Save payment method for future authorizations
    });

    console.log('Payment intent created:', paymentIntent.id);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
