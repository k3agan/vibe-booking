-- Capitol Hill Hall Booking System Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bookings table
CREATE TABLE bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_ref VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  organization VARCHAR(255),
  event_type VARCHAR(100) NOT NULL,
  guest_count INTEGER NOT NULL CHECK (guest_count > 0),
  special_requirements TEXT,
  selected_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  booking_type VARCHAR(20) NOT NULL CHECK (booking_type IN ('hourly', 'fullday')),
  duration INTEGER NOT NULL CHECK (duration > 0),
  calculated_price DECIMAL(10,2) NOT NULL CHECK (calculated_price >= 0),
  payment_intent_id VARCHAR(255) UNIQUE,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'succeeded', 'failed', 'cancelled', 'comped')),
  calendar_event_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  reminder_sent BOOLEAN DEFAULT FALSE,
  followup_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  discount_code VARCHAR(100),
  discount_type VARCHAR(20) CHECK (discount_type IN ('percent', 'fixed', 'full')),
  discount_value DECIMAL(10,2),
  comped BOOLEAN DEFAULT FALSE
);

-- Email logs table
CREATE TABLE email_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  email_type VARCHAR(20) NOT NULL CHECK (email_type IN ('confirmation', 'reminder', 'followup', 'cancellation')),
  recipient_email VARCHAR(255) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message TEXT
);

-- Indexes for better performance
CREATE INDEX idx_bookings_date ON bookings(selected_date);
CREATE INDEX idx_bookings_email ON bookings(customer_email);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_email_logs_booking_id ON email_logs(booking_id);
CREATE INDEX idx_email_logs_type ON email_logs(email_type);

-- Discount codes table
CREATE TABLE discount_codes (
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

CREATE INDEX idx_discount_codes_code ON discount_codes(code);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_bookings_updated_at 
    BEFORE UPDATE ON bookings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

-- Allow public to insert bookings (for the booking form)
CREATE POLICY "Allow public to insert bookings" ON bookings
    FOR INSERT WITH CHECK (true);

-- Allow public to read their own bookings by email
CREATE POLICY "Allow users to read their own bookings" ON bookings
    FOR SELECT USING (customer_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Allow service role to read all bookings (for admin functions)
CREATE POLICY "Allow service role to read all bookings" ON bookings
    FOR ALL USING (auth.role() = 'service_role');

-- Allow service role to manage email logs
CREATE POLICY "Allow service role to manage email logs" ON email_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Allow service role to manage discount codes
CREATE POLICY "Allow service role to manage discount codes" ON discount_codes
    FOR ALL USING (auth.role() = 'service_role');

-- Sample data (optional - remove in production)
-- INSERT INTO bookings (
--   booking_ref, customer_name, customer_email, customer_phone, 
--   event_type, guest_count, selected_date, start_time, end_time, 
--   booking_type, duration, calculated_price, payment_intent_id, 
--   payment_status, status
-- ) VALUES (
--   'CHH-1234567890', 'John Doe', 'john@example.com', '604-123-4567',
--   'Birthday Party', 25, '2024-02-15', '18:00:00', '22:00:00',
--   'hourly', 4, 200.00, 'pi_test_123', 'succeeded', 'confirmed'
-- );
