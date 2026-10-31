import Stripe from 'stripe';
import { isResourceMissing } from '../stripe-accounts';
import {
  otherStripeAccount,
  resolveBookingStripeAccount,
  stripeAccountAttemptOrder,
  stripeAccountForObjectId,
} from '../stripe-account-id';

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

describe('resolveBookingStripeAccount', () => {
  it('prefers the stored (generated) stripe_account column', () => {
    expect(
      resolveBookingStripeAccount({ stripe_account: 'secondary', payment_method_id: 'pm_1xCQrvU0Yvn4y', payment_intent_id: 'pi_1xCQrvU0Yvn4y' })
    ).toBe('secondary');
  });
  it('falls back to the card ID, then the rental PaymentIntent ID (migration not applied)', () => {
    expect(resolveBookingStripeAccount({ payment_method_id: 'pm_1xJAT5KpLHRqy', payment_intent_id: 'pi_1xCQrvU0Yvn4y' })).toBe('secondary');
    expect(resolveBookingStripeAccount({ stripe_account: null, payment_method_id: 'pm_test', payment_intent_id: 'pi_1xCQrvU0Yvn4y' })).toBe('primary');
    expect(resolveBookingStripeAccount({ stripe_account: 'garbage', payment_method_id: 'pm_test' })).toBeNull();
  });
});

describe('stripeAccountAttemptOrder', () => {
  it('owner first, then the other account', () => {
    expect(stripeAccountAttemptOrder('primary')).toEqual(['primary', 'secondary']);
    expect(stripeAccountAttemptOrder('secondary')).toEqual(['secondary', 'primary']);
    expect(stripeAccountAttemptOrder(null)).toEqual(['primary', 'secondary']);
    expect(otherStripeAccount('secondary')).toBe('primary');
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
