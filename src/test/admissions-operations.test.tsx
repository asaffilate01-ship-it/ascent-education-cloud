import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({query:vi.fn(),eq:vi.fn(),ilike:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>{
 const chain={select:()=>chain,eq:(...args:unknown[])=>{mocks.eq(...args);return chain;},ilike:(...args:unknown[])=>{mocks.ilike(...args);return chain;},order:()=>chain,limit:()=>mocks.query(),range:()=>mocks.query()};return chain;
}}}));
import LearnerPicker from '@/components/progression/LearnerPicker';
import ReferralHistory from '@/components/progression/ReferralHistory';
import {referralMatches,referralNextAction} from '@/lib/referralQueue';
afterEach(cleanup);beforeEach(()=>{vi.clearAllMocks();});
describe('Admissions operations',()=>{
 it('searches the current centre and submits the selected user ID',async()=>{
  mocks.query.mockResolvedValue({data:[{user_id:'learner-1',full_name:'Aisha',email:'aisha@school.example'}],error:null});
  render(<form aria-label="Application"><LearnerPicker tenant="centre-1"/></form>);
  fireEvent.change(screen.getByRole('textbox',{name:'Learner search'}),{target:{value:'Ai%_'}});fireEvent.click(screen.getByRole('button',{name:'Find learner'}));
  await screen.findByRole('option',{name:'Aisha · aisha@school.example'});
  expect(mocks.eq).toHaveBeenCalledWith('tenant_id','centre-1');expect(mocks.ilike).toHaveBeenCalledWith('full_name','%Ai\\%\\_%');
  fireEvent.change(screen.getByRole('combobox',{name:'Learner'}),{target:{value:'learner-1'}});
  expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('student')).toBe('learner-1');
 });
 it('discards an old centre search after switching centres',async()=>{
  let resolve:(value:unknown)=>void=()=>{};mocks.query.mockReturnValue(new Promise(r=>{resolve=r;}));
  const view=render(<LearnerPicker tenant="centre-1"/>);fireEvent.change(screen.getByRole('textbox'),{target:{value:'Aisha'}});fireEvent.click(screen.getByRole('button',{name:'Find learner'}));
  view.rerender(<LearnerPicker tenant="centre-2"/>);resolve({data:[{user_id:'old',full_name:'Old centre learner',email:'old@example.com'}],error:null});
  await waitFor(()=>expect(screen.getByRole('button',{name:'Find learner'})).toBeEnabled());
  expect(screen.queryByText(/Old centre learner/)).not.toBeInTheDocument();expect(screen.getByRole('combobox',{name:'Learner'})).toHaveValue('');
 });
 it('reports lookup failure without presenting stale results',async()=>{
  mocks.query.mockResolvedValue({data:null,error:{message:'denied'}});render(<LearnerPicker tenant="centre-1"/>);
  fireEvent.change(screen.getByRole('textbox'),{target:{value:'Aisha'}});fireEvent.click(screen.getByRole('button',{name:'Find learner'}));
  expect(await screen.findByRole('status')).toHaveTextContent('could not be searched');
 });
 it('loads case history only on request and scopes both tenant and referral',async()=>{
  mocks.query.mockResolvedValue({data:[{id:'audit-1',action:'UPDATE',old_status:'draft',new_status:'consented',actor_id:'student-1',created_at:'2026-10-15T12:00:00Z'}],error:null});
  render(<ReferralHistory tenant="centre-1" referral="referral-1"/>);expect(mocks.query).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'View case history'}));expect(await screen.findByText('draft → consented')).toBeInTheDocument();
  expect(mocks.eq).toHaveBeenCalledWith('tenant_id','centre-1');expect(mocks.eq).toHaveBeenCalledWith('entity_id','referral-1');expect(mocks.eq).toHaveBeenCalledWith('entity_table','international_partner_referrals');
 });
 it('filters by both stage and provider reference without altering consent semantics',()=>{
  const row={id:'case-1',status:'consented',external_application_ref:'REF-42'};
  expect(referralMatches(row,'London','ref-42','consented')).toBe(true);expect(referralMatches(row,'London','ref-42','draft')).toBe(false);
  expect(referralNextAction('draft')).toContain('Do not share');expect(referralNextAction('withdrawn')).toContain('Sharing consent withdrawn');
 });
});
it('scopes agreement history by centre, entity type and agreement ID',async()=>{
 mocks.query.mockResolvedValue({data:[],error:null});render(<ReferralHistory tenant="centre-1" referral="agreement-1" entityTable="international_partner_agreements"/>);
 fireEvent.click(screen.getByRole('button',{name:'View agreement history'}));await screen.findByText('No recorded history is available.');
 expect(mocks.eq).toHaveBeenCalledWith('tenant_id','centre-1');expect(mocks.eq).toHaveBeenCalledWith('entity_table','international_partner_agreements');expect(mocks.eq).toHaveBeenCalledWith('entity_id','agreement-1');
});
