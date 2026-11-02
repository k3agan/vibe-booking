import { NextRequest, NextResponse } from 'next/server';
import { getBookingsMissingDepositHold } from '@/lib/database';
import { DEPOSIT_WATCHDOG_DAYS_AHEAD, VANCOUVER_TZ, vancouverDateString } from '@/lib/damage-deposit';
import { alertDetailsTable, escapeHtml, sendAdminAlertEmail } from '@/app/lib/email';

export const dynamic = 'force-dynamic';
// A decline triggers Stripe + Supabase + Google Calendar + Seam + Resend calls; allow headroom.
export const maxDuration = 60;

/**
 * Deposit watchdog (scheduled in vercel.json a few hours after
 * /api/cron/authorize-damage-deposits). Emails the admins every confirmed,
 * non-comped booking from today through today+2 whose damage deposit is not
 * 'authorized' — this catches the deposit cron not running at all. Sends
 * nothing when the list is empty; at most one email per day.
 */
export async function GET(request: NextRequest) {
  // Fail closed: this route must only run from the scheduler.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const today = vancouverDateString(now);
  const until = vancouverDateString(now, DEPOSIT_WATCHDOG_DAYS_AHEAD);

  let bookings;
  try {
    bookings = await getBookingsMissingDepositHold(DEPOSIT_WATCHDOG_DAYS_AHEAD);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Deposit watchdog query failed:', error);
    await sendAdminAlertEmail({
      subject: '🚨 Deposit watchdog could not check bookings',
      html:
        `<h2>Deposit watchdog failed</h2><p>Could not check whether upcoming bookings have a damage-deposit hold. Check the admin portal manually.</p>` +
        alertDetailsTable([['Date', today], ['Error', message]]),
      idempotencyKey: `deposit-watchdog-error:${today}`,
    });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }

  if (bookings.length === 0) {
    console.log(`✅ Deposit watchdog: every booking ${today}..${until} has a hold`);
    return NextResponse.json({ success: true, date: today, count: 0, emailed: false });
  }

  const fmtTime = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString('en-CA', { timeZone: VANCOUVER_TZ, dateStyle: 'medium', timeStyle: 'short' }) : 'never';
  const cell = (v: unknown) => `<td style="padding:6px 10px;border:1px solid #ddd;vertical-align:top;">${escapeHtml(v)}</td>`;
  const header = ['Ref', 'Event date', 'Customer', 'Deposit', 'Hold status', 'Card on file', 'Last attempt', 'Last error']
    .map((h) => `<th style="padding:6px 10px;border:1px solid #ddd;background:#f5f5f5;text-align:left;">${h}</th>`)
    .join('');
  const rows = bookings
    .map(
      (b) =>
        '<tr>' +
        cell(b.booking_ref) +
        cell(`${b.selected_date} ${b.start_time ?? ''}`) +
        cell(`${b.customer_name} (${b.customer_email})`) +
        cell(b.damage_deposit_amount != null ? `$${Number(b.damage_deposit_amount).toFixed(2)}` : '—') +
        cell(b.damage_deposit_authorization_status ?? 'pending') +
        cell(b.payment_method_id ? 'yes' : 'NO') +
        cell(fmtTime(b.damage_deposit_last_attempt_at)) +
        cell(b.damage_deposit_last_error ?? '—') +
        '</tr>'
    )
    .join('');

  const sent = await sendAdminAlertEmail({
    subject: `⚠️ ${bookings.length} upcoming booking(s) have no damage-deposit hold (${today} – ${until})`,
    html:
      `<h2>Bookings without a damage-deposit hold</h2>` +
      `<p>Confirmed, non-comped bookings from <strong>${today}</strong> to <strong>${until}</strong> whose deposit is not authorized. ` +
      `If “Last attempt” isn’t today, the deposit cron didn’t reach the booking (did it run?).</p>` +
      `<table style="border-collapse:collapse;font-size:13px;"><tr>${header}</tr>${rows}</table>`,
    idempotencyKey: `deposit-watchdog:${today}`,
  });

  return NextResponse.json({
    success: true,
    date: today,
    count: bookings.length,
    emailed: sent.success,
    error: sent.error,
    bookings: bookings.map((b) => b.booking_ref),
  });
}
