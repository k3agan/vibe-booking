-- Fix RLS policies for email_logs table
-- Run this in your Supabase SQL Editor

-- First, drop any existing policies that might be conflicting
DROP POLICY IF EXISTS "Allow admin to insert email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Allow admin to update email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.email_logs;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.email_logs;

-- Create new policies that allow the application to insert email logs
CREATE POLICY "Enable insert for email logs" ON public.email_logs
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for email logs" ON public.email_logs
FOR SELECT USING (true);

CREATE POLICY "Enable update for email logs" ON public.email_logs
FOR UPDATE USING (true);

-- Also ensure the table has RLS enabled but with permissive policies
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
