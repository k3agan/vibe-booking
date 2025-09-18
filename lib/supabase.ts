import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Booking {
  id: string
  booking_ref: string
  customer_name: string
  customer_email: string
  customer_phone: string
  organization?: string
  event_type: string
  guest_count: number
  special_requirements?: string
  selected_date: string
  start_time: string
  end_time: string
  booking_type: 'hourly' | 'fullday'
  duration: number
  calculated_price: number
  payment_intent_id: string
  payment_status: 'pending' | 'succeeded' | 'failed' | 'cancelled'
  calendar_event_id?: string
  status: 'confirmed' | 'cancelled' | 'completed'
  created_at: string
  updated_at: string
  reminder_sent: boolean
  followup_sent: boolean
}

export interface EmailLog {
  id: string
  booking_id: string
  email_type: 'confirmation' | 'reminder' | 'followup' | 'cancellation'
  recipient_email: string
  sent_at: string
  status: 'sent' | 'failed'
  error_message?: string
}
