/** CAD input contract shared by the API, cancellation pipeline and portal. */
export function isValidRefundAmount(amount: unknown): amount is number | null {
  if (amount === null) return true; // full remaining captured Stripe balance
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) return false;
  const scaled = amount * 100;
  const cents = Math.round(scaled);
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(scaled)) * 4;
  return Number.isSafeInteger(cents) && (amount === 0 || cents > 0) &&
    Math.abs(scaled - cents) <= tolerance;
}
