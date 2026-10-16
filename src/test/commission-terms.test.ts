import { expect, it } from 'vitest';
import { parseCommissionTerms, describeCommissionTerms } from '@/lib/commissionTerms';
const form = (basis='', amount='', currency='') => { const f = new FormData(); f.set('commissionBasis',basis); f.set('commissionAmount',amount); f.set('commissionCurrency',currency); return f; };
it('keeps unrecorded terms distinct from explicitly zero commission', () => {
  expect(parseCommissionTerms(form()).commission_amount).toBeNull();
  expect(parseCommissionTerms(form('flat_per_enrolment','0','gbp'))).toEqual({commission_basis:'flat_per_enrolment',commission_amount:0,commission_currency:'GBP'});
});
it('rejects invalid terms before saving an agreement', () => {
  for (const f of [form('percentage_of_tuition','101'),form('flat_per_enrolment','100'),form('percentage_of_tuition','-1'),form('flat_per_enrolment','NaN','GBP')]) expect(() => parseCommissionTerms(f)).toThrow();
});
it('shows percentages as agreement terms rather than cash or earned revenue', () => {
  expect(describeCommissionTerms(parseCommissionTerms(form('percentage_of_tuition','15')))).toBe('15% of tuition, subject to agreement conditions');
});
