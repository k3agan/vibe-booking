# 🔒 Damage Deposit Authorization System

## Overview

This system implements **damage deposit holds** using Stripe's authorization (pre-authorization) feature. This minimizes Stripe fees by only charging the customer if there's actual damage.

### How It Works

1. **At Booking**: Customer pays full rental amount + payment method is saved
2. **Up to 3 Days Before Event**: System automatically creates an authorization (hold) for 50% of rental fee (daily catch-up window: today → today+3)
3. **After Event**:
   - **No damage**: Hold automatically expires after 7 days (no charge, no fees)
   - **Damage found**: Manually capture the hold in Stripe dashboard (charge + fees)

### Cost Savings

- **Traditional approach**: Pay Stripe fees on 100% of damage deposits, then refund
- **Authorization approach**: Pay fees only when there's actual damage
- **Typical savings**: ~90% of Stripe fees on damage deposits (assuming 90% of events have no damage)

## Database Changes

### Migration Required

Run this SQL in your Supabase SQL Editor:

```sql
-- See: database/add_damage_deposit_fields.sql
ALTER TABLE bookings 
  ADD COLUMN payment_method_id VARCHAR(255),
  ADD COLUMN damage_deposit_amount DECIMAL(10,2),
  ADD COLUMN damage_deposit_authorization_id VARCHAR(255),
  ADD COLUMN damage_deposit_authorization_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN damage_deposit_authorized_at TIMESTAMP WITH TIME ZONE;
```

### New Fields

| Field | Purpose |
|-------|---------|
| `payment_method_id` | Stripe payment method ID for future charges |
| `damage_deposit_amount` | Always 50% of rental fee |
| `damage_deposit_authorization_id` | Stripe payment intent ID for the hold |
| `damage_deposit_authorization_status` | Current status: pending → authorized → captured/released/expired |
| `damage_deposit_authorized_at` | Timestamp when hold was placed |

## Implementation Details

### 1. Payment Flow Changes

**File**: `app/api/create-payment-intent/route.ts`
- Added `setup_future_usage: 'off_session'` to save payment method

**File**: `app/api/payment-success/route.ts`
- Retrieves payment method ID from Stripe
- Calculates damage deposit (50% of rental)
- Saves both to database

### 2. Cron Job

**Files**: `app/api/cron/authorize-damage-deposits/route.ts` → `lib/deposit-hold.ts`
- Runs daily (vercel.json, 16:00 UTC = 09:00 Vancouver — B.C. is on permanent UTC-7 from 2026-11-01)
- Finds confirmed, paid, non-comped bookings from **today through today+3** (Vancouver) whose hold is still pending — a missed run or a short-lead booking is caught on the next run
- Places the hold on the **Stripe account that owns the card** (`bookings.stripe_account`, else the ID signature — `lib/stripe-account-id.ts`), not whichever rotated key is active; if that fails for a non-card reason (e.g. `resource_missing`) it tries the **other** account. A `card_error` on either account is a decline; only "both accounts failed for system reasons" is a system failure. The account the hold landed on is recorded (`damage_deposit_stripe_account`, PI metadata)
- Idempotent: claims each booking once per Vancouver day (`damage_deposit_last_attempt_at`), Stripe Idempotency-Key per booking per day, Resend idempotency keys on every email
- Records the outcome in `damage_deposit_last_error` (NULL = authorized)

**Failure policy (decision 2026-10-31-01)**

| Failure | Example | What happens |
|---|---|---|
| **Renter decline** — Stripe `card_error` | `insufficient_funds`, `card_declined`, `expired_card`, `authentication_required` | Failed PaymentIntent cancelled; booking cancelled with **no refund**; calendar event deleted; **all Seam door codes revoked**; renter gets the cancellation email; admins alerted |
| **System failure** — anything else | wrong/unknown Stripe account (`resource_missing`), API/network error, no card on file, transient issuer codes (`processing_error`, `try_again_later`, `issuer_not_available`, `reenter_transaction`) | Booking **untouched**, stays pending, retried on the next daily run; admins alerted |

Kill switch: set `DEPOSIT_DECLINE_AUTOCANCEL=false` → declines alert admins only; nothing is cancelled.

Admin alerts go to kathy@caphillhall.ca, k3agan@gmail.com, info@caphillhall.ca (`ADMIN_ALERT_RECIPIENTS` in `app/lib/email.ts`).

**Watchdog**: `app/api/cron/deposit-watchdog/route.ts` (vercel.json, 20:00 UTC = 13:00 Vancouver) emails the admins every confirmed, non-comped booking from today through today+2 whose deposit is not `authorized` — catches the deposit cron not running at all. Sends nothing when the list is empty. Requires `CRON_SECRET`.

**Migrations** (safe before or after deploy, either order): `database/add_damage_deposit_attempt_tracking.sql` (three nullable telemetry columns) and `supabase/migrations/20261031_bookings_stripe_account.sql` (`stripe_account`, a STORED GENERATED column from `payment_intent_id` — the app never writes it and never filters on it).

### 3. Email Notification

