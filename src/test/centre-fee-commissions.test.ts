import {describe, expect, it} from 'vitest';
import {calculateFeeCommissions, monthlyCommissionTotals, parsePaisa} from '@/lib/centreFeeCommissions';

const terms = {centreRepresentativeId:'sohail', representativeDirectBps:500, representativeOtherBps:200};
const payment = {paymentId:'pay-1',studentId:'student-1',amountPkr:'20000.00',state:'settled' as const,settledAt:'2026-11-23T08:00:00+05:00'};
const direct = (referrerId:string,directBps:number)=>({studentId:'student-1',referrerId,directBps});

describe('Jhelum student fee commission',()=>{
 it('pays the representative 5% only when directly referring and never stacks the 2%',()=>{
  expect(calculateFeeCommissions(payment,terms,direct('sohail',500)).map(c=>[c.kind,c.beneficiaryId,c.amountPkr]))
   .toEqual([['direct_referral','sohail','1000.00']]);
 });
 it('pays Bob 5% plus the representative 2%',()=>{
  expect(calculateFeeCommissions(payment,terms,direct('bob',500)).map(c=>[c.beneficiaryId,c.amountPkr]))
   .toEqual([['sohail','400.00'],['bob','1000.00']]);
 });
 it('pays another referrer 2.5% plus the representative 2%',()=>{
  expect(calculateFeeCommissions(payment,terms,direct('other',250)).map(c=>[c.beneficiaryId,c.amountPkr]))
   .toEqual([['sohail','400.00'],['other','500.00']]);
 });
 it('pays 2% for a direct owner enrolment with no attributed referrer',()=>{
  expect(calculateFeeCommissions(payment,terms,null).map(c=>[c.beneficiaryId,c.amountPkr]))
   .toEqual([['sohail','400.00']]);
 });
 it('does not accrue on pending, failed or zero payments',()=>{
  for(const state of ['pending','failed'] as const) expect(calculateFeeCommissions({...payment,state},terms,null)).toEqual([]);
  expect(calculateFeeCommissions({...payment,amountPkr:'0.00'},terms,null)).toEqual([]);
 });
 it('treats refund and reversal as auditable negative transactions',()=>{
  const earned=calculateFeeCommissions(payment,terms,direct('bob',500));
  const credit=calculateFeeCommissions({...payment,paymentId:'refund-1',state:'refunded',amountPkr:'5000.00'},terms,direct('bob',500));
  expect(monthlyCommissionTotals([...earned,...credit],'2026-11')).toEqual([
   {beneficiaryId:'bob',amountPkr:'750.00'},
   {beneficiaryId:'sohail',amountPkr:'300.00'},
  ]);
 });
 it('detects duplicate financial-event allocations and invalid foreign student referral',()=>{
  const lines=calculateFeeCommissions(payment,terms,null);
  expect(()=>monthlyCommissionTotals([...lines,...lines],'2026-11')).toThrow(/Duplicate/);
  expect(()=>calculateFeeCommissions(payment,terms,{studentId:'student-2',referrerId:'bob',directBps:500})).toThrow();
 });
 it('refuses float precision errors and invalid commission rates',()=>{
  expect(parsePaisa('0.02')).toBe(2n);
  expect(()=>parsePaisa('1.005')).toThrow();
  expect(()=>parsePaisa('-1.00')).toThrow();
  expect(()=>calculateFeeCommissions(payment,{...terms,representativeOtherBps:10001},null)).toThrow();
 });
});
