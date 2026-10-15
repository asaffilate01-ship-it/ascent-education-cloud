import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({user:{id:'student-1',tenantId:'tenant-1',roles:['student']} as {id:string;tenantId?:string;roles:string[]},writes:[] as unknown[],fail:false}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mocks.user})}));
vi.mock('sonner',()=>({toast:{success:vi.fn(),error:vi.fn()}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:(table:string)=>{
 const chain={select:()=>chain,eq:()=>chain,order:()=>chain,range:async()=>({error:mocks.fail?{message:'unavailable'}:null,data:table==='international_partner_referrals'?[{id:'ref-1',recipient_name:'Example University',route_id:'route-1',status:'draft'}]:table==='international_pathway_routes'?[{id:'route-1',route_name:'Business pathway',review_status:'verified',student_visible:true}]:[]}),update:(values:unknown)=>{mocks.writes.push({table,values});return chain;},single:async()=>({error:null,data:{id:'ref-1'}})};return chain;
}}}));
import PartnerWorkflow from '@/components/progression/PartnerWorkflow';
afterEach(cleanup);
beforeEach(()=>{mocks.user={id:'student-1',tenantId:'tenant-1',roles:['student']};mocks.writes=[];mocks.fail=false;});
describe('Student partner workflow',()=>{
 it('names the recipient and requires affirmative consent',async()=>{
  render(<PartnerWorkflow student/>);await screen.findByText('Recipient: Example University');
  expect(screen.getByRole('checkbox')).toBeRequired();
  expect(screen.queryByRole('button',{name:'Register signed agreement'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('checkbox'));fireEvent.submit(screen.getByRole('button',{name:'Give consent'}).closest('form')!);
  await waitFor(()=>expect(mocks.writes).toHaveLength(1));
  expect(mocks.writes[0]).toMatchObject({table:'international_partner_referrals',values:{status:'consented'}});
 });
 it('surfaces database errors rather than implying successful loading',async()=>{
  mocks.fail=true;render(<PartnerWorkflow student/>);expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
 });
 it('gives admissions next actions and filters without exposing staff consent controls',async()=>{
  mocks.user.roles=['admissions_admin'];render(<PartnerWorkflow/>);await screen.findByText('Recipient: Example University');
  expect(screen.getByText(/Next action: Await learner consent/)).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Give consent'})).not.toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Find learner'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'View case history'})).toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox',{name:'Filter referral status'}),{target:{value:'offer'}});expect(screen.getByRole('status')).toHaveTextContent('No referrals match');
 });
 it('blocks workflow without tenant assignment',()=>{
  mocks.user.tenantId=undefined;render(<PartnerWorkflow student/>);expect(screen.getByRole('alert')).toHaveTextContent('centre assignment');
 });
});
it('combines submission-age filtering with the existing admissions stage controls',async()=>{
 mocks.user.roles=['admissions_admin'];render(<PartnerWorkflow/>);await screen.findByText('Recipient: Example University');fireEvent.change(screen.getByRole('combobox',{name:'Submission age'}),{target:{value:'7'}});expect(screen.getByRole('status')).toHaveTextContent('No referrals match');fireEvent.change(screen.getByRole('combobox',{name:'Submission age'}),{target:{value:'all'}});expect(screen.getByText('Recipient: Example University')).toBeInTheDocument();expect(screen.getByText('1 matching referrals · page 1 of 1')).toBeInTheDocument();
});
