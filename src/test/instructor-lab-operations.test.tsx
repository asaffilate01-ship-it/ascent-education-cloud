import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import LabInstructorPlanner from '@/pages/labs/LabInstructorPlanner';
import {instructorLabAccess,instructorLabCost,instructorLabWindow,instructorFeedbackConfirmed} from '@/lib/instructorLabOperations';
import type {UserRole} from '@/types/platform';

const mock=vi.hoisted(()=>({
 user:{id:'lecturer-a',tenantId:'centre-a',role:'lecturer' as UserRole,roles:['lecturer'] as UserRole[]},
 rows:{} as Record<string,Record<string,unknown>[]>,receipt:null as Record<string,unknown>|null,
 calls:[] as {table:string;column:string;value:unknown}[],
 rpc:vi.fn(),success:vi.fn(),error:vi.fn(),
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mock.user})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('sonner',()=>({toast:{success:mock.success,error:mock.error}}));
vi.mock('@/lib/db',()=>({db:{rpc:mock.rpc,from:(table:string)=>{
 const filters:((row:Record<string,unknown>)=>boolean)[]=[];
 const builder={
  select:()=>builder,
  eq:(column:string,value:unknown)=>{mock.calls.push({table,column,value});filters.push(row=>row[column]===value);return builder;},
  in:(column:string,values:unknown[])=>{filters.push(row=>values.includes(row[column]));return builder;},
  order:()=>builder,
  range:async(from:number,to:number)=>({data:(mock.rows[table]||[]).filter(row=>filters.every(test=>test(row))).slice(from,to+1),error:null}),
  single:async()=>({data:mock.receipt,error:null}),
 };
 return builder;
}}}));
const note=(id:string,changes:Record<string,unknown>={})=>({id,tenant_id:'centre-a',student_id:'student-a',template_id:'lab-a',task_id:'task-a',notes:'Networking evidence '+id,status:'submitted',updated_at:'2026-11-28T10:00:00Z',...changes});
const expected={id:'note-1',tenant:'centre-a',student:'student-a',referenceKey:'template_id' as const,reference:'lab-a',status:'reviewed' as const,authorKey:'reviewer_id' as const,author:'lecturer-a',textKey:'reviewer_feedback' as const,text:'Well documented'};
const receipt=()=>({...note('note-1'),status:'reviewed',reviewer_id:'lecturer-a',reviewer_feedback:'Well documented'});
beforeEach(()=>{
 mock.user={id:'lecturer-a',tenantId:'centre-a',role:'lecturer',roles:['lecturer']};
 mock.calls=[];mock.receipt=null;mock.rpc.mockReset().mockResolvedValue({data:null,error:null});mock.success.mockClear();mock.error.mockClear();
 mock.rows={
  modules:[{id:'module-a',tenant_id:'centre-a',title:'Cloud networking',lecturer_id:'lecturer-a'},{id:'module-b',tenant_id:'centre-a',title:'Other module',lecturer_id:'lecturer-b'}],
  lab_templates:[{id:'lab-a',tenant_id:'centre-a',module_id:'module-a',title:'Network lab',published:true,active:true,provider:'aws_academy',access_mode:'both',duration_minutes:90}],
  unipathway_lab_task_notes:[note('note-1')],
 };
});
afterEach(cleanup);
const show=()=>render(<MemoryRouter><LabInstructorPlanner/></MemoryRouter>);
describe('instructor lab operations',()=>{
 it('uses the active role rather than manager memberships from another workspace',()=>{
  expect(instructorLabAccess({...mock.user,roles:['lecturer','centre_director']})).toEqual({authorised:true,manager:false});
  expect(instructorLabAccess({...mock.user,role:'student',roles:['student','superadmin']})).toEqual({authorised:false,manager:false});
  expect(instructorLabAccess({...mock.user,role:'superadmin',roles:['superadmin'],tenantId:undefined})).toEqual({authorised:false,manager:false});
  expect(instructorLabAccess({...mock.user,role:'programme_leader',roles:['programme_leader']})).toEqual({authorised:true,manager:true});
 });
 it('rejects invalid costs and impossible or reversed class time windows',()=>{
  expect(instructorLabCost('','jupyter')).toBe(0);
  expect(instructorLabCost('2.75','aws_managed')).toBe(2.75);
  for(const value of ['','0','NaN','Infinity','-1','501'])expect(instructorLabCost(value,'aws_managed')).toBeNull();
  expect(instructorLabWindow('2026-11-28T10:00','2026-11-28T11:30')).not.toBeNull();
  expect(instructorLabWindow('2026-02-30T10:00','2026-03-03T10:00')).toBeNull();
  expect(instructorLabWindow('2026-11-28T11:00','2026-11-28T10:00')).toBeNull();
  expect(instructorLabWindow('2026-11-28T10:00Z','2026-11-28T11:00Z')).toBeNull();
 });
 it('requires an exact review record, reviewer and feedback before reporting success',()=>{
  expect(instructorFeedbackConfirmed(receipt(),expected)).toBe(true);
  for(const patch of [{tenant_id:'centre-b'},{student_id:'student-b'},{reviewer_id:'other'},{status:'submitted'},{reviewer_feedback:'different'},{template_id:'lab-b'}])expect(instructorFeedbackConfirmed({...receipt(),...patch},expected)).toBe(false);
 });
 it('loads all assigned pending evidence beyond the old 150-row cap and preserves totals when searching',async()=>{
  mock.rows.unipathway_lab_task_notes=Array.from({length:251},(_,i)=>note('note-'+i));
  show();
  expect(await screen.findByRole('heading',{name:'Practical evidence awaiting tutor review (251)'})).toBeInTheDocument();
  expect(mock.calls).toContainEqual({table:'modules',column:'lecturer_id',value:'lecturer-a'});
  expect(screen.queryByRole('option',{name:'Other module'})).toBeNull();
  fireEvent.change(screen.getByLabelText('Search learner reference, lab or notes'),{target:{value:'note-250'}});
  expect(screen.getByText('Networking evidence note-250')).toBeInTheDocument();
  expect(screen.queryByText('Networking evidence note-0')).toBeNull();
  expect(screen.getByText('1 of 251 evidence notes · 0 of 0 support requests match.')).toBeInTheDocument();
 });
 it('retains feedback after a mismatched receipt and blocks retry until refresh',async()=>{
  mock.receipt={...receipt(),reviewer_id:'other'};
  show();const field=await screen.findByLabelText('Feedback for evidence note-1');
  fireEvent.change(field,{target:{value:'Well documented'}});
  fireEvent.click(screen.getByRole('button',{name:'Save feedback'}));
  await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('not confirmed'));
  expect(field).toHaveValue('Well documented');
  expect(screen.getByRole('button',{name:'Save feedback'})).toBeDisabled();
  expect(mock.success).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Refresh assigned lab records'}));
  const refreshed=await screen.findByLabelText('Feedback for evidence note-1');
  expect(refreshed).toHaveValue('Well documented');
  mock.receipt=receipt();
  mock.rpc.mockImplementationOnce(async()=>{mock.rows.unipathway_lab_task_notes=[receipt()];return {data:null,error:null};});
  fireEvent.click(screen.getByRole('button',{name:'Save feedback'}));
  await waitFor(()=>expect(mock.success).toHaveBeenCalledWith('Practice evidence reviewed (no grade released).'));
  expect(screen.getByRole('heading',{name:'Practical evidence awaiting tutor review (0)'})).toBeInTheDocument();
 });
});
