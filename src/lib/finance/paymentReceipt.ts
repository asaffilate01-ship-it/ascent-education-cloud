export const MANUAL_PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'raast', label: 'Raast transfer' },
  { value: 'nayapay', label: 'NayaPay transfer' },
  { value: 'sadapay', label: 'SadaPay transfer' },
  { value: 'bank_alfalah', label: 'Bank Alfalah transfer' },
] as const;

export type ManualPaymentMethod = typeof MANUAL_PAYMENT_METHODS[number]['value'];
export type PendingPaymentRecord = {
  id: string; invoice_id: string; tenant_id: string; amount: number;
  method: ManualPaymentMethod; reference_number: string;
  bank_name: string | null; sender_account: string | null; notes: string | null;
  status: 'pending';
};

/** Compare rupees in paisa; do not round an invalid amount into an accepted payment. */
export function paymentMinorUnits(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const amount = Number(value), minor = Math.round(amount * 100);
  return Number.isFinite(amount) && amount >= 0 && Number.isSafeInteger(minor)
    && (minor / 100 === amount || Math.abs(amount * 100 - minor) < 1e-7) ? minor : null;
}

export function reviewedPaymentAmount(raw: string, studentBalance: number): number {
  const balance = paymentMinorUnits(studentBalance);
  if (balance === null || balance <= 0) throw Error('This invoice has no verified student balance available.');
  const text = raw.trim();
  if (text && !/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(text)) {
    throw Error('Enter a positive amount with no more than two decimal places.');
  }
  const amount = text === '' ? balance : paymentMinorUnits(Number(text));
  if (amount === null || amount <= 0) throw Error('Enter an amount greater than zero.');
  if (amount > balance) throw Error('The amount cannot exceed the student balance on this invoice.');
  return amount / 100;
}

export function matchesPendingPayment(value: unknown, expected: PendingPaymentRecord): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return row.id === expected.id && row.invoice_id === expected.invoice_id
    && row.tenant_id === expected.tenant_id && row.status === 'pending'
    && paymentMinorUnits(row.amount) === paymentMinorUnits(expected.amount)
    && row.method === expected.method && row.reference_number === expected.reference_number
    && row.bank_name === expected.bank_name && row.sender_account === expected.sender_account
    && row.notes === expected.notes;
}

/** Only these explicit server rejections establish that a first INSERT did not persist. */
export function definitePaymentRejection(error: unknown): boolean {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  return typeof code === 'string' && ['P0001', '42501', '23502', '23503', '23514', '22023', '22P02'].includes(code);
}
