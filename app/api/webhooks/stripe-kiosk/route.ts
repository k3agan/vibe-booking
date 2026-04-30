import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Use the secondary Stripe account for kiosk payments
const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY_SECONDARY || process.env.STRIPE_SECRET_KEY || '',
  { apiVersion: '2025-08-27.basil' }
);

const WEBHOOK_SECRET = process.env.STRIPE_KIOSK_WEBHOOK_SECRET || '';

/**
 * Stripe webhook handler for kiosk projector payments.
 * Listens for checkout.session.completed events and activates the projector session.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (!sig) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
    } catch (err) {
      console.error('⚠️ Webhook signature verification failed:', err instanceof Error ? err.message : err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const projectorSessionId = session.metadata?.projector_session_id;
        const type = session.metadata?.type;

        // Only handle kiosk-related events
        if (!projectorSessionId || !type?.startsWith('kiosk_projector')) {
          console.log(`Ignoring non-kiosk checkout event: ${session.id}`);
          break;
        }

        console.log(`💳 Kiosk payment completed: ${session.id} → session ${projectorSessionId} (type: ${type})`);

        // Determine the base URL from the webhook request
        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const baseUrl = `${protocol}://${host}`;

        if (type === 'kiosk_projector') {
          // New session — activate it
          const activateRes = await fetch(`${baseUrl}/api/kiosk/activate-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: projectorSessionId,
              stripePaymentIntentId: session.payment_intent,
            }),
          });

          if (!activateRes.ok) {
            console.error(`❌ Failed to activate session ${projectorSessionId}`);
          }
        } else if (type === 'kiosk_projector_extension') {
          // Extension — add time to existing session
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
          );

          const { data: existingSession } = await supabase
            .from('projector_sessions')
            .select('*')
            .eq('id', projectorSessionId)
            .single();

          if (existingSession && existingSession.expires_at) {
            const currentExpiry = new Date(existingSession.expires_at);
            const newExpiry = new Date(currentExpiry.getTime() + 60 * 60 * 1000); // +1 hour
            const newTotal = (existingSession.amount_paid || 0) + 100;
            const newHours = (existingSession.hours_purchased || 1) + 1;

            await supabase
              .from('projector_sessions')
              .update({
                expires_at: newExpiry.toISOString(),
                amount_paid: newTotal,
                hours_purchased: newHours,
                updated_at: new Date().toISOString(),
              })
              .eq('id', projectorSessionId);

            console.log(`⏰ Extended session ${projectorSessionId} to ${newExpiry.toISOString()} (${newHours}h total)`);
          }
        }
        break;
      }

      default:
        // Ignore other event types
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
