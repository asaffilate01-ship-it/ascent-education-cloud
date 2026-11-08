/** The marking RPC returns the private, penalty-adjusted score; void or coerced values are not a receipt. */
export function confirmedMarkReceipt(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}
