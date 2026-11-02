/**
 * Damage deposit policy (applies to bookings created after this shipped;
 * existing bookings keep their stored `damage_deposit_amount`).
 *
 * Higher-risk slot = event on a Friday, Saturday or Sunday (by the booking's
 * selected date, America/Vancouver calendar date) OR ending after 18:00 on any
 * day. End times past midnight (e.g. 00:00–02:00) count as after 18:00.
 *   - New renter:       150% of the rental price
 *   - Returning renter: 100% of the rental price
 *   - Minimum $500 in both cases
 * Otherwise (Mon–Thu, ending by 18:00): 50% of the rental price.
 *
 * "Rental price" is the booking's calculated_price. Amounts are rounded to
 * whole dollars.
 *
 * This module is pure (no I/O) so it can be used on the client, the server and
 * in unit tests. The DB-backed returning-renter lookup lives in
 * `lib/deposit-tiers-server.ts`.
 */

export const STANDARD_DEPOSIT_RATE = 0.5;
export const HIGHER_RISK_NEW_RENTER_RATE = 1.5;
export const HIGHER_RISK_RETURNING_RENTER_RATE = 1.0;
export const HIGHER_RISK_MINIMUM_DEPOSIT = 500;
/** Events ending strictly after this time (minutes after midnight) are higher-risk. */
export const HIGHER_RISK_END_AFTER_MINUTES = 18 * 60;
/** Day indices (0 = Sunday) that are always higher-risk: Fri, Sat, Sun. */
const HIGHER_RISK_DAYS = [5, 6, 0];

export interface DamageDepositSlot {
  /** Booking date as YYYY-MM-DD (an ISO timestamp is accepted; only the date part is used). */
  selectedDate: string;
  /** Start time, HH:mm (24h). */
  startTime: string;
  /** End time, HH:mm (24h). An end time at or before the start time means the event ends after midnight. */
  endTime: string;
}

export interface DamageDepositInput extends DamageDepositSlot {
  /** The booking's calculated_price (rental fee before deposit). */
  calculatedPrice: number;
  /** Whether the renter has a past, non-cancelled booking (see isReturningRenter). */
  isReturning: boolean;
}

const parseTimeToMinutes = (time: string): number | null => {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(time ?? '').trim());
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

/** Day of week (0 = Sunday) of a YYYY-MM-DD calendar date, independent of the runtime timezone; null if unparseable. */
export function getDayOfWeekForDate(selectedDate: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(selectedDate ?? '').trim());
  if (!match) {
    return null;
  }
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).getUTCDay();
}

/** True when the event ends after 18:00, including end times past midnight. Unparseable times count as true. */
export function endsAfterSixPm(startTime: string, endTime: string): boolean {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  if (startMinutes === null || endMinutes === null) {
    return true;
  }

  // End at or before start => the event runs past midnight (e.g. 20:00 -> 01:00).
  if (endMinutes <= startMinutes) {
    return true;
  }

  return endMinutes > HIGHER_RISK_END_AFTER_MINUTES;
}

/**
 * Fri/Sat/Sun, or ending after 18:00. Never throws: if the date or times can't be
 * parsed the slot is treated as higher-risk (the conservative choice), because this
 * runs after the renter has already paid.
 */
export function isHigherRiskSlot({ selectedDate, startTime, endTime }: DamageDepositSlot): boolean {
  const dayOfWeek = getDayOfWeekForDate(selectedDate);
  if (dayOfWeek === null || HIGHER_RISK_DAYS.includes(dayOfWeek)) {
    return true;
  }
  return endsAfterSixPm(startTime, endTime);
}

/** Damage deposit hold amount in whole dollars. */
export function computeDamageDeposit(input: DamageDepositInput): number {
  const price = Number.isFinite(input.calculatedPrice) && input.calculatedPrice > 0 ? input.calculatedPrice : 0;

  if (!isHigherRiskSlot(input)) {
    return Math.round(price * STANDARD_DEPOSIT_RATE);
  }

  const rate = input.isReturning ? HIGHER_RISK_RETURNING_RENTER_RATE : HIGHER_RISK_NEW_RENTER_RATE;
  return Math.max(HIGHER_RISK_MINIMUM_DEPOSIT, Math.round(price * rate));
}

// ── Renter identity matching (used by the server-side returning-renter check) ──

/** Lower-cased, trimmed email, or '' when missing. */
export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

/** Minimum digits for a phone number to be used for matching (guards against junk like "0"). */
export const MIN_PHONE_DIGITS_FOR_MATCH = 7;

/** Digits only, last 10 digits (drops a leading country code), or '' when too short to match on. */
export function normalizePhone(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < MIN_PHONE_DIGITS_FOR_MATCH) {
    return '';
  }
  return digits.slice(-10);
}

/** Whether a stored booking belongs to the same renter (email OR phone match). */
export function isSameRenter(
  renter: { email?: string | null; phone?: string | null },
  booking: { customer_email?: string | null; customer_phone?: string | null }
): boolean {
  const email = normalizeEmail(renter.email);
  if (email && email === normalizeEmail(booking.customer_email)) {
    return true;
  }

  const phone = normalizePhone(renter.phone);
  return Boolean(phone) && phone === normalizePhone(booking.customer_phone);
}

/** Formats a whole-dollar deposit for display, e.g. 1350 -> "$1,350". */
export function formatDepositAmount(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-CA')}`;
}
