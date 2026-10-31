import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
const mock=vi.hoisted(()=>({
 user:{id:'director',tenantId:'centre-a',role:'centre_director'} as any,
 fail:'',queries:[] as {table:string;options:any}[],
 rows:{
  profiles:[
   {user_id:'staff-a',tenant_id:'centre-a',full_name:'Own centre lecturer',email:'a@example.test'},
   {user_id:'staff-b',tenant_id:'centre-b',full_name:'Private other centre',email:'b@example.test'}
  ],
  user_roles:[
   {user_id:'staff-a',role:'lecturer',tenant_id:'centre-a'},
   {user_id:'staff-a',role:'assessor',tenant_id:'centre-a'},
   {user_id:'staff-a',role:'finance_officer',tenant_id:'centre-b'},
   {user_id:'staff-b',role:'lecturer',tenant_id:'centre-b'}
  ],
  modules:[
   {id:'m1',lecturer_id:'staff-a',tenant_id:'centre-a'},
   {id:'m2',lecturer_id:'staff-b',tenant_id:'centre-b'}
  ],
 } as Record<string,Record<string,unknown>[]>,
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mock.user}),ROLE_LABELS:{
 centre_director:'Centre Director',programme_leader:'Programme Leader',lecturer:'Lecturer',
 assessor:'Assessor',finance_officer:'Finance Officer',superadmin:'Super Admin',
}}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/components/ui/DataTable',()=>({default:({data}:any)=><section>{data.map((x:any)=><div key={x.id}>{x.name} — {x.roleLabels} — {x.moduleCount}</div>)}</section>}));
vi.mock('@/components/ui/StatCard',()=>({default:({label,value}:any)=><p>{label}: {value}</p>}));
vi.mock('@/components/modals/AddStaffModal',()=>({default:()=>null}));
vi.mock('@/hooks/useSupabaseQuery',()=>({useSupabaseQuery:(table:string,options:any)=>{
 mock.queries.push({table,options});
 const rows=options.enabled===false?[]:(mock.rows[table]||[]).filter(row=>(options.filters||[]).every((f:any)=>f.operator==='eq'?row[f.column]===f.value:f.operator==='in'?f.value.includes(row[f.column]):true));
 return {data:rows,loading:false,error:mock.fail===table?'unavailable':null,refetch:vi.fn()};
}}));
import StaffManagement from '@/pages/director/StaffManagement';
beforeEach(()=>{mock.queries=[];mock.user={id:'director',tenantId:'centre-a',role:'centre_director'};mock.fail='';});
afterEach(cleanup);
const show=()=>render(<MemoryRouter><StaffManagement/></MemoryRouter>);
it('centre staff directory narrows profiles and modules, then role records by authorised user IDs',()=>{
 show();
 expect(screen.getByText(/Own centre lecturer/)).toBeInTheDocument();
 expect(screen.queryByText(/Private other centre/)).toBeNull();
 expect(screen.queryByText(/Finance Officer/)).toBeNull();
 expect(screen.getByText(/Lecturer, Assessor/)).toBeInTheDocument();
 expect(mock.queries.find(q=>q.table==='profiles')?.options.filters).toContainEqual({column:'tenant_id',operator:'eq',value:'centre-a'});
 expect(mock.queries.find(q=>q.table==='modules')?.options.filters).toContainEqual({column:'tenant_id',operator:'eq',value:'centre-a'});
 expect(mock.queries.find(q=>q.table==='user_roles')?.options.filters).toContainEqual({column:'user_id',operator:'in',value:['staff-a']});
 expect(screen.queryByText(/Active: /)).toBeNull();
});
it('programme leads cannot grant or invite staff from a roster view',()=>{
 mock.user={id:'leader',tenantId:'centre-a',role:'programme_leader'};
 show();expect(screen.queryByRole('button',{name:'Invite or add staff'})).toBeNull();
 expect(screen.getByRole('link',{name:'programme modules'})).toHaveAttribute('href','/programme/modules');
});
it('unassigned staff roles fail closed and do not query the directory',()=>{
 mock.user={id:'student',tenantId:'centre-a',role:'student'};
 show();expect(screen.getByRole('alert')).toHaveTextContent('verified centre leadership or superadmin');
 expect(mock.queries.every(q=>q.options.enabled===false)).toBe(true);
});
it('a denied roles read never becomes an empty verified directory',()=>{
 mock.fail='user_roles';show();
 expect(screen.getByRole('alert')).toHaveTextContent('could not be verified');
 expect(screen.queryByText(/Own centre lecturer/)).toBeNull();
});
