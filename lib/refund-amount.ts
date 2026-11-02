/** CAD input contract shared by the API, cancellation pipeline and portal. */
export function isValidRefundAmount(amount: unknown): amount is number | null {
  if (amount === null) return true; // full remaining captured Stripe balance
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) return false;
  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents) && Math.abs(cents / 100 - amount) <= 1e-9;
}
