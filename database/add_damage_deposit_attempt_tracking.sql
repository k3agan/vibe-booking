-- Damage-deposit hold telemetry (policy 2026-10-31-01).
-- Run in the Supabase SQL Editor before or after deploying the
-- deposit-hold-enforcement change (safe either order). Additive + nullable;
-- safe to run more than once.
--
-- damage_deposit_last_attempt_at
--   Stamped atomically by /api/cron/authorize-damage-deposits when it claims a
--   booking for today's attempt; a second run the same Vancouver day skips the
--   booking (no duplicate holds / cancellations / emails).
-- damage_deposit_last_error
--   Outcome of the latest attempt: NULL = hold placed, otherwise
--   "RENTER_DECLINE <code>: <message>" or "SYSTEM_FAILURE <code>: <message>".
--   Shown in the /api/cron/deposit-watchdog email.
-- damage_deposit_stripe_account
--   'primary' | 'secondary' — the Stripe account the latest hold (or decline)
--   landed on.
--
-- Until this runs, the code still works: holds/cancellations proceed, the
-- per-day claim falls back to Stripe/Resend idempotency keys + status checks,
-- and telemetry writes are skipped with a log line.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS damage_deposit_last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS damage_deposit_last_error TEXT,
  ADD COLUMN IF NOT EXISTS damage_deposit_stripe_account TEXT;

COMMENT ON COLUMN bookings.damage_deposit_last_attempt_at IS 'When the deposit-hold cron last attempted (claimed) this booking';
COMMENT ON COLUMN bookings.damage_deposit_last_error IS 'Latest deposit-hold outcome: NULL = authorized, else RENTER_DECLINE/SYSTEM_FAILURE <code>: <message>';
COMMENT ON COLUMN bookings.damage_deposit_stripe_account IS 'Stripe account (primary/secondary) the latest deposit hold or decline landed on';
