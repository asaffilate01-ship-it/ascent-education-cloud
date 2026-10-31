import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {readFileSync} from 'node:fs';
const mock=vi.hoisted(()=>({
 user:{id:'teacher',name:'Teacher',tenantId:'centre-a',role:'lecturer'} as any,
 error:null as string|null,
 calls:[] as {table:string;options:any}[],
 updates:[] as {payload:any;filters:[string,string,any][]}[],
 rows:[
  {id:'own',tenant_id:'centre-a',user_id:'teacher',user_name:'Teacher',leave_type:'annual',reason:'Personal own reason',status:'pending',start_date:'2026-11-02',end_date:'2026-11-03',days_count:2,created_at:'2026-10-30'},
  {id:'peer',tenant_id:'centre-a',user_id:'staff-b',user_name:'Colleague',leave_type:'sick',reason:'Private colleague reason',status:'pending',start_date:'2026-11-02',end_date:'2026-11-04',days_count:3,created_at:'2026-10-29'},
  {id:'foreign',tenant_id:'centre-b',user_id:'staff-c',user_name:'Foreign colleague',leave_type:'personal',reason:'Other centre private reason',status:'pending',start_date:'2026-11-02',end_date:'2026-11-04',days_count:3,created_at:'2026-10-29'},
 ] as any[]
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mock.user})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/components/ui/StatCard',()=>({default:({label,value}:any)=><p>{label}: {value}</p>}));
vi.mock('@/hooks/useSupabaseQuery',()=>({useSupabaseQuery:(table:string,options:any)=>{
 mock.calls.push({table,options});
 const rows=options.enabled===false?[]:mock.rows.filter(r=>(options.filters||[]).every((f:any)=>f.operator!=='eq'||r[f.column]===f.value));
 return {data:rows,loading:false,error:mock.error,refetch:vi.fn()};
}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>({
 insert:async()=>({error:null}),
 update:(payload:any)=>{
  const filters:[string,string,any][]=[];
  const q:any={eq:(field:string,value:any)=>{filters.push(['eq',field,value]);return q;},
   neq:(field:string,value:any)=>{filters.push(['neq',field,value]);return q;},
   select:()=>q,
   maybeSingle:async()=>{mock.updates.push({payload,filters});return {data:{id:'peer'},error:null};}
  };return q;
 }
})}}));
vi.mock('sonner',()=>({toast:{success:vi.fn(),error:vi.fn()}}));
import LeaveManagement from '@/pages/leave/LeaveManagement';
beforeEach(()=>{mock.user={id:'teacher',name:'Teacher',tenantId:'centre-a',role:'lecturer'};mock.error=null;mock.calls=[];mock.updates=[];});
afterEach(()=>{cleanup();vi.clearAllMocks();vi.restoreAllMocks();});
const show=()=>render(<MemoryRouter><LeaveManagement/></MemoryRouter>);
it('staff queries only own leave in assigned centre and does not show a colleague’s health reason',()=>{
 show();
 expect(mock.calls[0].options.filters).toEqual([{column:'tenant_id',operator:'eq',value:'centre-a'},{column:'user_id',operator:'eq',value:'teacher'}]);
 expect(screen.getByText('Personal own reason',{exact:false})).toBeInTheDocument();
 expect(screen.queryByText(/Private colleague reason/)).toBeNull();
 expect(screen.queryByText(/Other centre private reason/)).toBeNull();
 expect(screen.queryByRole('button',{name:/Approve/})).toBeNull();
});
it('director sees only own centre, never approves own request, and constrains colleague decision',async()=>{
 mock.user={id:'teacher',name:'Director',tenantId:'centre-a',role:'centre_director'};
 vi.spyOn(window,'confirm').mockReturnValue(true);
 show();
 expect(mock.calls[0].options.filters).toEqual([{column:'tenant_id',operator:'eq',value:'centre-a'}]);
 expect(screen.getByText(/Private colleague reason/)).toBeInTheDocument();
 expect(screen.queryByText(/Other centre private reason/)).toBeNull();
 expect(screen.getByText(/Your own request requires a different authorised reviewer/)).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Approve Teacher'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Approve Colleague'}));
 await waitFor(()=>expect(mock.updates).toHaveLength(1));
 expect(mock.updates[0].filters).toEqual([
  ['eq','id','peer'],['eq','tenant_id','centre-a'],
  ['eq','status','pending'],['neq','user_id','teacher']
 ]);
});
it('student and employer roles cannot request or view staff leave',()=>{
 mock.user={id:'learner',name:'Learner',tenantId:'centre-a',role:'student'};
 show();
 expect(mock.calls[0].options.enabled).toBe(false);
 expect(screen.queryByText(/Private colleague reason/)).toBeNull();
 expect(screen.getByRole('alert')).toHaveTextContent('authorised staff role');
 expect(screen.queryByRole('button',{name:'Request leave'})).toBeNull();
});
it('reports a failed private read and never shows an empty-success dashboard',()=>{
 mock.error='permission denied';show();
 expect(screen.getByRole('alert')).toHaveTextContent('could not be verified');
 expect(screen.queryByText(/Personal own reason/)).toBeNull();
 expect(screen.getByRole('button',{name:'Retry staff leave'})).toBeInTheDocument();
});
it('does not register a generic signed-in personnel leave page',()=>{
 const app=readFileSync('src/App.tsx','utf8');
 expect(app).toContain('path="/leave" element={<RoleGuard allowed=');
 expect(app).not.toContain('path="/leave" element={<P><LeaveManagement');
});
