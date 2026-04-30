import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stopAV } from '@/lib/ifttt-bridge';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * Expires a projector session — turns off AV and updates status.
 * Called by the kiosk client when timer reaches 0, or by the cron safety net.
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

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
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Already expired — idempotent
    if (session.status === 'expired') {
      return NextResponse.json({ status: 'already_expired' });
    }

    // Stop the AV equipment via IFTTT
    console.log(`🔴 Expiring session ${sessionId}: stopping AV...`);
    const avResult = await stopAV();

    if (!avResult.success) {
      console.error(`⚠️ Failed to stop AV for session ${sessionId}:`, avResult.error);
      // Still mark as expired to prevent extended usage
    }

    // Update session to expired
    const { error: updateError } = await supabase
      .from('projector_sessions')
      .update({
        status: 'expired',
        projector_on: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Failed to update session to expired:', updateError);
      return NextResponse.json({ error: 'Failed to expire session' }, { status: 500 });
    }

    console.log(`✅ Session ${sessionId} expired. AV shutdown ${avResult.success ? 'successful' : 'failed (manual intervention may be needed)'}`);

    return NextResponse.json({
      status: 'expired',
      projectorOff: avResult.success,
    });
  } catch (error) {
    console.error('Error expiring session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to expire session' },
      { status: 500 }
    );
  }
}
