/**
 * Stripe API Key Rotation Utility
 * Automatically rotates between primary and secondary Stripe accounts (both public and secret keys)
 * All times are in Vancouver timezone (America/Vancouver)
 */

interface StripeRotationConfig {
  primarySecretKey: string;
  secondarySecretKey: string;
  primaryPublishableKey: string;
  secondaryPublishableKey: string;
  rotationSchedule: {
    // Days of week (0 = Sunday, 1 = Monday, etc.)
    useSecondaryDays: number[];
    // Hours in 24h format when to switch to secondary
    switchHour: number;
  };
}

/**
 * Determines which Stripe account to use based on current Vancouver time and rotation schedule
 */
function shouldUseSecondaryAccount(config: StripeRotationConfig): boolean {
  const now = new Date();
  
  // Convert to Vancouver timezone using date-fns-tz approach
  const vancouverDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Vancouver"}));
  const dayOfWeek = vancouverDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const hour = vancouverDate.getHours();
  
  const { useSecondaryDays, switchHour } = config.rotationSchedule;
  
  // Check if today is a secondary key day
  const isSecondaryDay = useSecondaryDays.includes(dayOfWeek);
  
  // Check if it's past the switch hour
  const isPastSwitchHour = hour >= switchHour;
  
  // Use secondary account if it's a secondary day and past switch hour
  return isSecondaryDay && isPastSwitchHour;
}

/**
 * Get Stripe secret key based on rotation schedule
 * 
 * Current schedule: Use secondary account on Tuesday and Thursday after 9 AM Vancouver time
 * You can modify the rotationSchedule to change the timing
 */
export function getStripeSecretKey(): string {
  const config: StripeRotationConfig = {
    primarySecretKey: process.env.STRIPE_SECRET_KEY_PRIMARY || process.env.STRIPE_SECRET_KEY || '',
    secondarySecretKey: process.env.STRIPE_SECRET_KEY_SECONDARY || process.env.STRIPE_SECRET_KEY || '',
    primaryPublishableKey: process.env.STRIPE_PUBLISHABLE_KEY_PRIMARY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    secondaryPublishableKey: process.env.STRIPE_PUBLISHABLE_KEY_SECONDARY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    rotationSchedule: {
      useSecondaryDays: [2, 4], // Tuesday and Thursday (0=Sunday, 1=Monday, 2=Tuesday, etc.)
      switchHour: 9, // Switch at 9 AM Vancouver time
    },
  };

  return shouldUseSecondaryAccount(config) ? config.secondarySecretKey : config.primarySecretKey;
}

/**
 * Get Stripe publishable key based on rotation schedule
 * This should be used on the client-side for Stripe Elements
 */
export function getStripePublishableKey(): string {
  const config: StripeRotationConfig = {
    primarySecretKey: process.env.STRIPE_SECRET_KEY_PRIMARY || process.env.STRIPE_SECRET_KEY || '',
    secondarySecretKey: process.env.STRIPE_SECRET_KEY_SECONDARY || process.env.STRIPE_SECRET_KEY || '',
    primaryPublishableKey: process.env.STRIPE_PUBLISHABLE_KEY_PRIMARY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    secondaryPublishableKey: process.env.STRIPE_PUBLISHABLE_KEY_SECONDARY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    rotationSchedule: {
      useSecondaryDays: [2, 4], // Tuesday and Thursday (0=Sunday, 1=Monday, 2=Tuesday, etc.)
      switchHour: 9, // Switch at 9 AM Vancouver time
    },
  };

  return shouldUseSecondaryAccount(config) ? config.secondaryPublishableKey : config.primaryPublishableKey;
}

/**
 * Get both Stripe keys as a pair (for convenience)
 */
export function getStripeKeyPair(): { secretKey: string; publishableKey: string } {
  return {
    secretKey: getStripeSecretKey(),
    publishableKey: getStripePublishableKey(),
  };
}

/**
 * Log which Stripe account is currently active (for debugging)
 */
export function logActiveStripeAccount() {
  const now = new Date();
  
  // Get Vancouver time for logging
  const vancouverTime = now.toLocaleString("en-US", {
    timeZone: "America/Vancouver",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const config: StripeRotationConfig = {
    primarySecretKey: process.env.STRIPE_SECRET_KEY_PRIMARY || process.env.STRIPE_SECRET_KEY || '',
    secondarySecretKey: process.env.STRIPE_SECRET_KEY_SECONDARY || process.env.STRIPE_SECRET_KEY || '',
    primaryPublishableKey: process.env.STRIPE_PUBLISHABLE_KEY_PRIMARY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    secondaryPublishableKey: process.env.STRIPE_PUBLISHABLE_KEY_SECONDARY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    rotationSchedule: {
      useSecondaryDays: [2, 4],
      switchHour: 9,
    },
  };

  const isUsingSecondary = shouldUseSecondaryAccount(config);
  const accountType = isUsingSecondary ? 'SECONDARY' : 'PRIMARY';
  const activeKeys = isUsingSecondary 
    ? { secret: config.secondarySecretKey, publishable: config.secondaryPublishableKey }
    : { secret: config.primarySecretKey, publishable: config.primaryPublishableKey };
  
  console.log(`[Stripe Account Rotation] Vancouver time: ${vancouverTime}`);
  console.log(`[Stripe Account Rotation] Active account: ${accountType}`);
  console.log(`[Stripe Account Rotation] Secret key: ${activeKeys.secret.substring(0, 20)}...`);
  console.log(`[Stripe Account Rotation] Publishable key: ${activeKeys.publishable.substring(0, 20)}...`);
}

// Legacy function name for backward compatibility
export const getStripeApiKey = getStripeSecretKey;
