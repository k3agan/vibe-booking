import { supabase, Booking, EmailLog } from './supabase'
import { DEPOSIT_HOLD_DAYS_AHEAD, vancouverDateString } from './damage-deposit'

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
  earlyAccessOption?: 'none' | 'standard' | 'extra'
  lateAccessOption?: 'none' | 'standard' | 'after_midnight'
  surchargeTotal?: number
  pricingBreakdown?: unknown
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
      comped: bookingData.comped ?? false,
      early_access_option: bookingData.earlyAccessOption ?? null,
      late_access_option: bookingData.lateAccessOption ?? null,
      surcharge_total: bookingData.surchargeTotal ?? null,
      pricing_breakdown: bookingData.pricingBreakdown ?? null
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
    .neq('status', 'cancelled')
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

/**
 * Bookings that still need a damage-deposit hold: selected_date from today
 * through today+daysAhead (Vancouver) — a catch-up window, so a missed cron run
 * or a booking made <4 days out still gets a hold. Includes bookings with no
 * card on file so the cron can alert on them (they can't be held). Throws on
 * query errors: an empty list must mean "nothing to do", never "DB failed".
 */
export async function getBookingsNeedingDamageDepositAuth(daysAhead: number = DEPOSIT_HOLD_DAYS_AHEAD) {
  const now = new Date()
  const fromDate = vancouverDateString(now)
  const toDate = vancouverDateString(now, daysAhead)
  console.log(`Looking for bookings from ${fromDate} to ${toDate} (Vancouver) needing a deposit hold`)

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .gte('selected_date', fromDate)
    .lte('selected_date', toDate)
    .eq('status', 'confirmed')
    .eq('payment_status', 'succeeded')
    .or('damage_deposit_authorization_status.eq.pending,damage_deposit_authorization_status.is.null')
    .not('comped', 'is', true)
    .order('selected_date', { ascending: true })

  if (error) {
    console.error('Error fetching bookings needing damage deposit auth:', error)
    throw new Error(`Failed to fetch bookings needing damage deposit auth: ${error.message}`)
  }

  return data as Booking[]
}

/** True when the error is "column doesn't exist" (migration not applied yet). */
function isMissingColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return error.code === '42703' || error.code === 'PGRST204' || /column .* does not exist|could not find the .* column/i.test(error.message ?? '')
}

export type DepositAttemptClaim =
  | { state: 'claimed'; booking: Booking }
  | { state: 'already_attempted' }
  | { state: 'tracking_unavailable' }

/**
 * Atomically claim today's hold attempt for a booking: stamps
 * damage_deposit_last_attempt_at only if the booking is still confirmed and
 * hasn't been attempted since `sinceIso` (start of today, Vancouver). A second
 * cron run the same day — or a concurrent one — gets 'already_attempted' and
 * must not touch the booking. Returns 'tracking_unavailable' if the telemetry
 * columns don't exist yet (database/add_damage_deposit_attempt_tracking.sql).
 */
export async function claimDamageDepositAttempt(bookingId: string, sinceIso: string): Promise<DepositAttemptClaim> {
  const { data, error } = await supabase
    .from('bookings')
    .update({ damage_deposit_last_attempt_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq('status', 'confirmed')
    .or(`damage_deposit_last_attempt_at.is.null,damage_deposit_last_attempt_at.lt."${sinceIso}"`)
    .select()
    .maybeSingle()

  if (error) {
    if (isMissingColumnError(error)) return { state: 'tracking_unavailable' }
    throw new Error(`Failed to claim deposit attempt: ${error.message}`)
  }
  return data ? { state: 'claimed', booking: data as Booking } : { state: 'already_attempted' }
}

/**
 * Telemetry: outcome of the latest hold attempt (null = success) and the Stripe
 * account it landed on (when known). Best-effort, never throws.
 */
export async function recordDamageDepositAttempt(
  bookingId: string,
  lastError: string | null,
  stripeAccount?: string
): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({
      damage_deposit_last_error: lastError,
      damage_deposit_last_attempt_at: new Date().toISOString(),
      ...(stripeAccount ? { damage_deposit_stripe_account: stripeAccount.toLowerCase() } : {}),
    })
    .eq('id', bookingId)
  if (error) {
    console.error(`Could not record deposit attempt telemetry for ${bookingId} (migration applied?):`, error.message)
  }
}

/**
 * Mark the hold authorized only if it is still pending — returns null if
 * another run already recorded it, so callers don't send the renter a second email.
 */
export async function markDamageDepositAuthorized(bookingId: string, authorizationId: string): Promise<Booking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .update({
      damage_deposit_authorization_id: authorizationId,
      damage_deposit_authorization_status: 'authorized',
      damage_deposit_authorized_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .or('damage_deposit_authorization_status.eq.pending,damage_deposit_authorization_status.is.null')
    .select()
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to mark damage deposit authorized: ${error.message}`)
  }
  return (data as Booking) ?? null
}

/**
 * Watchdog: confirmed, non-comped bookings from today through today+daysAhead
 * whose deposit hold is not 'authorized'.
 */
export async function getBookingsMissingDepositHold(daysAhead: number) {
  const now = new Date()
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .gte('selected_date', vancouverDateString(now))
    .lte('selected_date', vancouverDateString(now, daysAhead))
    .eq('status', 'confirmed')
    .neq('payment_status', 'comped')
    .not('comped', 'is', true)
    .or('damage_deposit_authorization_status.is.null,damage_deposit_authorization_status.neq.authorized')
    .order('selected_date', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch bookings missing a deposit hold: ${error.message}`)
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

export async function updateBookingCancellation(
  bookingId: string,
  opts: {
    stripeRefundId?: string | null
    refundAmount?: number | null
    cancellationReason?: string | null
    damageDepositReleased?: boolean
  } = {}
) {
  const updatePayload: Record<string, unknown> = {
    status: 'cancelled',
    payment_status: 'cancelled',
    updated_at: new Date().toISOString(),
    cancelled_at: new Date().toISOString(),
  }

  if (opts.stripeRefundId !== undefined) updatePayload.stripe_refund_id = opts.stripeRefundId
  if (opts.refundAmount !== undefined) updatePayload.refund_amount = opts.refundAmount
  if (opts.cancellationReason !== undefined) updatePayload.cancellation_reason = opts.cancellationReason
  if (opts.damageDepositReleased) {
    updatePayload.damage_deposit_authorization_status = 'released'
  }

  // Guarded on status so two concurrent cancellations can't both "win".
  const { data, error } = await supabase
    .from('bookings')
    .update(updatePayload)
    .eq('id', bookingId)
    .neq('status', 'cancelled')
    .select()
    .maybeSingle()

  if (error) {
    console.error('Error updating booking cancellation:', error)
    throw new Error(`Failed to update booking cancellation: ${error.message}`)
  }

  // null = the booking was already cancelled by someone else.
  return (data as Booking) ?? null
}

export async function getBookingById(bookingId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()

  if (error) {
    console.error('Error fetching booking by id:', error)
    return null
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
