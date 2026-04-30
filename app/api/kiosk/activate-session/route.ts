import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { startAV } from '@/lib/ifttt-bridge';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * Activates a projector session after payment is confirmed.
 * Called by the Stripe webhook handler.
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, stripePaymentIntentId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Get the session
    const { data: session, error: fetchError } = await supabase
      .from('projector_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      console.error('Session not found for activation:', sessionId);
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Prevent double activation
    if (session.status === 'active') {
      console.log(`Session ${sessionId} already active, skipping activation`);
      return NextResponse.json({ status: 'already_active' });
    }

    // Calculate start and expiry times
    const now = new Date();
    const expiresAt = new Date(now.getTime() + session.hours_purchased * 60 * 60 * 1000);

    // Start the AV equipment via IFTTT
    console.log(`🎬 Activating session ${sessionId}: starting AV...`);
    const avResult = await startAV();

    if (!avResult.success) {
      console.error(`❌ Failed to start AV for session ${sessionId}:`, avResult.error);
      // Still activate the session — user paid. Log the error for manual follow-up.
      // The projector may need manual intervention but the timer should run.
    }

    // Update session to active
    const { error: updateError } = await supabase
      .from('projector_sessions')
      .update({
        status: 'active',
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        projector_on: avResult.success,
        stripe_payment_intent_id: stripePaymentIntentId || session.stripe_payment_intent_id,
        updated_at: now.toISOString(),
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Failed to update session to active:', updateError);
      return NextResponse.json({ error: 'Failed to activate session' }, { status: 500 });
    }

    console.log(`✅ Session ${sessionId} activated. Expires at ${expiresAt.toISOString()}`);

    return NextResponse.json({
      status: 'active',
      startedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      projectorOn: avResult.success,
    });
  } catch (error) {
    console.error('Error activating session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to activate session' },
      { status: 500 }
    );
  }
}
