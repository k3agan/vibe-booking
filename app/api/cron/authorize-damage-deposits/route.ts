import { NextRequest, NextResponse } from 'next/server';
import { fromZonedTime } from 'date-fns-tz';
import { getBookingsNeedingDamageDepositAuth } from '@/lib/database';
import { alertUnexpectedDepositError, DepositHoldResult, processDepositHold } from '@/lib/deposit-hold';
import {
  DEPOSIT_HOLD_DAYS_AHEAD,
  isAutoCancelEnabled,
  VANCOUVER_TZ,
  vancouverDateString,
} from '@/lib/damage-deposit';
import { alertDetailsTable, sendAdminAlertEmail } from '@/app/lib/email';

export const dynamic = 'force-dynamic';
// A decline triggers Stripe + Supabase + Google Calendar + Seam + Resend calls; allow headroom.
export const maxDuration = 60;

/**
 * Daily damage-deposit holds (scheduled in vercel.json). Places a manual-capture
 * hold for every confirmed, paid booking from today through today+3 (Vancouver)
 * that doesn't have one yet. Per-booking logic and the decline/system-failure
 * policy live in lib/deposit-hold.ts. Safe to run more than once a day.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (optional security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const today = vancouverDateString(now);
    const ctx = {
      today,
      startOfTodayIso: fromZonedTime(`${today} 00:00:00`, VANCOUVER_TZ).toISOString(),
    };
    console.log(`🔒 Damage deposit cron: ${today} → ${vancouverDateString(now, DEPOSIT_HOLD_DAYS_AHEAD)} (auto-cancel ${isAutoCancelEnabled() ? 'ON' : 'OFF'})`);

    let bookings;
    try {
      bookings = await getBookingsNeedingDamageDepositAuth(DEPOSIT_HOLD_DAYS_AHEAD);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await sendAdminAlertEmail({
        subject: '🚨 Damage-deposit cron could not load bookings',
        html:
          `<h2>Damage-deposit cron failed</h2><p>No holds were attempted today. Nothing was cancelled.</p>` +
          alertDetailsTable([['Date', today], ['Error', message]]),
        idempotencyKey: `deposit-cron-load-error:${today}`,
      });
      throw error;
    }
    console.log(`Found ${bookings.length} booking(s) needing a damage deposit hold`);

    const results: DepositHoldResult[] = [];
    for (const booking of bookings) {
      try {
        results.push(await processDepositHold(booking, ctx));
      } catch (error) {
        // Unexpected (e.g. DB unreachable mid-run): never cancel; alert and retry next run.
        console.error(`❌ Unexpected error processing ${booking.booking_ref}:`, error);
        await alertUnexpectedDepositError(booking, ctx, error);
        results.push({
          booking_ref: booking.booking_ref,
          selected_date: booking.selected_date,
          outcome: 'system_failure',
          code: 'unexpected_error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const counts = results.reduce<Record<string, number>>((acc, r) => {
      acc[r.outcome] = (acc[r.outcome] ?? 0) + 1;
      return acc;
    }, {});
    console.log('✅ Damage deposit cron complete:', counts);

    return NextResponse.json({
      success: true,
      date: today,
      autoCancelOnDecline: isAutoCancelEnabled(),
      message: `Processed ${bookings.length} bookings`,
      counts,
      results,
    });
  } catch (error) {
    console.error('❌ Error in damage deposit authorization cron:', error);
    return NextResponse.json(
      {
        error: 'Failed to process damage deposit authorizations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
