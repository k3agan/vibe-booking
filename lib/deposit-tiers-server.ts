import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { formatInTimeZone } from 'date-fns-tz';
import { supabase as anonSupabase } from './supabase';
import { computeDamageDeposit, isSameRenter, normalizeEmail, normalizePhone } from './deposit-tiers';

const VANCOUVER_TIMEZONE = 'America/Vancouver';
const CANDIDATE_LIMIT = 100;

let serviceClient: SupabaseClient | null = null;

/**
 * Prefer the service-role client (bypasses RLS) when configured; fall back to the
 * anon client the rest of lib/database.ts uses. Created lazily so a missing
 * service-role key never breaks module import.
 */
function getBookingsReader(): SupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (serviceRoleKey && url) {
    serviceClient ??= createClient(url, serviceRoleKey, { auth: { persistSession: false } });
    return serviceClient;
  }
  return anonSupabase;
}

type RenterRow = { customer_email: string | null; customer_phone: string | null };

/**
 * A RETURNING renter has at least one past booking (selected_date before today,
 * America/Vancouver) that was not cancelled (status 'confirmed'), matching the email
 * (case-insensitive, trimmed) OR the phone (digits only, last 10 digits).
 *
 * The DB queries are deliberately loose (ILIKE candidates); exact matching is
 * done in code with isSameRenter(). Never return the matched rows to callers.
 * On a lookup error the renter is treated as new (the higher deposit).
 */
export async function isReturningRenter(
  email: string | null | undefined,
  phone: string | null | undefined,
  now: Date = new Date()
): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedEmail && !normalizedPhone) {
    return false;
  }

  // Everything below is inside try/catch: this runs in /api/payment-success after the
  // renter has paid, so it must never throw.
  try {
    const today = formatInTimeZone(now, VANCOUVER_TIMEZONE, 'yyyy-MM-dd');
    const client = getBookingsReader();
    const pastConfirmed = () =>
      client
        .from('bookings')
        .select('customer_email, customer_phone')
        // 'completed' is defined in the schema but never set today; include it so a
        // future "mark completed" job doesn't silently turn returning renters into new ones.
        .in('status', ['confirmed', 'completed'])
        .lt('selected_date', today)
        .limit(CANDIDATE_LIMIT);

    // LIKE wildcards in the input (`_`, `%`) only widen the candidate set; exact
    // comparison happens in isSameRenter. Backslashes would act as escapes, so
    // turn them into single-character wildcards.
    const likeSafe = (value: string) => value.replace(/\\/g, '_');

    const queries: Array<PromiseLike<{ data: RenterRow[] | null; error: { message: string } | null }>> = [];
    if (normalizedEmail) {
      queries.push(pastConfirmed().ilike('customer_email', `%${likeSafe(normalizedEmail)}%`));
    }
    if (normalizedPhone) {
      // Digits in order with anything between them, e.g. "(604) 555-1234" or "+1 604.555.1234".
      queries.push(pastConfirmed().ilike('customer_phone', `%${normalizedPhone.split('').join('%')}%`));
    }

    const results = await Promise.all(queries);
    for (const { data, error } of results) {
      if (error) {
        console.error('Returning-renter lookup failed; treating renter as new:', error.message);
        continue;
      }
      if ((data ?? []).some((row) => isSameRenter({ email, phone }, row))) {
        return true;
      }
    }
  } catch (error) {
    console.error('Returning-renter lookup threw; treating renter as new:', error);
  }

  return false;
}

/**
 * Single source of truth for the deposit used by both the pre-payment quote
 * (/api/damage-deposit-quote) and the stored amount (/api/payment-success).
 */
export async function getDamageDepositForBooking(params: {
  calculatedPrice: number;
  selectedDate: string;
  startTime: string;
  endTime: string;
  email: string | null | undefined;
  phone: string | null | undefined;
}): Promise<number> {
  const isReturning = await isReturningRenter(params.email, params.phone);
  return computeDamageDeposit({
    calculatedPrice: params.calculatedPrice,
    selectedDate: params.selectedDate,
    startTime: params.startTime,
    endTime: params.endTime,
    isReturning,
  });
}
