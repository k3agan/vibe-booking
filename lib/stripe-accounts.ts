import Stripe from 'stripe';
import { getAllStripeSecretKeys } from './api-key-rotation';

/**
 * CHH has two live Stripe accounts and lib/api-key-rotation.ts swaps the
 * active key by day/hour. Anything that acts on an existing Stripe object
 * (refund, deposit hold on a saved card, …) must use the account that owns
 * that object, not whichever key happens to be active right now.
 */

export const STRIPE_API_VERSION = '2025-08-27.basil' as const;

export type StripeAccountLabel = 'primary' | 'secondary';

/**
 * Live-mode Stripe object IDs embed a fragment of the owning account ID:
 *   PRIMARY   acct_1S6yNLCQrvU0Yvn4 → ids contain "CQrvU0Yvn4"
 *   SECONDARY acct_1KpNIAJAT5KpLHRq → ids contain "JAT5KpLHRq"
 */
const ACCOUNT_SIGNATURES: Record<StripeAccountLabel, string> = {
  primary: 'CQrvU0Yvn4',
  secondary: 'JAT5KpLHRq',
};

/** Which CHH Stripe account owns this object, or null if it can't be told from the ID. */
export function stripeAccountForObjectId(objectId: string | null | undefined): StripeAccountLabel | null {
  if (!objectId) return null;
  if (objectId.includes(ACCOUNT_SIGNATURES.primary)) return 'primary';
  if (objectId.includes(ACCOUNT_SIGNATURES.secondary)) return 'secondary';
  return null;
}

/**
 * Secret keys to try for an existing object, owner account first. Every other
 * configured key follows as a fallback (for IDs without a recognisable
 * signature, e.g. test mode). Empties and duplicates are dropped.
 */
export function candidateStripeKeys(
  objectId: string | null | undefined,
  keys: { primary: string; secondary: string; fallback: string[] }
): string[] {
  const owner = stripeAccountForObjectId(objectId);
  const ownerKey = owner ? keys[owner] : '';
  const ordered = [ownerKey, ...keys.fallback, keys.primary, keys.secondary].filter(
    (k): k is string => Boolean(k)
  );
  return Array.from(new Set(ordered));
}

/** Same as candidateStripeKeys, reading the configured keys from the environment. */
export function candidateStripeKeysFromEnv(objectId: string | null | undefined): string[] {
  return candidateStripeKeys(objectId, {
    primary: process.env.STRIPE_SECRET_KEY_PRIMARY || process.env.STRIPE_SECRET_KEY || '',
    secondary: process.env.STRIPE_SECRET_KEY_SECONDARY || process.env.STRIPE_SECRET_KEY || '',
    fallback: getAllStripeSecretKeys(),
  });
}

/** Human label for a secret key (for logs/alerts — never log the key itself). */
export function stripeAccountLabelForKey(key: string): string {
  if (key && key === process.env.STRIPE_SECRET_KEY_PRIMARY) return 'PRIMARY';
  if (key && key === process.env.STRIPE_SECRET_KEY_SECONDARY) return 'SECONDARY';
  return 'LEGACY';
}

/**
 * Find the Stripe account that owns a saved card. Tries the owner account
 * (from the ID signature) first, then every other configured key. Throws a
 * resource_missing-style error if no configured account has it; any other
 * Stripe error (auth, network, …) is thrown as-is.
 */
export async function locatePaymentMethod(paymentMethodId: string): Promise<{
  stripe: Stripe;
  paymentMethod: Stripe.PaymentMethod;
  account: string;
}> {
  const keys = candidateStripeKeysFromEnv(paymentMethodId);
  if (keys.length === 0) {
    throw new Error('No Stripe secret key configured');
  }
  for (const key of keys) {
    const stripe = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
    try {
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      return { stripe, paymentMethod, account: stripeAccountLabelForKey(key) };
    } catch (err) {
      if (isResourceMissing(err)) continue;
      throw err;
    }
  }
  throw Object.assign(
    new Error(`No such PaymentMethod '${paymentMethodId}' on any configured Stripe account`),
    { code: 'payment_method_not_found' }
  );
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
