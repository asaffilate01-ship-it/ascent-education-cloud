import {afterAll,afterEach,beforeAll,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
const state=vi.hoisted(()=>({user:{id:'00000000-0000-4000-8000-000000000003',tenantId:'00000000-0000-4000-8000-000000000001',role:'finance_officer',roles:['finance_officer']},rpc:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user,loading:false})}));
vi.mock('@/lib/db',()=>({db:{rpc:state.rpc}}));
vi.mock('@/lib/academicCalendar',()=>({calendarDay:()=> '2026-11-24'}));
let GrossPreparation:typeof import('@/components/finance/GrossPreparation')['default'];
beforeAll(async()=>{vi.stubEnv('VITE_UNIPATHWAY_GROSS_PREPARATION_ENABLED','true');GrossPreparation=(await import('@/components/finance/GrossPreparation')).default;});
afterAll(()=>vi.unstubAllEnvs());afterEach(cleanup);
const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),tenant=id(1),lecturer=id(2),finance=id(3),director=id(4),month='2026-10-01',time='2026-11-24T10:00:00Z',fingerprint='a'.repeat(64);
const row={lecturer_id:lecturer,lecturer_name:'Example lecturer',agreement_id:id(6),basis:'hourly',rate_paisa:100000,resolution:'calculated',sessions:2,minutes:60,gross_paisa:100000};
const summary={tenant_id:tenant,month,currency:'PKR',source_count:2,approved_claims:2,pending_claims:0,rejected_claims:0,unresolved_claims:0,gross_paisa:100000,rows:[row]};
const batch={id:id(7),tenant_id:tenant,month,status:'prepared',fingerprint,prepared_by:finance,prepared_at:time,reviewed_by:null,reviewed_at:null,review_note:null,summary};
const snapshot=(role:string)=>({tenant_id:tenant,role,month,summary,fingerprint,ready:true,contains_own:false,batch:null,batch_current:null,rejected_history:[]});
const success=(data:unknown)=>({data,error:null});
beforeEach(()=>{state.user={id:finance,tenantId:tenant,role:'finance_officer',roles:['finance_officer']};state.rpc.mockReset();});
function open(){const view=render(<GrossPreparation/>);fireEvent.click(screen.getByRole('button',{name:'Open gross preparation'}));fireEvent.click(screen.getByRole('button',{name:'Verify completed month'}));return view;}
it('retains the exact finance request on a failed response and confirms only the returned preparation',async()=>{
 state.rpc.mockImplementation(async(method:string,args:any)=>method==='get_unipathway_gross_preparation'?success(snapshot('finance_officer')):success({...batch,id:args.p_id}));
 open();await screen.findByText('Current calculated gross');
 state.rpc.mockResolvedValueOnce({data:null,error:{message:'offline'}});
 fireEvent.click(screen.getByRole('button',{name:'Prepare gross review batch'}));expect(await screen.findByRole('alert')).toHaveTextContent('Preparation not confirmed');
 fireEvent.click(screen.getByRole('button',{name:'Prepare gross review batch'}));await screen.findByText(/Preparation recorded: prepared/);
 const calls=state.rpc.mock.calls.filter(c=>c[0]==='prepare_unipathway_gross_batch');expect(calls).toHaveLength(2);expect(calls[0]).toEqual(calls[1]);
});
it('allows rejection but not review of changed evidence, and resets the old snapshot after confirmation',async()=>{
 state.user={id:director,tenantId:tenant,role:'centre_director',roles:['centre_director']};
 const next={...snapshot('centre_director'),fingerprint:'b'.repeat(64),batch,batch_current:false};
 state.rpc.mockResolvedValueOnce(success(next)).mockResolvedValueOnce(success({...batch,status:'rejected',reviewed_by:director,reviewed_at:time,review_note:'Source changed'}));
 open();await screen.findByText(/Source has changed since this snapshot/);
 expect(screen.getByRole('option',{name:'Review gross evidence'})).toBeDisabled();
 expect(screen.getByLabelText('Decision')).toHaveValue('rejected');
 fireEvent.change(screen.getByLabelText('Review evidence note'),{target:{value:'Source changed'}});
 fireEvent.click(screen.getByRole('button',{name:'Record independent review'}));await screen.findByText(/Independent review recorded/);
 expect(state.rpc).toHaveBeenCalledWith('review_unipathway_gross_batch',{p_id:batch.id,p_fingerprint:fingerprint,p_decision:'rejected',p_note:'Source changed'});
 expect(screen.queryByText('Stored preparation — prepared')).toBeNull();
});
it('fails closed on an invalid month receipt and clears role-specific state when switching roles',async()=>{
 state.rpc.mockResolvedValueOnce(success({...snapshot('finance_officer'),tenant_id:id(9)}));const view=open();
 expect(await screen.findByRole('alert')).toHaveTextContent('could not be verified');
 expect(screen.queryByText('Current calculated gross')).toBeNull();
 state.user={id:director,tenantId:tenant,role:'centre_director',roles:['centre_director']};view.rerender(<GrossPreparation/>);
 expect(screen.queryByRole('alert')).toBeNull();expect(screen.getByRole('button',{name:'Open gross preparation'})).toHaveAttribute('aria-expanded','false');
});
