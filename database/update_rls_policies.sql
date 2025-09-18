-- Update RLS policies to allow admin operations
-- Run this in your Supabase SQL Editor

-- Allow updates to bookings table for admin operations
CREATE POLICY "Allow admin to update bookings" ON public.bookings
FOR UPDATE USING (true);

-- Allow deletes to bookings table for admin operations  
CREATE POLICY "Allow admin to delete bookings" ON public.bookings
FOR DELETE USING (true);

-- Allow inserts to email_logs for admin operations
CREATE POLICY "Allow admin to insert email logs" ON public.email_logs
FOR INSERT WITH CHECK (true);

-- Allow updates to email_logs for admin operations
CREATE POLICY "Allow admin to update email logs" ON public.email_logs
FOR UPDATE USING (true);
