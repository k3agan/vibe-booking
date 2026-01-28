-- Friend discount codes and booking metadata
-- Run this in Supabase SQL Editor after schema.sql

-- Allow payment_intent_id to be nullable for comped bookings
ALTER TABLE bookings
  ALTER COLUMN payment_intent_id DROP NOT NULL;

-- Extend payment_status to allow comped bookings
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN ('pending', 'succeeded', 'failed', 'cancelled', 'comped'));

-- Add discount metadata to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS discount_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20)
    CHECK (discount_type IN ('percent', 'fixed', 'full')),
  ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS comped BOOLEAN DEFAULT FALSE;

-- Discount codes table
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percent', 'fixed', 'full')),
  discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  uses_remaining INTEGER NOT NULL DEFAULT 1 CHECK (uses_remaining >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);

-- Enable RLS and allow service role to manage
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role to manage discount codes" ON discount_codes
  FOR ALL USING (auth.role() = 'service_role');
