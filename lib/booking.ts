import { fromZonedTime } from 'date-fns-tz';

export type EarlyAccessOption = 'none' | 'standard' | 'extra';
export type LateAccessOption = 'none' | 'standard' | 'after_midnight';

export interface BookingTimeInput {
  selectedDate: string | Date;
  startTime?: string;
  bookingType: 'hourly' | 'fullday';
  duration: number;
  earlyAccessOption?: EarlyAccessOption;
  lateAccessOption?: LateAccessOption;
}

export interface BookingDataInput extends BookingTimeInput {
  name: string;
  email: string;
  phone: string;
  organization?: string;
  eventType: string;
  guestCount: string | number;
  specialRequirements?: string;
}

export interface SurchargeItem {
  id: 'extra_early' | 'standard_early' | 'standard_late' | 'after_midnight';
  label: string;
  hours: number;
  percent: number;
  amount: number;
}

export interface BookingPricingResult {
  basePrice: number;
  baseRate: number;
  surchargeTotal: number;
  totalPrice: number;
  items: SurchargeItem[];
}

const VANCOUVER_TIMEZONE = 'America/Vancouver';
const STANDARD_DAY_START_MINUTES = 8 * 60;
const STANDARD_DAY_END_MINUTES = 22 * 60;
const STANDARD_DAY_HOURS = (STANDARD_DAY_END_MINUTES - STANDARD_DAY_START_MINUTES) / 60;
const MIN_START_MINUTES = 5 * 60;
const MAX_END_MINUTES = 26 * 60; // 02:00 next day

const SURCHARGE_PERCENTAGES = {
  extraEarly: 0.4,
  standardEarly: 0.15,
  standardLate: 0.25,
  afterMidnight: 0.6,
};

const SURCHARGE_WINDOWS = [
  {
    id: 'extra_early' as const,
    label: 'Extra Early (5:00 AM - 6:00 AM)',
    start: 5 * 60,
    end: 6 * 60,
    percent: SURCHARGE_PERCENTAGES.extraEarly,
  },
  {
    id: 'standard_early' as const,
    label: 'Standard Early (6:00 AM - 8:00 AM)',
    start: 6 * 60,
    end: 8 * 60,
    percent: SURCHARGE_PERCENTAGES.standardEarly,
  },
  {
    id: 'standard_late' as const,
    label: 'Standard Late (10:00 PM - 12:00 AM)',
    start: 22 * 60,
    end: 24 * 60,
    percent: SURCHARGE_PERCENTAGES.standardLate,
  },
  {
    id: 'after_midnight' as const,
    label: 'After Midnight (12:00 AM - 2:00 AM)',
    start: 24 * 60,
    end: 26 * 60,
    percent: SURCHARGE_PERCENTAGES.afterMidnight,
  },
];

const roundCurrency = (value: number) => Number(value.toFixed(2));

const parseTimeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const formatMinutesToTime = (minutes: number) => {
  const normalizedMinutes = ((minutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hours = Math.floor(normalizedMinutes / 60);
  const mins = normalizedMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const addDaysToDateString = (dateOnly: string, days: number) => {
  const baseDate = new Date(`${dateOnly}T00:00:00Z`);
  baseDate.setUTCDate(baseDate.getUTCDate() + days);
  return baseDate.toISOString().split('T')[0];
};

const getSelectedDateString = (selectedDate: string | Date) =>
  typeof selectedDate === 'string' ? selectedDate : selectedDate.toISOString();

export function getBookingWindowMinutes(bookingData: BookingTimeInput) {
  if (bookingData.bookingType === 'hourly') {
    const startMinutes = parseTimeToMinutes(bookingData.startTime || '00:00');
    const endMinutes = startMinutes + bookingData.duration * 60;
    return {
      startMinutes,
      endMinutes,
      endDayOffset: endMinutes >= 24 * 60 ? 1 : 0,
    };
  }

  const earlyOption = bookingData.earlyAccessOption ?? 'none';
  const lateOption = bookingData.lateAccessOption ?? 'none';

  const startMinutes =
    earlyOption === 'extra'
      ? 5 * 60
      : earlyOption === 'standard'
        ? 6 * 60
        : STANDARD_DAY_START_MINUTES;

  const endMinutes =
    lateOption === 'after_midnight'
      ? 26 * 60
      : lateOption === 'standard'
        ? 24 * 60
        : STANDARD_DAY_END_MINUTES;

  return {
    startMinutes,
    endMinutes,
    endDayOffset: endMinutes >= 24 * 60 ? 1 : 0,
  };
}

export function getBookingWindowTimeStrings(bookingData: BookingTimeInput) {
  const { startMinutes, endMinutes, endDayOffset } = getBookingWindowMinutes(bookingData);
  return {
    startTime: formatMinutesToTime(startMinutes),
    endTime: formatMinutesToTime(endMinutes),
    endDayOffset,
  };
}

export function validateBookingTimes(bookingData: BookingTimeInput) {
  if (bookingData.bookingType === 'hourly') {
    if (!bookingData.startTime) {
      return { valid: false, error: 'Start time is required for hourly bookings.' };
    }

    if (bookingData.duration < 1 || bookingData.duration > 7) {
      return { valid: false, error: 'Hourly bookings must be between 1 and 7 hours.' };
    }

    const { startMinutes, endMinutes } = getBookingWindowMinutes(bookingData);
    if (startMinutes < MIN_START_MINUTES) {
      return { valid: false, error: 'Hourly bookings cannot start before 5:00 AM.' };
    }

    if (endMinutes > MAX_END_MINUTES) {
      return { valid: false, error: 'Hourly bookings cannot end after 2:00 AM.' };
    }
  }

  return { valid: true };
}

const calculateOverlapHours = (startMinutes: number, endMinutes: number, windowStart: number, windowEnd: number) => {
  const overlapMinutes = Math.max(0, Math.min(endMinutes, windowEnd) - Math.max(startMinutes, windowStart));
  return overlapMinutes / 60;
};

const calculateSurchargeItems = (
  startMinutes: number,
  endMinutes: number,
  baseHourlyRate: number,
  includeBaseRate: boolean
): SurchargeItem[] =>
  SURCHARGE_WINDOWS.flatMap((window) => {
    const hours = calculateOverlapHours(startMinutes, endMinutes, window.start, window.end);
    if (hours <= 0) {
      return [];
    }

    // Full-day add-ons should charge the average hourly rate plus the surcharge premium.
    const rateMultiplier = includeBaseRate ? 1 + window.percent : window.percent;
    const amount = roundCurrency(baseHourlyRate * hours * rateMultiplier);
    return [
      {
        id: window.id,
        label: window.label,
        hours,
        percent: rateMultiplier,
        amount,
      },
    ];
  });

export function calculateBookingPriceWithSurcharges(bookingData: BookingTimeInput): BookingPricingResult {
  const selectedDate = getSelectedDateString(bookingData.selectedDate);
  const isWeekend = [5, 6, 0].includes(new Date(selectedDate).getDay()); // Fri, Sat, Sun
  const hourlyRate = isWeekend ? 100 : 50;
  const fullDayRate = isWeekend ? 900 : 750;

  const basePrice =
    bookingData.bookingType === 'fullday'
      ? fullDayRate
      : hourlyRate * bookingData.duration;

  const baseRate =
    bookingData.bookingType === 'fullday'
      ? fullDayRate / STANDARD_DAY_HOURS
      : hourlyRate;

  const { startMinutes, endMinutes } = getBookingWindowMinutes(bookingData);
  const items = calculateSurchargeItems(
    startMinutes,
    endMinutes,
    baseRate,
    bookingData.bookingType === 'fullday'
  );
  const surchargeTotal = roundCurrency(items.reduce((sum, item) => sum + item.amount, 0));
  const totalPrice = roundCurrency(basePrice + surchargeTotal);

  return {
    basePrice: roundCurrency(basePrice),
    baseRate: roundCurrency(baseRate),
    surchargeTotal,
    totalPrice,
    items,
  };
}

export function calculateBookingPrice(bookingData: BookingTimeInput): number {
  return calculateBookingPriceWithSurcharges(bookingData).totalPrice;
}

export function calculateEventTimes(bookingData: BookingTimeInput) {
  const selectedDate = getSelectedDateString(bookingData.selectedDate);
  const dateOnly = selectedDate.split('T')[0];
  const { startTime, endTime, endDayOffset } = getBookingWindowTimeStrings(bookingData);

  const startTimeStr = `${dateOnly} ${startTime}:00`;
  const startDateTime = fromZonedTime(startTimeStr, VANCOUVER_TIMEZONE);

  const endDateOnly = endDayOffset > 0 ? addDaysToDateString(dateOnly, endDayOffset) : dateOnly;
  const endTimeStr = `${endDateOnly} ${endTime}:00`;
  const endDateTime = fromZonedTime(endTimeStr, VANCOUVER_TIMEZONE);

  return { dateOnly, startDateTime, endDateTime, startTime, endTime, endDayOffset };
}

