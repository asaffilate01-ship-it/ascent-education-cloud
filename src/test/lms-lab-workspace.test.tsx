import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import LMSVirtualLabs from '@/pages/labs/LMSVirtualLabs';
const state=vi.hoisted(()=>({user:{id:'learner',tenantId:'centre',role:'student',roles:['student']},rows:{} as Record<string,unknown[]>,error:'',reads:[] as Promise<unknown>[],rpc:vi.fn(),invoke:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:(...args:unknown[])=>state.invoke(...args)}}}));
vi.mock('@/lib/db',()=>({db:{rpc:(...args:unknown[])=>state.rpc(...args),from:(table:string)=>{
 const builder={select:()=>builder,eq:()=>builder,in:()=>builder,order:()=>builder,limit:()=>builder,
 then:(resolve:(r:unknown)=>unknown,reject:(e:unknown)=>unknown)=>Promise.resolve(table==='lms_lab_offerings'&&state.reads.length?state.reads.shift():{data:state.rows[table]||[],error:table==='lms_lab_offerings'&&state.error?{message:state.error}:null}).then(resolve,reject)};
 return builder;
}}}));
const show=()=>render(<MemoryRouter><LMSVirtualLabs/></MemoryRouter>);
beforeEach(()=>{
 state.user={id:'learner',tenantId:'centre',role:'student',roles:['student']};state.error='';state.reads=[];state.rpc.mockReset().mockResolvedValue({error:null});state.invoke.mockReset().mockResolvedValue({data:{aws_managed_configured:false},error:null});
 state.rows={modules:[{id:'m1',title:'Cloud networking',lecturer_id:'teacher'},{id:'m2',title:'Python development',lecturer_id:'teacher'}],
 lab_templates:[{id:'t1',provider:'aws_managed',module_id:'m1'},{id:'t2',provider:'jupyter',module_id:'m2'}],
 lms_lab_offerings:[{id:'o1',module_id:'m1',template_id:'t1',title:'Private network lab',published:true,launch_enabled:false,modes:['self_study'],session_minutes:60},{id:'o2',module_id:'m2',template_id:'t2',title:'Notebook exercises',published:true,launch_enabled:false,modes:['self_study'],session_minutes:45}],
 lab_sessions:[{id:'s1',student_id:'learner',template_id:'t1',offering_id:'o1',status:'active',expires_at:null,minutes_used:0}],
 lab_tasks:[{id:'task1',template_id:'t1',title:'Create VPC',sequence_no:1},{id:'task2',template_id:'t1',title:'Add subnet',sequence_no:2}]};
});afterEach(()=>{cleanup();vi.clearAllMocks();});
it('finds authorised labs by module/provider and recovers from an empty search',async()=>{
 show();const input=await screen.findByLabelText('Find a lab, module or provider');
 fireEvent.change(input,{target:{value:' Python '}});expect(screen.getByRole('heading',{name:'Notebook exercises'})).toBeInTheDocument();expect(screen.queryByRole('button',{name:/Private network lab/})).toBeNull();
 fireEvent.change(input,{target:{value:'AWS'}});expect(screen.getByRole('heading',{name:'Private network lab'})).toBeInTheDocument();
 fireEvent.change(input,{target:{value:'unknown lab'}});expect(screen.getByText('No course labs match your search.')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Clear lab search'}));expect(input).toHaveFocus();expect(screen.getByText('2 of 2 labs shown')).toBeInTheDocument();
});
it('shows student recovery without exposing schema errors and retries successfully',async()=>{
 state.error="Could not find the table 'public.lms_lab_offerings' in the schema cache";show();
 expect(await screen.findByRole('alert')).toHaveTextContent('awaiting a system update');expect(screen.queryByText(/public.lms_lab_offerings/)).toBeNull();
 expect(screen.getByRole('link',{name:'Contact learning support'})).toHaveAttribute('href','/student/support');
 state.error='';fireEvent.click(screen.getByRole('button',{name:'Retry lab catalogue'}));await screen.findByLabelText('Find a lab, module or provider');expect(screen.queryByRole('alert')).toBeNull();
});
it('keeps generic failure distinct from an empty lab catalogue',async()=>{
 state.error='network failure with internal trace';show();expect(await screen.findByRole('alert')).toHaveTextContent('Check your connection');expect(screen.queryByText(/No practical labs have been published/)).toBeNull();expect(screen.queryByText('network failure with internal trace')).toBeNull();
});
it('keeps evidence notes separate for each exercise and submits only the selected task note',async()=>{
 show();await screen.findByLabelText('Find a lab, module or provider');const fields=screen.getAllByLabelText('Work completed / evidence reference');
 fireEvent.change(fields[0],{target:{value:'VPC evidence one'}});fireEvent.change(fields[1],{target:{value:'Subnet evidence two'}});expect(fields[0]).toHaveValue('VPC evidence one');
 fireEvent.click(screen.getAllByRole('button',{name:'Submit practical evidence note'})[1]);await waitFor(()=>expect(state.rpc).toHaveBeenCalledWith('submit_unipathway_lab_task',{p_session:'s1',p_task:'task2',p_note:'Subnet evidence two'}));
 await waitFor(()=>expect(screen.getAllByLabelText('Work completed / evidence reference')[0]).toHaveValue('VPC evidence one'));expect(screen.getAllByLabelText('Work completed / evidence reference')[1]).toHaveValue('');
});
it('drops old account content and ignores its delayed response after an account switch',async()=>{
 let finish!:(value:unknown)=>void;state.reads=[new Promise(r=>{finish=r;})];const view=show();
 state.user={id:'other',tenantId:'other-centre',role:'student',roles:['student']};state.rows={};view.rerender(<MemoryRouter><LMSVirtualLabs/></MemoryRouter>);
 await screen.findByText(/No practical labs have been published/);await act(async()=>finish({data:[{id:'old',title:'Private old lab'}],error:null}));expect(screen.queryByText('Private old lab')).toBeNull();
});
it('ignores a delayed older refresh after a newer read has succeeded',async()=>{
 show();await screen.findByLabelText('Find a lab, module or provider');let finish!:(value:unknown)=>void;state.reads=[new Promise(r=>{finish=r;})];
 fireEvent.click(screen.getByRole('button',{name:'Refresh labs'}));state.rows.lms_lab_offerings=[];fireEvent.click(screen.getByRole('button',{name:'Refresh labs'}));await screen.findByText(/No practical labs have been published/);
 await act(async()=>finish({data:[{id:'old',module_id:'m1',title:'Stale refresh lab',published:true}],error:null}));expect(screen.queryByText('Stale refresh lab')).toBeNull();
});
it('makes technical recovery details available to authorised staff only',async()=>{
 state.user={id:'teacher',tenantId:'centre',role:'lecturer',roles:['lecturer']};state.error='schema cache missing lab table';show();await screen.findByRole('alert');expect(screen.getByText('Technical details for your administrator')).toBeInTheDocument();expect(screen.getByText('schema cache missing lab table')).toBeInTheDocument();
});
it('retains evidence and re-enables submission when the network rejects the save',async()=>{
 state.rpc.mockRejectedValueOnce(new Error('offline'));show();await screen.findByLabelText('Find a lab, module or provider');
 const field=screen.getAllByLabelText('Work completed / evidence reference')[0];fireEvent.change(field,{target:{value:'Unsaved VPC evidence'}});
 fireEvent.click(screen.getAllByRole('button',{name:'Submit practical evidence note'})[0]);
 await waitFor(()=>expect(screen.getAllByRole('button',{name:'Submit practical evidence note'})[0]).toBeEnabled());expect(field).toHaveValue('Unsaved VPC evidence');
});
it('refreshes provider readiness along with the catalogue',async()=>{
 show();await screen.findByLabelText('Find a lab, module or provider');state.invoke.mockClear();fireEvent.click(screen.getByRole('button',{name:'Refresh labs'}));
 await waitFor(()=>expect(state.invoke).toHaveBeenCalledWith('unipathway-aws-lab-gateway',{body:{action:'readiness'}}));
});
it('keeps tutor feedback separate between learner task reviews',async()=>{
 state.user={id:'teacher',tenantId:'centre',role:'lecturer',roles:['lecturer']};state.rows.lab_task_progress=[{id:'p1',session_id:'s1',task_id:'task1',status:'pending_review',verification_result:{student_note:'First evidence'}},{id:'p2',session_id:'s1',task_id:'task2',status:'pending_review',verification_result:{student_note:'Second evidence'}}];
 show();await screen.findByLabelText('Find a lab, module or provider');const fields=screen.getAllByLabelText('Review feedback');fireEvent.change(fields[0],{target:{value:'VPC checked'}});fireEvent.change(fields[1],{target:{value:'Subnet needs revision'}});expect(fields[0]).toHaveValue('VPC checked');
 fireEvent.click(screen.getAllByRole('button',{name:'Request revision'})[1]);await waitFor(()=>expect(state.rpc).toHaveBeenCalledWith('review_unipathway_lab_task',{p_session:'s1',p_task:'task2',p_approved:false,p_feedback:'Subnet needs revision'}));
});
