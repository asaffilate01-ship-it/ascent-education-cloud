import {describe,it,expect} from 'vitest';
import {verifyPublicMessageReceipt,publicMessageStatus} from './publicMessageDelivery';
const receipt={ok:true,recorded:true,request_id:'request-a',channel:'admissions',team_accepted:true,receipt_accepted:false,retry_available:true};
describe('public message delivery',()=>{
 it('does not claim mail completion after a partial acknowledgement',()=>{
  const state=verifyPublicMessageReceipt(receipt,'request-a','admissions');
  expect(state.complete).toBe(false);
  expect(publicMessageStatus(state,'admissions')).toContain('confirmation email is not yet confirmed');
  expect(publicMessageStatus(state,'admissions')).toContain('retry the same reference');
 });
 it('rejects wrong request, wrong channel and malformed acceptance',()=>{
  for(const value of [null,{...receipt,request_id:'request-b'},{...receipt,channel:'recruitment'},{...receipt,receipt_accepted:'true'},{...receipt,recorded:false}])expect(()=>verifyPublicMessageReceipt(value,'request-a','admissions')).toThrow();
 });
 it('reports provider acceptance, not inbox delivery',()=>{
  const state=verifyPublicMessageReceipt({...receipt,receipt_accepted:true},'request-a','admissions');
  expect(state.complete).toBe(true);
  expect(publicMessageStatus(state,'admissions')).toContain('accepted for delivery');
 });
});
