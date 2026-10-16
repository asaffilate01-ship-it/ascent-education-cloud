/** Records agreed terms only; never recognises revenue or creates a payout. */
export function parseCommissionTerms(form: FormData) {
  const basis = String(form.get('commissionBasis') || '');
  const raw = String(form.get('commissionAmount') || '').trim();
  const currency = String(form.get('commissionCurrency') || '').trim().toUpperCase();
  if (!basis && !raw && !currency) return { commission_basis: null, commission_amount: null, commission_currency: null };
  if (!['flat_per_enrolment', 'percentage_of_tuition'].includes(basis) || !raw) throw new Error('Choose a commission basis and enter the agreed amount.');
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0 || (basis === 'percentage_of_tuition' && amount > 100)) throw new Error('Enter a valid non-negative commission; percentages cannot exceed 100.');
  if ((basis === 'flat_per_enrolment' || currency) && !/^[A-Z]{3}$/.test(currency)) throw new Error('Enter the three-letter currency code from the agreement.');
  return { commission_basis: basis, commission_amount: amount, commission_currency: currency || null };
}
export function describeCommissionTerms(terms: { commission_basis?: string; commission_amount?: number; commission_currency?: string }) {
  if (terms.commission_amount == null || !terms.commission_basis) return 'Commission terms not recorded';
  if (terms.commission_basis === 'percentage_of_tuition') return `${terms.commission_amount}% of tuition, subject to agreement conditions`;
  if (terms.commission_basis === 'flat_per_enrolment') return `${terms.commission_currency || 'Currency unrecorded'} ${terms.commission_amount} per enrolment, subject to agreement conditions`;
  return 'See the signed agreement for commission terms';
}
