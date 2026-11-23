import {
  NEW_BOOKING_LATEST_END_MINUTES,
  validateBookingTimes,
  validateNewBookingCutoff,
  validateNewBookingTimes,
} from '../booking';
import { DEPOSIT_HOLD_DAYS_AHEAD } from '../damage-deposit';

const base = { selectedDate: '2026-12-05', earlyAccessOption: 'none' as const, lateAccessOption: 'none' as const };

describe('10:00 PM cutoff for new bookings', () => {
  it('is 22:00', () => {
    expect(NEW_BOOKING_LATEST_END_MINUTES).toBe(22 * 60);
  });

  it('allows an hourly booking ending exactly at 10 PM', () => {
    expect(validateNewBookingTimes({ ...base, bookingType: 'hourly', startTime: '19:00', duration: 3 }).valid).toBe(true);
  });

  it('rejects an hourly booking ending after 10 PM', () => {
    const r = validateNewBookingTimes({ ...base, bookingType: 'hourly', startTime: '20:30', duration: 2 });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/10:00 PM/);
  });

  it('allows a plain full-day booking (8 AM - 10 PM)', () => {
    expect(validateNewBookingTimes({ ...base, bookingType: 'fullday', duration: 1 }).valid).toBe(true);
  });

  it('rejects full-day late access (standard and after-midnight)', () => {
    expect(validateNewBookingCutoff({ ...base, bookingType: 'fullday', duration: 1, lateAccessOption: 'standard' }).valid).toBe(false);
    expect(validateNewBookingCutoff({ ...base, bookingType: 'fullday', duration: 1, lateAccessOption: 'after_midnight' }).valid).toBe(false);
  });

  it('leaves the base validator (used by payment-success) permissive for in-flight payments', () => {
    expect(validateBookingTimes({ ...base, bookingType: 'hourly', startTime: '21:00', duration: 3 }).valid).toBe(true);
  });

  it('still reports base errors first', () => {
    expect(validateNewBookingTimes({ ...base, bookingType: 'hourly', startTime: '04:00', duration: 1 }).error).toMatch(/5:00 AM/);
  });
});

describe('damage deposit hold timing', () => {
  it('places holds 3 days ahead so a ~5-day hold outlives the event by a full day', () => {
    expect(DEPOSIT_HOLD_DAYS_AHEAD).toBe(3);
    const holdLifetimeDays = 5; // shortest common off-session authorization window (Visa MIT)
    expect(holdLifetimeDays - DEPOSIT_HOLD_DAYS_AHEAD).toBeGreaterThanOrEqual(2); // event day + 1 full day
  });
});
