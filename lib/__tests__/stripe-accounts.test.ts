import Stripe from 'stripe';
import { candidateStripeKeys, isResourceMissing, stripeAccountForObjectId } from '../stripe-accounts';

describe('stripeAccountForObjectId', () => {
  it('detects the PRIMARY account (acct_1S6yNLCQrvU0Yvn4)', () => {
    expect(stripeAccountForObjectId('pm_1SAbCdCQrvU0Yvn4XyZ123')).toBe('primary');
    expect(stripeAccountForObjectId('pi_3SAbCdCQrvU0Yvn41a2b3c')).toBe('primary');
  });
  it('detects the SECONDARY account (acct_1KpNIAJAT5KpLHRq)', () => {
    expect(stripeAccountForObjectId('pm_1QzzzzJAT5KpLHRqAbC987')).toBe('secondary');
  });
  it('returns null when the ID has no known signature', () => {
    expect(stripeAccountForObjectId('pm_card_visa')).toBeNull();
    expect(stripeAccountForObjectId('')).toBeNull();
    expect(stripeAccountForObjectId(undefined)).toBeNull();
  });
});

describe('candidateStripeKeys', () => {
  const keys = { primary: 'sk_P', secondary: 'sk_S', fallback: ['sk_S', 'sk_P', 'sk_LEGACY'] };

  it('puts the owner account first even when the other key is active today', () => {
    // fallback order = active key first; today SECONDARY is active
    expect(candidateStripeKeys('pm_1xCQrvU0Yvn4y', keys)).toEqual(['sk_P', 'sk_S', 'sk_LEGACY']);
    expect(candidateStripeKeys('pm_1xJAT5KpLHRqy', keys)).toEqual(['sk_S', 'sk_P', 'sk_LEGACY']);
  });

  it('falls back to the rotation order for unknown IDs', () => {
    expect(candidateStripeKeys('pm_unknown', keys)).toEqual(['sk_S', 'sk_P', 'sk_LEGACY']);
  });

  it('drops empty and duplicate keys', () => {
    expect(candidateStripeKeys('pm_1xJAT5KpLHRqy', { primary: 'sk_ONE', secondary: '', fallback: ['sk_ONE', ''] })).toEqual([
      'sk_ONE',
    ]);
  });
});

describe('isResourceMissing', () => {
  it('true for "No such PaymentMethod" from the other account', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = new Stripe.errors.StripeInvalidRequestError({
      type: 'invalid_request_error',
      code: 'resource_missing',
      statusCode: 404,
      message: "No such PaymentMethod: 'pm_123'",
    } as any);
    expect(isResourceMissing(err)).toBe(true);
    expect(isResourceMissing({ message: "No such payment_method: 'pm_1'" })).toBe(true);
  });
  it('false for card errors and other failures', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const card = new Stripe.errors.StripeCardError({ type: 'card_error', code: 'card_declined' } as any);
    expect(isResourceMissing(card)).toBe(false);
    expect(isResourceMissing(new Error('network'))).toBe(false);
    expect(isResourceMissing(null)).toBe(false);
  });
});