**File**: `app/lib/email.ts`
- New function: `sendDamageDepositAuthNotification()`
- Explains to customer what the hold means
- Clarifies it's temporary and not a charge
- Sets expectations about automatic expiry

## Cron Job Setup

Both crons are scheduled in `vercel.json` (Vercel sends `Authorization: Bearer $CRON_SECRET`). Do **not** also trigger them from an external scheduler (e.g. cron-job.org) — it's harmless (both routes are idempotent) but redundant.

Manual run (same auth header):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron/authorize-damage-deposits
curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron/deposit-watchdog
```

A booking is attempted at most once per Vancouver day; to force a same-day retry, clear its `damage_deposit_last_attempt_at`.

## Managing Damage Deposits

### In Stripe Dashboard

1. **View Authorizations**:
   - Go to Stripe Dashboard → Payments
   - Filter by "Uncaptured"
   - Look for payments with `type: damage_deposit` in metadata

2. **After Event - No Damage**:
   - Do nothing! Authorization expires automatically after 7 days
   - Or manually cancel the authorization for better UX

3. **After Event - Damage Found**:
   - Find the authorization in Stripe
   - Click "Capture payment"
   - Enter amount to capture (can be less than authorized amount)
   - Customer gets charged, you pay Stripe fee only then

### Partial Captures

You can capture less than the authorized amount:
- Authorized: $500
- Actual damage: $150
- Capture: $150
- Remaining $350 is automatically released

## Timeline Example

**Booking Date**: January 1
**Event Date**: February 15

| Date | Action |
|------|--------|
| Jan 1 | Customer pays $1,000 rental (full amount). Payment method saved. Damage deposit amount: $500 (calculated but not charged) |
| Feb 12 (3 days before) | Cron job runs → $500 authorization created → Customer sees $500 "pending" on card → Email sent |
| Feb 15 | Event happens |
| Feb 16-19 | You inspect hall for damage |
| **Scenario A: No Damage** | Feb 19: Authorization expires automatically → Customer never charged → You pay $0 in fees |
| **Scenario B: Damage** | Feb 16: You capture $500 (or partial) in Stripe → Customer charged → You pay 2.9% + $0.30 fee |

## Testing

### Test in Development

1. **Create a test booking** 3 days in the future
2. **Manually trigger cron**:
   ```bash
   curl http://localhost:3000/api/cron/authorize-damage-deposits
   ```
3. **Check logs** for authorization creation
4. **Check Stripe test dashboard** for the authorization
5. **Check customer email** for notification

### Test Authorization

Use Stripe test cards:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002

## Monitoring

### Check Cron Job Health

Monitor your cron job execution:
- Check cron-job.org execution history
- Monitor Stripe webhook events
- Review application logs

### Failed Authorizations

Every failure emails the admins (see the failure policy above) and is recorded in `bookings.damage_deposit_last_error`. A declined card cancels the booking automatically; a system failure leaves it pending for the next run.

## Important Notes

### Authorization Limits

- **Duration**: 7 days maximum
- **Amount**: Can't exceed original authorization
- **One-time**: Can't re-authorize after expiry

### Stripe Fees

- **Authorization**: $0
- **Capture**: 2.9% + $0.30 (only when charging)
- **Expiry/Cancel**: $0

### Customer Experience

- Sees "pending" charge 3 days before event
- Charge disappears if no damage (automatic)
- Only charged if damage occurs
- Better than paying deposit upfront and waiting for refund

## Troubleshooting

### Authorization Not Created

1. Check booking has `payment_method_id` saved
2. Check the event is within today → today+3 (Vancouver) and `damage_deposit_last_error`
3. Check booking status is 'confirmed'
4. Check cron job is running
5. Review application logs

### Email Not Sent

1. Check RESEND_API_KEY is set
2. Review email logs in database
3. Check Resend dashboard for delivery status

### Can't Capture in Stripe

1. Check authorization hasn't expired (>7 days old)
2. Check authorization status is 'requires_capture'
3. Check you're capturing ≤ authorized amount

## Files Changed

- `database/add_damage_deposit_fields.sql` - Database migration
- `lib/supabase.ts` - Updated Booking type
- `lib/database.ts` - New damage deposit functions
- `app/api/create-payment-intent/route.ts` - Save payment method
- `app/api/payment-success/route.ts` - Store payment method and deposit amount
- `app/api/cron/authorize-damage-deposits/route.ts` - New cron job
- `app/lib/email.ts` - New email template

## Next Steps

1. ✅ Run database migration
2. ✅ Set up cron job (choose option above)
3. ✅ Test with a booking 3 days in future
4. ✅ Verify email notification works
5. ✅ Test capturing in Stripe dashboard
6. ✅ Update documentation for staff

## Questions?

- **Authorization vs. Charge**: Authorization reserves funds but doesn't charge. Charge (capture) actually bills the customer.
- **Why 3 days?**: Gives you 4 days after event to inspect (within 7-day authorization window).
- **Can I change the percentage?**: Yes, modify the calculation in `payment-success/route.ts` line 176.
- **Can I disable this?**: Yes, just don't set up the cron job. Existing flow still works.

---

**Last Updated**: Implementation completed
**System Status**: Ready for deployment after database migration and cron setup

