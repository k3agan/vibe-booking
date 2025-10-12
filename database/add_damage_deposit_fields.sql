-- Add damage deposit fields to bookings table
-- Run this in your Supabase SQL Editor

ALTER TABLE bookings 
  ADD COLUMN payment_method_id VARCHAR(255),
  ADD COLUMN damage_deposit_amount DECIMAL(10,2),
  ADD COLUMN damage_deposit_authorization_id VARCHAR(255),
  ADD COLUMN damage_deposit_authorization_status VARCHAR(20) DEFAULT 'pending' 
    CHECK (damage_deposit_authorization_status IN ('pending', 'authorized', 'captured', 'released', 'expired')),
  ADD COLUMN damage_deposit_authorized_at TIMESTAMP WITH TIME ZONE;

-- Add index for cron job to find bookings needing authorization
CREATE INDEX idx_bookings_damage_deposit_status ON bookings(damage_deposit_authorization_status, selected_date);

-- Add comment explaining the columns
COMMENT ON COLUMN bookings.payment_method_id IS 'Stripe payment method ID saved for future authorizations';
COMMENT ON COLUMN bookings.damage_deposit_amount IS '50% of rental fee, held as authorization 3 days before event';
COMMENT ON COLUMN bookings.damage_deposit_authorization_id IS 'Stripe PaymentIntent ID for the damage deposit hold';
COMMENT ON COLUMN bookings.damage_deposit_authorization_status IS 'Status: pending (not yet authorized), authorized (hold placed), captured (charged), released (no damage), expired (auto-expired)';

