import {afterAll,afterEach,beforeAll,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
const state=vi.hoisted(()=>({user:{id:'00000000-0000-4000-8000-000000000002',tenantId:'00000000-0000-4000-8000-000000000001',role:'lecturer',roles:['lecturer']},rpc:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user,loading:false})}));
vi.mock('@/lib/db',()=>({db:{rpc:state.rpc}}));
vi.mock('@/lib/academicCalendar',()=>({calendarDay:()=> '2026-11-24',calendarDayLabel:(value:string)=>value}));
let TeachingTimesheets:typeof import('@/components/lecturer/TeachingTimesheets')['default'];
beforeAll(async()=>{vi.stubEnv('VITE_UNIPATHWAY_TEACHING_TIMESHEETS_ENABLED','true');TeachingTimesheets=(await import('@/components/lecturer/TeachingTimesheets')).default;});
afterAll(()=>vi.unstubAllEnvs());afterEach(cleanup);
const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const tenant=id(1),lecturer=id(2),director=id(9),finance=id(10),date='2026-11-24',month='2026-11-01',time='2026-11-24T11:00:00Z';
const slot={schedule_id:id(3),module_id:id(4),module_title:'Mathematics',start_time:'09:00:00',end_time:'09:45:00',updated_at:time,planned_minutes:45};
const claim={id:id(5),tenant_id:tenant,lecturer_id:lecturer,lecturer_name:'Example lecturer',schedule_id:slot.schedule_id,module_id:slot.module_id,module_title:slot.module_title,teaching_date:date,scheduled_start:slot.start_time,scheduled_end:slot.end_time,planned_minutes:45,actual_minutes:40,status:'submitted',revision:1,submitted_at:time,reviewed_at:null,evidence_reference:'Record ABC',review_note:null};
const receipt={id:claim.id,tenant_id:tenant,lecturer_id:lecturer,schedule_id:slot.schedule_id,teaching_date:date,actual_minutes:40,status:'submitted',revision:1};
const success=(data:unknown)=>({data,error:null});
beforeEach(()=>{state.user={id:lecturer,tenantId:tenant,role:'lecturer',roles:['lecturer']};state.rpc.mockReset();});
function open(){const view=render(<TeachingTimesheets/>);fireEvent.click(screen.getByRole('button',{name:'Open timesheets'}));return view;}
it('keeps a failed teaching claim available for an exact retry and acknowledges only the matching receipt',async()=>{
 state.rpc.mockResolvedValueOnce(success({tenant_id:tenant,role:'lecturer',date,slots:[slot]})).mockResolvedValueOnce({data:null,error:{message:'offline'}}).mockResolvedValueOnce(success(receipt));
 open();fireEvent.click(screen.getByRole('button',{name:'Find completed sessions'}));await screen.findByLabelText('Scheduled session');
 fireEvent.change(screen.getByLabelText('Scheduled session'),{target:{value:slot.schedule_id}});
 fireEvent.change(screen.getByLabelText('Actual teaching minutes'),{target:{value:'46'}});
 fireEvent.change(screen.getByLabelText('Evidence reference'),{target:{value:'Record ABC'}});
 expect(screen.getByRole('button',{name:'Submit teaching claim'})).toBeDisabled();
 fireEvent.change(screen.getByLabelText('Actual teaching minutes'),{target:{value:'40'}});
 fireEvent.click(screen.getByRole('button',{name:'Submit teaching claim'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('entries are retained');expect(screen.getByLabelText('Actual teaching minutes')).toHaveValue('40');
 fireEvent.click(screen.getByRole('button',{name:'Submit teaching claim'}));
 await screen.findByText(/Recorded claim: Awaiting review/);
 const calls=state.rpc.mock.calls.filter(c=>c[0]==='submit_unipathway_teaching_timesheet');expect(calls).toHaveLength(2);expect(calls[0]).toEqual(calls[1]);
});
it('allows an independent director review and hides the obsolete monthly snapshot after confirmation',async()=>{
 state.user={id:director,tenantId:tenant,role:'centre_director',roles:['centre_director']};
 state.rpc.mockResolvedValueOnce(success({tenant_id:tenant,role:'centre_director',month,rows:[claim]})).mockResolvedValueOnce(success({...receipt,status:'approved',revision:2}));
 open();fireEvent.click(screen.getByRole('button',{name:'Load teaching month'}));fireEvent.click(await screen.findByRole('button',{name:/Review claim Mathematics/}));
 fireEvent.change(screen.getByLabelText('Independent evidence review note'),{target:{value:'Checked evidence ABC'}});
 fireEvent.click(screen.getByRole('button',{name:'Record teaching review'}));
 await screen.findByText(/Independent teaching review recorded/);
 expect(state.rpc).toHaveBeenCalledWith('review_unipathway_teaching_timesheet',{p_claim:claim.id,p_revision:1,p_decision:'approved',p_note:'Checked evidence ABC'});
 expect(screen.queryByText('Example lecturer')).toBeNull();
});
it('fails closed for a non-approved finance response and resets on a role change',async()=>{
 state.user={id:finance,tenantId:tenant,role:'finance_officer',roles:['finance_officer']};
 state.rpc.mockResolvedValueOnce(success({tenant_id:tenant,role:'finance_officer',month,rows:[claim]}));
 const view=open();fireEvent.click(screen.getByRole('button',{name:'Load teaching month'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('No totals are available');expect(screen.queryByText('Example lecturer')).toBeNull();
 state.user={id:lecturer,tenantId:tenant,role:'lecturer',roles:['lecturer']};view.rerender(<TeachingTimesheets/>);
 expect(screen.queryByRole('alert')).toBeNull();expect(screen.getByRole('button',{name:'Open timesheets'})).toHaveAttribute('aria-expanded','false');
});
