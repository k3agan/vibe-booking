import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stopAV } from '@/lib/ifttt-bridge';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * Cron job safety net: checks for expired projector sessions
 * and turns off the AV equipment if the iPad client failed to do so.
 * 
 * Should run every minute via Vercel Cron.
 * 
 * Add to vercel.json:
 * {
 *   "crons": [{ "path": "/api/cron/check-projector-sessions", "schedule": "* * * * *" }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find active sessions that have expired
    const now = new Date().toISOString();
    const { data: expiredSessions, error } = await supabase
      .from('projector_sessions')
      .select('*')
      .eq('status', 'active')
      .lt('expires_at', now);

    if (error) {
      console.error('Error querying expired sessions:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!expiredSessions || expiredSessions.length === 0) {
      return NextResponse.json({ message: 'No expired sessions', checked: 0 });
    }

    console.log(`🔍 Found ${expiredSessions.length} expired session(s) to clean up`);

    let cleaned = 0;
    for (const session of expiredSessions) {
      try {
        console.log(`🔴 Cron: expiring session ${session.id} (was due at ${session.expires_at})`);

        // Stop AV equipment
        if (session.projector_on) {
          const avResult = await stopAV();
          if (!avResult.success) {
            console.error(`⚠️ Cron: Failed to stop AV for session ${session.id}`);
          }
        }

        // Update session status
        await supabase
          .from('projector_sessions')
          .update({
            status: 'expired',
            projector_on: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', session.id);

        cleaned++;
        console.log(`✅ Cron: session ${session.id} expired successfully`);
      } catch (sessionError) {
        console.error(`❌ Cron: Error processing session ${session.id}:`, sessionError);
      }
    }

    // Also clean up stale pending sessions (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await supabase
      .from('projector_sessions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('status', 'pending')
      .lt('created_at', oneHourAgo);

    return NextResponse.json({
      message: `Cleaned up ${cleaned} expired session(s)`,
      checked: expiredSessions.length,
      cleaned,
    });
  } catch (error) {
    console.error('Cron check-projector-sessions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron job failed' },
      { status: 500 }
    );
  }
}
