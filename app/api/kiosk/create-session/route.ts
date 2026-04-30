import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Use the secondary Stripe account for kiosk payments
const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY_SECONDARY || process.env.STRIPE_SECRET_KEY || '',
  { apiVersion: '2025-08-27.basil' }
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const PRICE_PER_HOUR_CENTS = parseInt(process.env.KIOSK_STRIPE_PRICE_CENTS || '100', 10);

export async function POST(request: NextRequest) {
  try {
    const { hours } = await request.json();

    // Validate hours
    const numHours = Math.max(1, Math.min(12, Math.floor(Number(hours) || 1)));
    const amountCents = numHours * PRICE_PER_HOUR_CENTS;

    // Check for already-active session to prevent double-booking
    const { data: activeSession } = await supabase
      .from('projector_sessions')
      .select('id')
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString())
      .limit(1)
      .single();

    if (activeSession) {
      return NextResponse.json(
        { error: 'Projector is currently in use. Please wait or extend the active session.' },
        { status: 409 }
      );
    }

    // Create a projector session record (pending)
    const { data: session, error: dbError } = await supabase
      .from('projector_sessions')
      .insert({
        amount_paid: amountCents,
        hours_purchased: numHours,
        status: 'pending',
      })
      .select()
      .single();

    if (dbError || !session) {
      console.error('Failed to create projector session:', dbError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Determine the base URL for redirects
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: 'Projector Usage',
              description: `${numHours} hour${numHours > 1 ? 's' : ''} of projector time`,
            },
            unit_amount: PRICE_PER_HOUR_CENTS,
          },
          quantity: numHours,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/kiosk/av?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/kiosk/av?payment=cancelled`,
      metadata: {
        projector_session_id: session.id,
        type: 'kiosk_projector',
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min expiry
    });

    // Update session with Stripe checkout ID
    await supabase
      .from('projector_sessions')
      .update({
        stripe_checkout_session_id: checkoutSession.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    console.log(`🎬 Created kiosk session ${session.id} → Stripe ${checkoutSession.id} for ${numHours}h ($${(amountCents / 100).toFixed(2)})`);

    return NextResponse.json({
      sessionId: session.id,
      checkoutUrl: checkoutSession.url,
      checkoutSessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error('Error creating kiosk session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create session' },
      { status: 500 }
    );
  }
}
