import {
  computeDamageDeposit,
  formatDepositAmount,
  isHigherRiskSlot,
  isSameRenter,
  normalizePhone,
} from '../deposit-tiers';
import { calculateBookingPriceWithSurcharges, calculateEventTimes, type BookingTimeInput } from '../booking';

// Calendar reference (2026): Mon Nov 2, Tue Nov 3, Wed Nov 4, Thu Nov 5, Fri Nov 6, Sat Nov 7, Sun Nov 8.
const MON = '2026-11-02';
const TUE = '2026-11-03';
const WED = '2026-11-04';
const THU = '2026-11-05';
const FRI = '2026-11-06';
const SAT = '2026-11-07';
const SUN = '2026-11-08';

const deposit = (
  selectedDate: string,
  startTime: string,
  endTime: string,
  calculatedPrice: number,
  isReturning = false
) => computeDamageDeposit({ selectedDate, startTime, endTime, calculatedPrice, isReturning });

describe('computeDamageDeposit', () => {
  describe('weekday daytime (Mon–Thu, ending by 18:00): 50%', () => {
    it('charges 50% of the rental price for a Monday morning booking', () => {
      expect(deposit(MON, '10:00', '14:00', 200)).toBe(100);
    });

    it('is the same for new and returning renters, with no $500 minimum', () => {
      expect(deposit(WED, '09:00', '12:00', 150, false)).toBe(75);
      expect(deposit(WED, '09:00', '12:00', 150, true)).toBe(75);
    });

    it('treats an end time of exactly 18:00 as daytime', () => {
      expect(deposit(THU, '11:00', '18:00', 350)).toBe(175);
      expect(isHigherRiskSlot({ selectedDate: THU, startTime: '11:00', endTime: '18:00' })).toBe(false);
    });
  });

  describe('weekday ending after 18:00: higher-risk tier', () => {
    it('Tuesday ending 19:00 -> 150% for a new renter', () => {
      expect(deposit(TUE, '12:00', '19:00', 700, false)).toBe(1050);
    });

    it('Tuesday ending 19:00 -> 100% for a returning renter', () => {
      expect(deposit(TUE, '12:00', '19:00', 700, true)).toBe(700);
    });

    it('ending 18:30 is already after 18:00', () => {
      expect(isHigherRiskSlot({ selectedDate: MON, startTime: '14:30', endTime: '18:30' })).toBe(true);
    });

    it('a standard weekday full day (08:00–22:00) is higher-risk', () => {
      expect(deposit(WED, '08:00', '22:00', 750, false)).toBe(1125);
      expect(deposit(WED, '08:00', '22:00', 750, true)).toBe(750);
    });
  });

  describe('Friday, Saturday, Sunday: higher-risk tier at any time of day', () => {
    it('Saturday daytime full day -> 150% new / 100% returning', () => {
      expect(deposit(SAT, '08:00', '16:00', 900, false)).toBe(1350);
      expect(deposit(SAT, '08:00', '16:00', 900, true)).toBe(900);
    });

    it('Friday and Sunday mornings are higher-risk too', () => {
      expect(isHigherRiskSlot({ selectedDate: FRI, startTime: '09:00', endTime: '11:00' })).toBe(true);
      expect(isHigherRiskSlot({ selectedDate: SUN, startTime: '09:00', endTime: '11:00' })).toBe(true);
    });

    it('Monday–Thursday mornings are not', () => {
      for (const date of [MON, TUE, WED, THU]) {
        expect(isHigherRiskSlot({ selectedDate: date, startTime: '09:00', endTime: '11:00' })).toBe(false);
      }
    });
  });

  describe('end times past midnight count as after 18:00', () => {
    it('Wednesday 20:00 -> 01:00 is higher-risk', () => {
      expect(deposit(WED, '20:00', '01:00', 1000, false)).toBe(1500);
      expect(deposit(WED, '20:00', '01:00', 1000, true)).toBe(1000);
    });

    it('ending exactly at midnight (00:00) or at 02:00 is higher-risk', () => {
      expect(isHigherRiskSlot({ selectedDate: MON, startTime: '22:00', endTime: '00:00' })).toBe(true);
      expect(isHigherRiskSlot({ selectedDate: MON, startTime: '08:00', endTime: '02:00' })).toBe(true);
    });

    it('uses the real end time produced by lib/booking for a weekday full day with after-midnight access', () => {
      const booking: BookingTimeInput = {
        selectedDate: TUE,
        bookingType: 'fullday',
        duration: 0,
        lateAccessOption: 'after_midnight',
      };
      const { dateOnly, startTime, endTime } = calculateEventTimes(booking);
      const { totalPrice } = calculateBookingPriceWithSurcharges(booking);
      expect(endTime).toBe('02:00');
      expect(deposit(dateOnly, startTime, endTime, totalPrice, false)).toBe(Math.round(totalPrice * 1.5));
    });

    it('uses the real end time produced by lib/booking for a weekday daytime hourly booking', () => {
      const booking: BookingTimeInput = { selectedDate: THU, bookingType: 'hourly', startTime: '10:00', duration: 4 };
      const { dateOnly, startTime, endTime } = calculateEventTimes(booking);
      const { totalPrice } = calculateBookingPriceWithSurcharges(booking);
      expect(totalPrice).toBe(200);
      expect(deposit(dateOnly, startTime, endTime, totalPrice, false)).toBe(100);
    });
  });

  describe('$500 minimum on the higher-risk tier', () => {
    it('a $150 Saturday booking -> $500 for new and returning renters', () => {
      expect(deposit(SAT, '10:00', '11:30', 150, false)).toBe(500);
      expect(deposit(SAT, '10:00', '11:30', 150, true)).toBe(500);
    });

    it('applies when 150% is still under $500', () => {
      expect(deposit(FRI, '10:00', '13:00', 300, false)).toBe(500); // 450 -> 500
    });

    it('applies to returning renters when 100% is under $500', () => {
      expect(deposit(SAT, '10:00', '14:00', 400, true)).toBe(500);
      expect(deposit(SAT, '10:00', '14:00', 400, false)).toBe(600);
    });
  });

  describe('rounding to whole dollars', () => {
    it('rounds 50% half-dollars up', () => {
      expect(deposit(MON, '10:00', '13:30', 175)).toBe(88); // 87.50
      expect(deposit(MON, '10:00', '13:30', 87)).toBe(44); // 43.50
    });

    it('rounds cents on the standard tier', () => {
      expect(deposit(MON, '10:00', '13:30', 175.5)).toBe(88); // 87.75
      expect(deposit(MON, '10:00', '13:30', 175.2)).toBe(88); // 87.60
      expect(deposit(MON, '10:00', '13:30', 174.8)).toBe(87); // 87.40
    });

    it('rounds cents on the higher-risk tier', () => {
      expect(deposit(SAT, '10:00', '20:00', 701, false)).toBe(1052); // 1051.50
      expect(deposit(SAT, '10:00', '20:00', 433.33, false)).toBe(650); // 649.995
      expect(deposit(SAT, '10:00', '20:00', 612.4, true)).toBe(612);
    });

    it('always returns an integer', () => {
      for (const price of [0.01, 33.33, 99.99, 123.45, 777.77, 1234.56]) {
        for (const isReturning of [false, true]) {
          expect(Number.isInteger(deposit(MON, '09:00', '12:00', price, isReturning))).toBe(true);
          expect(Number.isInteger(deposit(SAT, '09:00', '12:00', price, isReturning))).toBe(true);
        }
      }
    });
  });

  describe('input handling', () => {
    it('accepts an ISO timestamp and uses only its date part', () => {
      expect(isHigherRiskSlot({ selectedDate: `${SAT}T07:00:00.000Z`, startTime: '09:00', endTime: '11:00' })).toBe(true);
      expect(isHigherRiskSlot({ selectedDate: `${MON}T07:00:00.000Z`, startTime: '09:00', endTime: '11:00' })).toBe(false);
    });

    it('treats unparseable dates or times as higher-risk instead of throwing', () => {
      expect(deposit('not-a-date', '09:00', '11:00', 200)).toBe(500);
      expect(deposit(MON, '', '11:00', 1000)).toBe(1500);
    });

    it('treats a non-positive or invalid price as $0 (minimum still applies on the higher-risk tier)', () => {
      expect(deposit(MON, '09:00', '11:00', 0)).toBe(0);
      expect(deposit(MON, '09:00', '11:00', Number.NaN)).toBe(0);
      expect(deposit(SAT, '09:00', '11:00', -50)).toBe(500);
    });
  });
});

describe('renter matching helpers', () => {
  it('normalizes phones to the last 10 digits', () => {
    expect(normalizePhone('+1 (604) 555-1234')).toBe('6045551234');
    expect(normalizePhone('604.555.1234')).toBe('6045551234');
    expect(normalizePhone('12')).toBe('');
    expect(normalizePhone(undefined)).toBe('');
  });

  it('matches on email (case-insensitive, trimmed) or phone digits', () => {
    const booking = { customer_email: ' Jane.Doe@Example.com ', customer_phone: '(604) 555-1234' };
    expect(isSameRenter({ email: 'jane.doe@example.com', phone: '' }, booking)).toBe(true);
    expect(isSameRenter({ email: 'someone@else.com', phone: '1-604-555-1234' }, booking)).toBe(true);
    expect(isSameRenter({ email: 'someone@else.com', phone: '604-555-9999' }, booking)).toBe(false);
    expect(isSameRenter({ email: '', phone: '' }, { customer_email: '', customer_phone: '' })).toBe(false);
  });
});

describe('formatDepositAmount', () => {
  it('formats whole dollars with thousands separators', () => {
    expect(formatDepositAmount(500)).toBe('$500');
    expect(formatDepositAmount(1350)).toBe('$1,350');
  });
});
