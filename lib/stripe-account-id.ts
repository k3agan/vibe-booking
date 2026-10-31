/**
 * Which of CHH's two live Stripe accounts owns an object. Pure and
 * dependency-free so it can be used client-side (admin UI) and in tests.
 *
 * Live-mode Stripe object IDs embed a fragment of the owning account ID:
 *   PRIMARY   acct_1S6yNLCQrvU0Yvn4 → ids contain "CQrvU0Yvn4"
 *   SECONDARY acct_1KpNIAJAT5KpLHRq → ids contain "JAT5KpLHRq"
 * The same rule is the bookings.stripe_account generated column
 * (supabase/migrations/20261031_bookings_stripe_account.sql).
 */

export type StripeAccountLabel = 'primary' | 'secondary';

const ACCOUNT_SIGNATURES: Record<StripeAccountLabel, string> = {
  primary: 'CQrvU0Yvn4',
  secondary: 'JAT5KpLHRq',
};

/** Owner account from a Stripe object ID, or null if it has no known signature. */
export function stripeAccountForObjectId(objectId: string | null | undefined): StripeAccountLabel | null {
  if (!objectId) return null;
  if (objectId.includes(ACCOUNT_SIGNATURES.primary)) return 'primary';
  if (objectId.includes(ACCOUNT_SIGNATURES.secondary)) return 'secondary';
  return null;
}

export function otherStripeAccount(account: StripeAccountLabel): StripeAccountLabel {
  return account === 'primary' ? 'secondary' : 'primary';
}

/**
 * Account that owns a booking's card: the stored (generated) stripe_account
 * column when present, else the ID signatures of the saved card / rental
 * payment. Works whether or not the migration has been applied.
 */
export function resolveBookingStripeAccount(b: {
  stripe_account?: string | null;
  payment_method_id?: string | null;
  payment_intent_id?: string | null;
}): StripeAccountLabel | null {
  const stored = b.stripe_account === 'primary' || b.stripe_account === 'secondary' ? b.stripe_account : null;
  return stored ?? stripeAccountForObjectId(b.payment_method_id) ?? stripeAccountForObjectId(b.payment_intent_id);
}

/** Owner account first, then the other one. Unknown owner → primary, then secondary. */
export function stripeAccountAttemptOrder(preferred: StripeAccountLabel | null): StripeAccountLabel[] {
  return preferred ? [preferred, otherStripeAccount(preferred)] : ['primary', 'secondary'];
}
