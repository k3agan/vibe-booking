import { supabase, Booking, EmailLog } from './supabase'

// Booking operations
export async function createBooking(bookingData: {
  bookingRef: string
  customerName: string
  customerEmail: string
  customerPhone: string
  organization?: string
  eventType: string
  guestCount: number
  specialRequirements?: string
  selectedDate: string
  startTime: string
  endTime: string
  bookingType: 'hourly' | 'fullday'
  duration: number
  calculatedPrice: number
  paymentIntentId?: string | null
  paymentStatus?: 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'comped'
  calendarEventId?: string
  discountCode?: string | null
  discountType?: 'percent' | 'fixed' | 'full' | null
  discountValue?: number | null
  comped?: boolean
}) {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      booking_ref: bookingData.bookingRef,
      customer_name: bookingData.customerName,
      customer_email: bookingData.customerEmail,
      customer_phone: bookingData.customerPhone,
      organization: bookingData.organization,
      event_type: bookingData.eventType,
      guest_count: bookingData.guestCount,
      special_requirements: bookingData.specialRequirements,
      selected_date: bookingData.selectedDate,
      start_time: bookingData.startTime,
      end_time: bookingData.endTime,
      booking_type: bookingData.bookingType,
      duration: bookingData.duration,
      calculated_price: bookingData.calculatedPrice,
      payment_intent_id: bookingData.paymentIntentId ?? null,
      calendar_event_id: bookingData.calendarEventId,
      payment_status: bookingData.paymentStatus ?? 'succeeded',
      status: 'confirmed',
      discount_code: bookingData.discountCode ?? null,
      discount_type: bookingData.discountType ?? null,
      discount_value: bookingData.discountValue ?? null,
      comped: bookingData.comped ?? false
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating booking:', error)
    throw new Error(`Failed to create booking: ${error.message}`)
  }

  return data as Booking
}

export async function getBookingByRef(bookingRef: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('booking_ref', bookingRef)
    .single()

  if (error) {
    console.error('Error fetching booking:', error)
    return null
  }

  return data as Booking
}

export async function getBookingsByEmail(email: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('customer_email', email)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching bookings:', error)
    return []
  }

  return data as Booking[]
}

export async function updateBookingStatus(bookingRef: string, status: 'confirmed' | 'cancelled' | 'completed') {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('booking_ref', bookingRef)
    .select()
    .single()

  if (error) {
    console.error('Error updating booking status:', error)
    throw new Error(`Failed to update booking: ${error.message}`)
  }

  return data as Booking
}

export async function getUpcomingBookings(days: number = 7) {
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + days)
  
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .gte('selected_date', new Date().toISOString().split('T')[0])
    .lte('selected_date', futureDate.toISOString().split('T')[0])
    .eq('status', 'confirmed')
    .order('selected_date', { ascending: true })

  if (error) {
    console.error('Error fetching upcoming bookings:', error)
    return []
  }

  return data as Booking[]
}

// Email log operations
export async function logEmailSent(bookingId: string, emailType: 'confirmation' | 'reminder' | 'followup' | 'cancellation', recipientEmail: string, status: 'sent' | 'failed', errorMessage?: string) {
  const { data, error } = await supabase
    .from('email_logs')
    .insert({
      booking_id: bookingId,
      email_type: emailType,
      recipient_email: recipientEmail,
      status,
      error_message: errorMessage
    })
    .select()
    .single()

  if (error) {
    console.error('Error logging email:', error)
    // Don't throw here as this is just logging
  }

  return data as EmailLog
}

export async function markReminderSent(bookingId: string) {
  const { error } = await supabase
    .from('bookings')
    .update({ reminder_sent: true })
    .eq('id', bookingId)

  if (error) {
    console.error('Error marking reminder sent:', error)
    throw new Error(`Failed to mark reminder sent: ${error.message}`)
  }
}

export async function markFollowupSent(bookingId: string) {
  const { error } = await supabase
    .from('bookings')
    .update({ followup_sent: true })
    .eq('id', bookingId)

  if (error) {
    console.error('Error marking followup sent:', error)
    throw new Error(`Failed to mark followup sent: ${error.message}`)
  }
}


// Helper function to get completed bookings for follow-ups
export async function getCompletedBookings(days: number): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .gte('selected_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .lte('selected_date', new Date().toISOString().split('T')[0])
    .order('selected_date', { ascending: false });

  if (error) {
    console.error('Error fetching completed bookings:', error);
    throw new Error(`Failed to fetch completed bookings: ${error.message}`);
  }

  return data as Booking[];
}

// Helper function to mark follow-up as sent (alias for existing function)
export async function markFollowUpSent(bookingId: string): Promise<void> {
  return markFollowupSent(bookingId);
}

// Damage deposit operations
export async function updateBookingPaymentMethod(
  bookingId: string, 
  paymentMethodId: string, 
  damageDepositAmount: number
) {
  const { data, error } = await supabase
    .from('bookings')
    .update({
      payment_method_id: paymentMethodId,
      damage_deposit_amount: damageDepositAmount
    })
    .eq('id', bookingId)
    .select()
    .single()

  if (error) {
    console.error('Error updating payment method:', error)
    throw new Error(`Failed to update payment method: ${error.message}`)
  }

  return data as Booking
}

export async function getBookingsNeedingDamageDepositAuth(daysAhead: number = 3) {
  // Use proper timezone handling for date calculation
  const vancouverTimezone = 'America/Vancouver';
  const today = new Date();
  const todayVancouver = new Date(today.toLocaleString("en-US", {timeZone: vancouverTimezone}));
  todayVancouver.setHours(0, 0, 0, 0); // Reset to start of day
  
  const targetDate = new Date(todayVancouver);
  targetDate.setDate(targetDate.getDate() + daysAhead);
  const targetDateStr = targetDate.toISOString().split('T')[0];

  console.log(`Looking for bookings on ${targetDateStr} (${daysAhead} days from today in Vancouver timezone)`);

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('selected_date', targetDateStr)
    .eq('status', 'confirmed')
    .eq('payment_status', 'succeeded')
    .or('damage_deposit_authorization_status.eq.pending,damage_deposit_authorization_status.is.null')
    .not('payment_method_id', 'is', null)

  if (error) {
    console.error('Error fetching bookings needing damage deposit auth:', error)
    return []
  }

  return data as Booking[]
}

export async function updateDamageDepositAuthorization(
  bookingId: string,
  authorizationId: string,
  status: 'authorized' | 'captured' | 'released' | 'expired'
) {
  const { data, error } = await supabase
    .from('bookings')
    .update({
      damage_deposit_authorization_id: authorizationId,
      damage_deposit_authorization_status: status,
      damage_deposit_authorized_at: new Date().toISOString()
    })
    .eq('id', bookingId)
    .select()
    .single()

  if (error) {
    console.error('Error updating damage deposit authorization:', error)
    throw new Error(`Failed to update damage deposit authorization: ${error.message}`)
  }

  return data as Booking
}

// Analytics functions
export async function getBookingStats() {
  const { data: totalBookings, error: totalError } = await supabase
    .from('bookings')
    .select('id', { count: 'exact' })

  const { data: revenueData, error: revenueError } = await supabase
    .from('bookings')
    .select('calculated_price')
    .eq('payment_status', 'succeeded')

  if (totalError || revenueError) {
    console.error('Error fetching booking stats:', totalError || revenueError)
    return { totalBookings: 0, totalRevenue: 0 }
  }

  const totalRevenue = revenueData?.reduce((sum, booking) => sum + booking.calculated_price, 0) || 0

  return {
    totalBookings: totalBookings?.length || 0,
    totalRevenue
  }
}
