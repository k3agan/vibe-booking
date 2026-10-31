/**
 * isReturningRenter() against a fake Supabase query builder (no network).
 */
type MockRow = { customer_email: string | null; customer_phone: string | null };
type MockQuery = { filters: Array<[string, ...unknown[]]> };

const mockQueries: MockQuery[] = [];
let mockRowsFor: (query: MockQuery) => { data: MockRow[] | null; error: { message: string } | null } = () => ({
  data: [],
  error: null,
});

jest.mock('../supabase', () => {
  const makeBuilder = () => {
    const query: MockQuery = { filters: [] };
    mockQueries.push(query);
    const builder: Record<string, unknown> = {};
    for (const method of ['from', 'select', 'eq', 'in', 'lt', 'limit', 'ilike']) {
      builder[method] = (...args: unknown[]) => {
        query.filters.push([method, ...args]);
        return builder;
      };
    }
    builder.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(mockRowsFor(query)).then(resolve, reject);
    return builder;
  };
  return { supabase: { from: (table: string) => (makeBuilder() as { from: (t: string) => unknown }).from(table) } };
});

import { getDamageDepositForBooking, isReturningRenter } from '../deposit-tiers-server';

const ilikeOf = (query: MockQuery) => query.filters.find(([method]) => method === 'ilike');

// 2026-11-01T06:00Z is still Oct 31 (23:00) in Vancouver.
const NOW = new Date('2026-11-01T06:00:00Z');

beforeEach(() => {
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  mockQueries.length = 0;
  mockRowsFor = () => ({ data: [], error: null });
});

describe('isReturningRenter', () => {
  it('only considers past, non-cancelled bookings (Vancouver "today")', async () => {
    await isReturningRenter('jane@example.com', '604-555-1234', NOW);
    expect(mockQueries).toHaveLength(2);
    for (const query of mockQueries) {
      expect(query.filters).toContainEqual(['from', 'bookings']);
      expect(query.filters).toContainEqual(['in', 'status', ['confirmed', 'completed']]);
      expect(query.filters).toContainEqual(['lt', 'selected_date', '2026-10-31']);
    }
    expect(ilikeOf(mockQueries[0])).toEqual(['ilike', 'customer_email', '%jane@example.com%']);
    expect(ilikeOf(mockQueries[1])).toEqual(['ilike', 'customer_phone', '%6%0%4%5%5%5%1%2%3%4%']);
  });

  it('matches email case-insensitively and ignoring whitespace', async () => {
    mockRowsFor = (query) =>
      ilikeOf(query)?.[1] === 'customer_email'
        ? { data: [{ customer_email: ' Jane@Example.COM ', customer_phone: null }], error: null }
        : { data: [], error: null };
    await expect(isReturningRenter('  JANE@example.com', '', NOW)).resolves.toBe(true);
  });

  it('matches phone by digits (last 10), regardless of formatting', async () => {
    mockRowsFor = (query) =>
      ilikeOf(query)?.[1] === 'customer_phone'
        ? { data: [{ customer_email: 'other@example.com', customer_phone: '+1 (604) 555-1234' }], error: null }
        : { data: [], error: null };
    await expect(isReturningRenter('new@example.com', '604.555.1234', NOW)).resolves.toBe(true);
  });

  it('rejects loose ILIKE candidates that are not exact matches', async () => {
    mockRowsFor = () => ({
      data: [
        { customer_email: 'xjane@example.com', customer_phone: '604-555-12345' },
        { customer_email: 'jane@example.com.au', customer_phone: '16045551239' },
      ],
      error: null,
    });
    await expect(isReturningRenter('jane@example.com', '604-555-1234', NOW)).resolves.toBe(false);
  });

  it('treats lookup errors as a new renter', async () => {
    mockRowsFor = () => ({ data: null, error: { message: 'boom' } });
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(isReturningRenter('jane@example.com', '604-555-1234', NOW)).resolves.toBe(false);
    spy.mockRestore();
  });

  it('never throws, even if the client rejects', async () => {
    mockRowsFor = () => {
      throw new Error('network down');
    };
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(isReturningRenter('jane@example.com', '604-555-1234', NOW)).resolves.toBe(false);
    spy.mockRestore();
  });

  it('does not query when there is no usable email or phone', async () => {
    await expect(isReturningRenter('  ', '12', NOW)).resolves.toBe(false);
    expect(mockQueries).toHaveLength(0);
  });
});

describe('getDamageDepositForBooking', () => {
  const saturdayBooking = {
    calculatedPrice: 900,
    selectedDate: '2026-11-07',
    startTime: '08:00',
    endTime: '22:00',
    email: 'jane@example.com',
    phone: '',
  };

  it('uses 100% for a returning renter on a higher-risk slot', async () => {
    mockRowsFor = () => ({ data: [{ customer_email: 'jane@example.com', customer_phone: null }], error: null });
    await expect(getDamageDepositForBooking(saturdayBooking)).resolves.toBe(900);
  });

  it('uses 150% for a new renter on a higher-risk slot', async () => {
    await expect(getDamageDepositForBooking(saturdayBooking)).resolves.toBe(1350);
  });
});
