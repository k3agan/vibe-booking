-- Projector Sessions table for AV kiosk pay-per-use system
-- Tracks paid sessions for the projector/screen AV setup

CREATE TABLE projector_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  amount_paid INTEGER NOT NULL DEFAULT 100,        -- amount in cents
  hours_purchased INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',           -- pending | active | expired | cancelled
  projector_on BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: kiosk operates without authentication, so allow anonymous access
ALTER TABLE projector_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read projector sessions"
  ON projector_sessions FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert projector sessions"
  ON projector_sessions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update projector sessions"
  ON projector_sessions FOR UPDATE USING (true);

-- Index for efficient cron job queries (find expired active sessions)
CREATE INDEX idx_projector_sessions_active
  ON projector_sessions (status, expires_at)
  WHERE status = 'active';
