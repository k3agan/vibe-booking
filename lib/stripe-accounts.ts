import Stripe from 'stripe';
import { getAllStripeSecretKeys } from './api-key-rotation';
import type { StripeAccountLabel } from './stripe-account-id';

/**
 * CHH has two live Stripe accounts and lib/api-key-rotation.ts swaps the
 * active key by day/hour. Anything that acts on an existing Stripe object
 * (refund, deposit hold on a saved card, …) must use the account that owns
 * that object, not whichever key happens to be active right now.
 * Account detection from IDs lives in ./stripe-account-id (client-safe).
 */

export const STRIPE_API_VERSION = '2025-08-27.basil' as const;

export type { StripeAccountLabel } from './stripe-account-id';
export { stripeAccountForObjectId } from './stripe-account-id';

/** Secret key for one of the two accounts ('' if not configured). */
export function stripeSecretKeyFor(account: StripeAccountLabel): string {
  return account === 'primary'
    ? process.env.STRIPE_SECRET_KEY_PRIMARY || process.env.STRIPE_SECRET_KEY || ''
    : process.env.STRIPE_SECRET_KEY_SECONDARY || process.env.STRIPE_SECRET_KEY || '';
}

export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
}

/** Human label for a secret key (for logs/alerts — never log the key itself). */
export function stripeAccountLabelForKey(key: string): string {
  if (key && key === process.env.STRIPE_SECRET_KEY_PRIMARY) return 'PRIMARY';
  if (key && key === process.env.STRIPE_SECRET_KEY_SECONDARY) return 'SECONDARY';
  return 'LEGACY';
}

/**
 * True when a Stripe error means "this resource doesn't exist on THIS account."
 * That's the signal to retry the same operation against the other account.
 */
export function isResourceMissing(err: unknown): boolean {
  if (err && typeof err === 'object') {
    const e = err as { code?: string; statusCode?: number; message?: string };
    if (e.code === 'resource_missing') return true;
    if (e.statusCode === 404) return true;
    if (typeof e.message === 'string' && /no such (payment_intent|payment_method|charge|refund)/i.test(e.message)) {
      return true;
    }
  }
  return false;
}

/**
 * Run a Stripe operation against each configured key (active account first)
 * until one finds the referenced resource. Falls through to the next key ONLY
 * when the resource is missing on the current account — any other error
 * (e.g. charge already refunded, invalid amount) is thrown immediately so we
 * never double-act across accounts.
 */
export async function withStripeFallback<T>(fn: (stripe: Stripe) => Promise<T>): Promise<T> {
  const keys = getAllStripeSecretKeys();
  if (keys.length === 0) {
    throw new Error('No Stripe secret key configured');
  }

  let lastErr: unknown;
  for (let i = 0; i < keys.length; i++) {
    const stripe = new Stripe(keys[i], { apiVersion: STRIPE_API_VERSION });
    try {
      return await fn(stripe);
    } catch (err) {
      lastErr = err;
      if (isResourceMissing(err) && i < keys.length - 1) {
        console.warn(
          `[stripe] Resource missing on ${stripeAccountLabelForKey(keys[i])} key (#${i + 1}), trying next account`
        );
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}
