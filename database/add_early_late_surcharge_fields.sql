-- Add early/late access and fee breakdown fields to bookings table
-- Run this in Supabase SQL Editor after schema.sql

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS early_access_option VARCHAR(20)
    CHECK (early_access_option IN ('none', 'standard', 'extra')),
  ADD COLUMN IF NOT EXISTS late_access_option VARCHAR(20)
    CHECK (late_access_option IN ('none', 'standard', 'after_midnight')),
  ADD COLUMN IF NOT EXISTS surcharge_total DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS pricing_breakdown JSONB;

COMMENT ON COLUMN bookings.early_access_option IS 'Early access add-on selection (none, standard, extra)';
COMMENT ON COLUMN bookings.late_access_option IS 'Late access add-on selection (none, standard, after_midnight)';
COMMENT ON COLUMN bookings.surcharge_total IS 'Total fee amount for early/late access';
COMMENT ON COLUMN bookings.pricing_breakdown IS 'JSON breakdown of fee line items';
