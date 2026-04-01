-- Run in Supabase SQL Editor (or via migration) on the `bookings` table.
-- Adds columns used by admin cancellation / refund flow. Safe to run more than once.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT,
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

COMMENT ON COLUMN bookings.stripe_refund_id IS 'Stripe refund id when a refund was issued on cancellation';
COMMENT ON COLUMN bookings.refund_amount IS 'Refund amount in CAD when a refund was issued';
COMMENT ON COLUMN bookings.cancellation_reason IS 'Optional admin-entered reason for cancellation';
COMMENT ON COLUMN bookings.cancelled_at IS 'When the booking was marked cancelled';
