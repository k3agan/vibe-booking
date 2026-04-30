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

/**
 * Extends an active session by 1 hour.
 * Creates a new Stripe Checkout Session for the additional payment.
 * The kiosk shows a new QR code for the user to scan.
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Verify session exists and is active
    const { data: session, error: fetchError } = await supabase
      .from('projector_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'active') {
      return NextResponse.json({ error: 'Session is not active' }, { status: 400 });
    }

    // Determine the base URL for redirects
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    // Create a new Stripe Checkout Session for the extension
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: 'Projector Time Extension',
              description: '1 additional hour of projector time',
            },
            unit_amount: PRICE_PER_HOUR_CENTS,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/kiosk/av?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/kiosk/av`,
      metadata: {
        projector_session_id: sessionId,
        type: 'kiosk_projector_extension',
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min expiry
    });

    console.log(`⏰ Extension checkout created for session ${sessionId} → Stripe ${checkoutSession.id}`);

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      checkoutSessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error('Error creating extension session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create extension' },
      { status: 500 }
    );
  }
}
