export const STUDENT_INVOICE_TYPES = {
  tuition: 'Tuition fee',
  exam: 'Exam fee',
  deposit: 'Deposit',
} as const;

export type StudentInvoiceType = keyof typeof STUDENT_INVOICE_TYPES;
export type InvoiceAccount = {user_id: string; full_name: string; tenant_id: string};
export type InvoiceForm = {
  studentId: string;
  type: StudentInvoiceType;
  amount: string;
  instalments: string;
  dueDate: string;
};
export type ReviewedInvoice = {
  id: string;
  tenant_id: string;
  student_id: string;
  student_name: string;
  type: StudentInvoiceType;
  amount: number;
  instalments: number;
  due_date: string | null;
};

export const INVOICE_RECEIPT_COLUMNS = 'id,tenant_id,student_id,student_name,type,amount,instalments,due_date';
export const INVOICE_ACCOUNT_COLUMNS = 'user_id,full_name,tenant_id';
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export function invoiceAccount(value: unknown, tenant: string): InvoiceAccount | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.user_id !== 'string' || !UUID.test(row.user_id) || row.tenant_id !== tenant
    || typeof row.full_name !== 'string' || !row.full_name.trim()) return null;
  return {user_id: row.user_id, full_name: row.full_name.trim(), tenant_id: tenant};
}

/** NUMERIC(12,2), calculated in paise so extra precision is rejected instead of rounded. */
export function invoiceAmountInPaise(value: unknown): number | null {
  const text = typeof value === 'number' && Number.isFinite(value) ? String(value)
    : typeof value === 'string' ? value.trim() : '';
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(paise) && paise > 0 && paise <= 999_999_999_999 ? paise : null;
}

export function validInvoiceDate(value: string): boolean {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function reviewInvoice(form: InvoiceForm, account: InvoiceAccount, tenant: string, id: string): ReviewedInvoice {
  const amount = invoiceAmountInPaise(form.amount);
  if (amount === null) throw Error('Enter a positive PKR amount with no more than two decimal places, up to 9,999,999,999.99.');
  if (!Object.prototype.hasOwnProperty.call(STUDENT_INVOICE_TYPES, form.type)) throw Error('Choose tuition, exam or deposit for a student charge.');
  if (!['1', '2', '4', '6'].includes(form.instalments)) throw Error('Choose a valid whole number of payments.');
  if (!validInvoiceDate(form.dueDate)) throw Error('Enter a valid due date, or leave it empty.');
  if (account.user_id !== form.studentId || account.tenant_id !== tenant || !UUID.test(id)) {
    throw Error('Select and verify the student account before reviewing this invoice.');
  }
  return {
    id, tenant_id: tenant, student_id: account.user_id, student_name: account.full_name,
    type: form.type, amount: amount / 100, instalments: Number(form.instalments), due_date: form.dueDate || null,
  };
}

export function confirmedInvoiceReceipt(value: unknown, reviewed: ReviewedInvoice): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  const reviewedAmount = invoiceAmountInPaise(reviewed.amount);
  return reviewedAmount !== null && row.id === reviewed.id && row.tenant_id === reviewed.tenant_id && row.student_id === reviewed.student_id
    && row.student_name === reviewed.student_name && row.type === reviewed.type
    && invoiceAmountInPaise(row.amount) === reviewedAmount
    && row.instalments === reviewed.instalments && row.due_date === reviewed.due_date;
}

export function formatInvoiceAmount(amount: number): string {
  return new Intl.NumberFormat('en-PK', {style: 'currency', currency: 'PKR', minimumFractionDigits: 2, maximumFractionDigits: 2}).format(amount);
}
