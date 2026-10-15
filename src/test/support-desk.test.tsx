import {render,screen,fireEvent,cleanup,waitFor,act} from '@testing-library/react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({user:{id:'staff-1',tenantId:'centre-1',roles:['admissions_admin']},rows:vi.fn(),single:vi.fn(),update:vi.fn(),eq:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mocks.user})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/lib/workflowRows',()=>({workflowRows:(...args:unknown[])=>mocks.rows(...args)}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>{const chain={select:()=>chain,eq:(...args:unknown[])=>{mocks.eq(...args);return chain;},update:(value:unknown)=>{mocks.update(value);return chain;},maybeSingle:()=>mocks.single()};return chain;}}}));
import SupportDesk from '@/pages/progression/SupportDesk';
import SupportTaskEditor from '@/components/progression/SupportTaskEditor';
import {compareSupportTasks,localDateTime,supportDueValue,taskDueGroup,type SupportTask} from '@/lib/supportDesk';
const makeTask=(id:string,patch:Partial<SupportTask>={}):SupportTask=>({id,tenant_id:'centre-1',application_id:'case-1',owner_id:'staff-1',title:`Task ${id}`,task_type:'arrival',status:'pending',notes:'Use the LMS',due_at:'2020-01-01T12:00:00.123456Z',updated_at:'2026-10-15T12:00:00.123456Z',completed_at:null,created_at:'2026-10-15T12:00:00Z',...patch});
afterEach(cleanup);beforeEach(()=>{vi.clearAllMocks();mocks.user={id:'staff-1',tenantId:'centre-1',roles:['admissions_admin']};mocks.rows.mockImplementation(async(_db,table)=>({data:table==='international_support_tasks'?[makeTask('overdue'),makeTask('closed',{status:'completed'}),makeTask('undated',{due_at:null,owner_id:'someone-else'})]:[{id:'case-1',student_id:'student-1',programme:'Business',destination_country:'UK',status:'offer'}],error:null}));});
it('loads the centre snapshot and filters overdue and creator workload',async()=>{
 render(<SupportDesk/>);await screen.findByText('Task overdue');expect(screen.queryByText('Task closed')).not.toBeInTheDocument();expect(screen.getByText('Task undated')).toBeInTheDocument();
 fireEvent.change(screen.getByRole('combobox',{name:'Deadline'}),{target:{value:'overdue'}});expect(screen.queryByText('Task undated')).not.toBeInTheDocument();
 fireEvent.change(screen.getByRole('combobox',{name:'Deadline'}),{target:{value:'all'}});fireEvent.click(screen.getByRole('checkbox',{name:'Created by me'}));expect(screen.queryByText('Task undated')).not.toBeInTheDocument();expect(mocks.rows.mock.calls.every(args=>args[2]==='centre-1')).toBe(true);
});
it('does not query a staff desk for a learner',()=>{mocks.user.roles=['student'];render(<SupportDesk/>);expect(screen.getByRole('alert')).toHaveTextContent('access is required');expect(mocks.rows).not.toHaveBeenCalled();});
it('blocks partial snapshots if one source fails',async()=>{mocks.rows.mockResolvedValue({data:[],error:{message:'denied'}});render(<SupportDesk/>);expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded completely');expect(screen.queryByRole('textbox',{name:'Search support tasks'})).not.toBeInTheDocument();});
it('retains unsaved instructions after a concurrent edit and uses exact version scope',async()=>{
 mocks.single.mockResolvedValue({data:null,error:null});const saved=vi.fn(),task=makeTask('edit');render(<SupportTaskEditor task={task} onSaved={saved}/>);fireEvent.click(screen.getByRole('button',{name:'Edit task'}));fireEvent.change(screen.getByRole('textbox',{name:'Learner-visible instructions'}),{target:{value:'My unsaved instructions'}});fireEvent.submit(screen.getByRole('button',{name:'Save task changes'}).closest('form')!);
 expect(await screen.findByRole('alert')).toHaveTextContent('task changed');expect(screen.getByRole('textbox',{name:'Learner-visible instructions'})).toHaveValue('My unsaved instructions');expect(saved).not.toHaveBeenCalled();expect(mocks.eq).toHaveBeenCalledWith('updated_at',task.updated_at);expect(mocks.eq).toHaveBeenCalledWith('tenant_id','centre-1');expect(mocks.eq).toHaveBeenCalledWith('application_id','case-1');expect(mocks.update.mock.calls[0][0].due_at).toBe(task.due_at);
});
it('saves title, deadline removal and learner-visible instructions together',async()=>{
 mocks.single.mockResolvedValue({data:{id:'edit'},error:null});const saved=vi.fn();render(<SupportTaskEditor task={makeTask('edit')} onSaved={saved}/>);fireEvent.click(screen.getByRole('button',{name:'Edit task'}));fireEvent.change(screen.getByLabelText('Deadline (your local time)'),{target:{value:''}});fireEvent.change(screen.getByRole('textbox',{name:'Task title'}),{target:{value:'  Updated title  '}});fireEvent.submit(screen.getByRole('button',{name:'Save task changes'}).closest('form')!);await waitFor(()=>expect(saved).toHaveBeenCalledOnce());expect(mocks.update.mock.calls[0][0]).toMatchObject({title:'Updated title',due_at:null,notes:'Use the LMS'});
});
it('classifies urgency without labelling completed tasks overdue and sorts deterministically',()=>{
 const now=Date.parse('2026-10-15T12:00:00Z');expect(taskDueGroup(makeTask('done',{status:'completed'}),now)).toBe('closed');expect(taskDueGroup(makeTask('next',{due_at:'2026-10-22T12:00:00Z'}),now)).toBe('week');expect(taskDueGroup(makeTask('late',{due_at:'2026-10-22T12:00:01Z'}),now)).toBe('later');expect([makeTask('z',{due_at:null}),makeTask('a',{due_at:null})].sort(compareSupportTasks).map(t=>t.id)).toEqual(['a','z']);
});
it('keeps timestamp precision when unchanged and rejects invalid deadline input',()=>{const original='2026-10-15T12:00:00.123456Z';expect(supportDueValue(localDateTime(original),original)).toBe(original);expect(()=>supportDueValue('not a date',original)).toThrow('valid local date');});

it('discards the previous centre snapshot after a tenant switch',async()=>{
 const pending:Array<(value:unknown)=>void>=[];
 mocks.rows.mockImplementation((_db,table,tenant)=>tenant==='centre-1'?new Promise(resolve=>pending.push(resolve)):Promise.resolve({data:table==='international_support_tasks'?[makeTask('new-centre',{tenant_id:'centre-2'})]:[],error:null}));
 const view=render(<SupportDesk/>);mocks.user={...mocks.user,tenantId:'centre-2'};view.rerender(<SupportDesk/>);await screen.findByText('Task new-centre');
 await act(async()=>{pending.forEach(resolve=>resolve({data:[makeTask('old-centre')],error:null}));});
 expect(screen.queryByText('Task old-centre')).not.toBeInTheDocument();expect(screen.getByText('Task new-centre')).toBeInTheDocument();
});
it('opens the selected application plan from the handover queue and moves keyboard focus',async()=>{
 render(<SupportDesk/>);await screen.findByRole('button',{name:'Open support plan for case-1'});fireEvent.click(screen.getByRole('button',{name:'Open support plan for case-1'}));expect(screen.getByRole('combobox',{name:'Application'})).toHaveValue('case-1');expect(screen.getByRole('region',{name:'Selected application support plan'})).toHaveFocus();
});
