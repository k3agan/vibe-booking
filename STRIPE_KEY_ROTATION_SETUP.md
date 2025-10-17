# Stripe API Key Rotation Setup

This guide explains how to set up automatic rotation of your Stripe API keys on Vercel.

## Overview

The system automatically rotates between two Stripe API keys based on a schedule you define. This allows you to:
- Distribute load across multiple Stripe accounts
- Test with different API keys periodically
- Implement security best practices for key rotation

## Setup Instructions

### 1. Create Secondary Stripe Account (Optional)

If you want to use a completely different Stripe account:
1. Create a new Stripe account
2. Generate new API keys from the new account
3. Keep both accounts active

Alternatively, you can use the same Stripe account but generate a new API key for rotation purposes.

### 2. Configure Environment Variables in Vercel

Go to your Vercel dashboard → Project Settings → Environment Variables and add:

```
# Primary Stripe Account (Account 1)
STRIPE_SECRET_KEY_PRIMARY=sk_live_your_primary_secret_key_here
STRIPE_PUBLISHABLE_KEY_PRIMARY=pk_live_your_primary_publishable_key_here

# Secondary Stripe Account (Account 2) 
STRIPE_SECRET_KEY_SECONDARY=sk_live_your_secondary_secret_key_here
STRIPE_PUBLISHABLE_KEY_SECONDARY=pk_live_your_secondary_publishable_key_here

# Keep existing keys as fallbacks
STRIPE_SECRET_KEY=sk_live_your_current_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_current_key_here
```

**Important Notes:**
- Both accounts need to be active and configured in Stripe
- Use live keys (`sk_live_`, `pk_live_`) for production
- Use test keys (`sk_test_`, `pk_test_`) for development
- Keep your existing keys as fallbacks for safety

### 3. Customize Rotation Schedule

Edit `/lib/api-key-rotation.ts` to modify the rotation schedule:

```typescript
rotationSchedule: {
  useSecondaryDays: [2, 4], // Tuesday and Thursday (0=Sunday, 1=Monday, 2=Tuesday, etc.)
  switchHour: 9, // Switch at 9 AM
}
```

**Example Schedules:**
- **Weekdays only**: `useSecondaryDays: [1, 2, 3, 4, 5]` (Monday-Friday)
- **Weekends**: `useSecondaryDays: [0, 6]` (Sunday-Saturday)
- **Specific days**: `useSecondaryDays: [1, 3, 5]` (Monday, Wednesday, Friday)
- **Multiple times per day**: You can modify the logic to switch multiple times

### 4. Deploy to Vercel

The rotation system is already integrated into your API endpoints:
- `/api/create-payment-intent`
- `/api/payment-success`
- `/api/cron/authorize-damage-deposits`

Just deploy your changes and the rotation will start working automatically.

## How It Works

1. **Time-based switching**: The system checks the current day and time
2. **Automatic fallback**: If secondary key isn't available, it uses the primary key
3. **Zero downtime**: Key switching happens seamlessly without service interruption
4. **Logging**: You can add `logActiveStripeKey()` calls to see which key is active

## Monitoring

Add logging to see which Stripe account is being used:

```typescript
import { logActiveStripeAccount } from '@/lib/api-key-rotation';

// In your API route
logActiveStripeAccount(); // Logs current active account and both keys
```

This will log:
- Current time
- Which account is active (PRIMARY or SECONDARY)
- Both secret and publishable keys being used

Check your Vercel function logs to see the rotation in action.

## Advanced Configuration

### Multiple Daily Rotations

To switch keys multiple times per day, modify the rotation logic:

```typescript
function getActiveStripeKey(config: StripeRotationConfig): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hour = now.getHours();
  
  const { useSecondaryDays } = config.rotationSchedule;
  const isSecondaryDay = useSecondaryDays.includes(dayOfWeek);
  
  // Switch every 6 hours on secondary days
  const shouldUseSecondary = isSecondaryDay && (hour % 6 < 3);
  
  return shouldUseSecondary ? config.secondaryKey : config.primaryKey;
}
```

### Timezone Considerations

The rotation uses server time (UTC). For local timezone rotation:

```typescript
import { formatInTimeZone } from 'date-fns-tz';

const now = new Date();
const localTime = formatInTimeZone(now, 'America/Vancouver', 'HH:mm');
const hour = parseInt(localTime.split(':')[0]);
```

## Troubleshooting

1. **Key not switching**: Check that both environment variables are set in Vercel
2. **Wrong timezone**: Modify the timezone logic if needed
3. **Fallback issues**: Ensure `STRIPE_SECRET_KEY` is still set as a fallback

## Security Best Practices

1. **Rotate regularly**: Change your API keys periodically
2. **Monitor usage**: Check Stripe dashboard for unusual activity
3. **Use different accounts**: Consider using separate Stripe accounts for different purposes
4. **Test thoroughly**: Verify both keys work before deploying

## Example: Weekly Rotation

To use secondary key every Tuesday and Thursday:

```typescript
rotationSchedule: {
  useSecondaryDays: [2, 4], // Tuesday, Thursday
  switchHour: 0, // Switch at midnight
}
```

This will use the secondary key all day on Tuesday and Thursday, and the primary key the rest of the week.
