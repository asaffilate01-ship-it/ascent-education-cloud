/**
 * Local academy referral fees. Separate from university referral income.
 * This pure calculator is NOT authority to pay; the private backend alone
 * supplies approved rates, immutable student attribution and settled receipts.
 */
export type SettledFeeEvent = {
  paymentId: string;
  studentId: string;
  amountPkr: string;
  state: 'settled' | 'refunded' | 'reversed' | 'pending' | 'failed';
  settledAt: string;
};
export type ApprovedCommissionPolicy = {
  centreRepresentativeId: string;
  representativeDirectBps: number;
  representativeOtherBps: number;
};
export type LockedDirectReferral = {
  studentId: string;
  referrerId: string;
  directBps: number;
};
export type CommissionLine = {
  key: string;
  paymentId: string;
  studentId: string;
  beneficiaryId: string;
  kind: 'direct_referral' | 'centre_representative';
  rateBps: number;
  amountPkr: string;
  settledAt: string;
};

const validateBps = (value: number): void => {
  if (!Number.isInteger(value) || value < 0 || value > 10000) {
    throw new Error('Commission basis points must be a whole number from 0 to 10000');
  }
};
/** Currency is parsed as an exact integer number of paisa, not floating point. */
export function parsePaisa(amount: string): bigint {
  const s = amount.trim();
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/.test(s)) {
    throw new Error('Amount must be a non-negative PKR amount with up to two decimals');
  }
  const [whole, fraction = ''] = s.split('.');
  const result = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0') || '0');
  if (result > 999999999999999999n) throw new Error('Amount exceeds the supported reporting limit');
  return result;
}
export function formatPaisa(amount: bigint): string {
  const sign = amount < 0n ? '-' : '';
  const abs = amount < 0n ? -amount : amount;
  return sign + (abs / 100n).toString() + '.' + (abs % 100n).toString().padStart(2, '0');
}
function bpsOf(paisa: bigint, rate: number): bigint {
  validateBps(rate);
  return (paisa * BigInt(rate) + 5000n) / 10000n;
}
function validId(id: string): boolean { return id.trim().length > 0 && !id.includes(':'); }

/**
 * One ledger line per unique (payment, beneficiary, commission kind).
 * Any refund event has its own unique financial transaction ID and a negative
 * commission: never rewrite or delete an original accrual.
 */
export function calculateFeeCommissions(
  event: SettledFeeEvent,
  policy: ApprovedCommissionPolicy,
  lockedReferral: LockedDirectReferral | null,
): CommissionLine[] {
  if (!['settled', 'refunded', 'reversed'].includes(event.state)) return [];
  if (!validId(event.paymentId) || !validId(event.studentId) || !validId(policy.centreRepresentativeId)) {
    throw new Error('Verified student, payment and centre representative IDs are required');
  }
  if (!Number.isFinite(Date.parse(event.settledAt))) throw new Error('Valid settlement timestamp required');
  validateBps(policy.representativeDirectBps);
  validateBps(policy.representativeOtherBps);
  if (lockedReferral) {
    if (lockedReferral.studentId !== event.studentId || !validId(lockedReferral.referrerId)) {
      throw new Error('Referral must belong to this verified student');
    }
    validateBps(lockedReferral.directBps);
  }
  const amount = parsePaisa(event.amountPkr);
  if (amount === 0n) return [];
  const sign = event.state === 'settled' ? 1n : -1n;
  const representativeIsDirect = lockedReferral?.referrerId === policy.centreRepresentativeId;
  const beneficiaries = representativeIsDirect
    ? [{id: policy.centreRepresentativeId, kind: 'direct_referral' as const, bps: policy.representativeDirectBps}]
    : [
      {id: policy.centreRepresentativeId, kind: 'centre_representative' as const, bps: policy.representativeOtherBps},
      ...(lockedReferral ? [{id: lockedReferral.referrerId, kind: 'direct_referral' as const, bps: lockedReferral.directBps}] : []),
    ];
  return beneficiaries.filter(b => b.bps > 0).map(b => ({
    key: [event.paymentId, b.id, b.kind].join(':'),
    paymentId: event.paymentId,
    studentId: event.studentId,
    beneficiaryId: b.id,
    kind: b.kind,
    rateBps: b.bps,
    amountPkr: formatPaisa(sign * bpsOf(amount, b.bps)),
    settledAt: event.settledAt,
  }));
}
export function monthlyCommissionTotals(lines: CommissionLine[], month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Month must be YYYY-MM');
  const subtotals = new Map<string, bigint>();
  const unique = new Set<string>();
  for (const line of lines) {
    if (unique.has(line.key)) throw new Error('Duplicate payment commission key');
    unique.add(line.key);
    if (!line.settledAt.startsWith(month + '-')) continue;
    const isNegative = line.amountPkr.startsWith('-');
    const amount = parsePaisa(isNegative ? line.amountPkr.slice(1) : line.amountPkr);
    subtotals.set(line.beneficiaryId, (subtotals.get(line.beneficiaryId) || 0n) + (isNegative ? -amount : amount));
  }
  return [...subtotals.entries()].map(([beneficiaryId,amount]) => ({
    beneficiaryId, amountPkr: formatPaisa(amount),
  })).sort((a,b) => a.beneficiaryId.localeCompare(b.beneficiaryId));
}
