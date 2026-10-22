import {describe,it,expect} from 'vitest';
import {invoicePaymentMinorUnits} from '../../supabase/functions/_shared/invoice-payment';
const invoice={student_id:'student',status:'pending',amount:100,paid:20};
describe('invoice payment validation',()=>{
 it('uses the stored outstanding balance',()=>expect(invoicePaymentMinorUnits(invoice,'student')).toBe(8000));
 it('accepts a valid partial payment',()=>expect(invoicePaymentMinorUnits(invoice,'student',25.5)).toBe(2550));
 it('rejects refunded or closed invoices',()=>{for(const status of ['refunded','paid','cancelled'])expect(()=>invoicePaymentMinorUnits({...invoice,status},'student')).toThrow();});
 it('rejects another learner invoice',()=>expect(()=>invoicePaymentMinorUnits(invoice,'other')).toThrow(/own/));
 it('rejects invalid, zero and excessive amounts',()=>{for(const amount of [null,0,-1,81,1.001,NaN,Infinity,'bad'])expect(()=>invoicePaymentMinorUnits(invoice,'student',amount)).toThrow();});
 it('rejects invalid balances and sub-minor-unit payments',()=>{expect(()=>invoicePaymentMinorUnits({...invoice,paid:-1},'student')).toThrow();expect(()=>invoicePaymentMinorUnits({...invoice,paid:100},'student')).toThrow();expect(()=>invoicePaymentMinorUnits(invoice,'student',0.001)).toThrow();});
});
