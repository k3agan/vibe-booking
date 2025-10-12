# 🔒 Damage Deposit Authorization System

## Overview

This system implements **damage deposit holds** using Stripe's authorization (pre-authorization) feature. This minimizes Stripe fees by only charging the customer if there's actual damage.

### How It Works

1. **At Booking**: Customer pays full rental amount + payment method is saved
2. **3 Days Before Event**: System automatically creates an authorization (hold) for 50% of rental fee
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

**File**: `app/api/cron/authorize-damage-deposits/route.ts`
- Runs daily
- Finds bookings exactly 3 days away
- Creates Stripe authorization (hold) for damage deposit
- Sends email notification to customer
- Updates database with authorization details

### 3. Email Notification

**File**: `app/lib/email.ts`
- New function: `sendDamageDepositAuthNotification()`
- Explains to customer what the hold means
- Clarifies it's temporary and not a charge
- Sets expectations about automatic expiry

## Cron Job Setup

You need to configure a cron job to run daily at a specific time (e.g., 9 AM).

### Option 1: Cron-job.org (Recommended)

1. Go to https://cron-job.org
2. Create a new cron job:
   - **URL**: `https://your-domain.com/api/cron/authorize-damage-deposits`
   - **Schedule**: Daily at 09:00
   - **Timezone**: America/Vancouver
3. Enable the job

### Option 2: Vercel Cron (If available on your plan)

Create `vercel.json` in project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/authorize-damage-deposits",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### Option 3: GitHub Actions

Create `.github/workflows/cron-damage-deposits.yml`:

```yaml
name: Authorize Damage Deposits
on:
  schedule:
    - cron: '0 9 * * *'  # 9 AM UTC daily
  workflow_dispatch:

jobs:
  authorize:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Cron Endpoint
        run: |
          curl -X GET https://your-domain.com/api/cron/authorize-damage-deposits
```

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

If an authorization fails:
- Customer's card may have insufficient funds
- Card may be expired or invalid
- Email the customer to update their payment method
- Can manually authorize in Stripe dashboard

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
2. Check booking is exactly 3 days away
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

