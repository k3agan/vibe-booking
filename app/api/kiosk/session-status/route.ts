import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const checkActive = searchParams.get('checkActive');

    // If checkActive is set, find any currently active session
    if (checkActive === 'true') {
      const { data: activeSession, error } = await supabase
        .from('projector_sessions')
        .select('*')
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !activeSession) {
        return NextResponse.json({ status: 'none' });
      }

      const expiresAt = new Date(activeSession.expires_at).getTime();
      const secondsRemaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));

      return NextResponse.json({
        sessionId: activeSession.id,
        status: activeSession.status,
        secondsRemaining,
        projectorOn: activeSession.projector_on,
        hoursPurchased: activeSession.hours_purchased,
        expiresAt: activeSession.expires_at,
      });
    }

    // Look up a specific session
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const { data: session, error } = await supabase
      .from('projector_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    let secondsRemaining = 0;
    if (session.expires_at && session.status === 'active') {
      const expiresAt = new Date(session.expires_at).getTime();
      secondsRemaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    }

    return NextResponse.json({
      sessionId: session.id,
      status: session.status,
      secondsRemaining,
      projectorOn: session.projector_on,
      hoursPurchased: session.hours_purchased,
      expiresAt: session.expires_at,
    });
  } catch (error) {
    console.error('Error checking session status:', error);
    return NextResponse.json(
      { error: 'Failed to check session status' },
      { status: 500 }
    );
  }
}
