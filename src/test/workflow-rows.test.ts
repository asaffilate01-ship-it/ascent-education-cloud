import {describe,it,expect,vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import {workflowRows} from '@/lib/workflowRows';
function client(pages:unknown[]){const range=vi.fn();for(const page of pages)range.mockResolvedValueOnce(page);const chain={select:()=>chain,eq:()=>chain,order:()=>chain,range};return {db:{from:()=>chain} as unknown as SupabaseClient,range};}
describe('Complete workflow snapshots',()=>{
 it('reads beyond the first page with stable ranges',async()=>{
  const {db,range}=client([{data:Array.from({length:250},(_,id)=>({id})),error:null},{data:[{id:250}],error:null}]);
  const result=await workflowRows(db,'international_partner_referrals','centre',()=>true);
  expect(result.data).toHaveLength(251);expect(range.mock.calls).toEqual([[0,249],[250,499]]);
 });
 it('discards a partial snapshot if a later page fails',async()=>{
  const {db}=client([{data:Array.from({length:250},(_,id)=>({id})),error:null},{data:null,error:{message:'unavailable'}}]);
  const result=await workflowRows(db,'international_partner_referrals','centre',()=>true);expect(result.data).toEqual([]);expect(result.error).toBeTruthy();
 });
 it('does not continue a stale centre request',async()=>{
  const {db,range}=client([]);expect((await workflowRows(db,'international_partner_referrals','centre',()=>false)).data).toEqual([]);expect(range).not.toHaveBeenCalled();
 });
});
