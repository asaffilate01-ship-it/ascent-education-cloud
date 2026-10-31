import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
const mock=vi.hoisted(()=>({
 user:{id:'student-a',tenantId:'centre-a',role:'student'} as {id:string;tenantId:string;role:string},
 queries:[] as {table:string;options:any}[],
 records:[
  {id:'h1',student_id:'student-a',tenant_id:'centre-a',allergies:['Own allergy'],updated_at:'2026-01-01'},
  {id:'h2',student_id:'student-b',tenant_id:'centre-a',allergies:['Private other record'],updated_at:'2026-01-01'},
  {id:'h3',student_id:'student-a',tenant_id:'centre-b',allergies:['Other-centre record'],updated_at:'2026-01-01'},
 ] as any[]
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mock.user})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/hooks/useSupabaseQuery',()=>({useSupabaseQuery:(table:string,options:any)=>{
 mock.queries.push({table,options});
 const data:Record<string,any[]>={health_records:mock.records,
  profiles:[{user_id:'student-a',tenant_id:'centre-a',full_name:'Student A'},
   {user_id:'student-b',tenant_id:'centre-a',full_name:'Student B'},
   {user_id:'cross-centre',tenant_id:'centre-b',full_name:'Cross Centre'}],
  student_enrolments:[{student_id:'student-a',tenant_id:'centre-a',status:'active'},
   {student_id:'student-b',tenant_id:'centre-a',status:'inactive'},
   {student_id:'cross-centre',tenant_id:'centre-b',status:'active'}]
 };
 const rows=options.enabled===false?[]:(data[table]||[]).filter(row=>(options.filters||[]).every((f:any)=>f.operator!=='eq'||row[f.column]===f.value));
 return {data:rows,loading:false,error:null,refetch:vi.fn()};
}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>({upsert:async()=>({error:null})})}}));
import HealthRecords from '@/pages/health/HealthRecords';
beforeEach(()=>{mock.queries=[];mock.user={id:'student-a',tenantId:'centre-a',role:'student'};});
afterEach(cleanup);
const show=()=>render(<MemoryRouter><HealthRecords/></MemoryRouter>);
it('student records query explicitly requires their own ID and centre and does not list other patients',()=>{
 show();
 const q=mock.queries.find(q=>q.table==='health_records')!;
 expect(q.options.filters).toEqual([
  {column:'tenant_id',operator:'eq',value:'centre-a'},
  {column:'student_id',operator:'eq',value:'student-a'}
 ]);
 expect(mock.queries.filter(q=>q.table==='profiles'||q.table==='student_enrolments').every(q=>q.options.enabled===false)).toBe(true);
 expect(screen.getByLabelText('Allergies')).toHaveValue('Own allergy');
 expect(screen.queryByText(/Private other record/)).toBeNull();
 expect(screen.queryByText(/Other-centre record/)).toBeNull();
});
it('welfare role sees only a scoped enrolled-student selector and never preloads every health record',()=>{
 mock.user={id:'welfare',tenantId:'centre-a',role:'welfare_officer'};
 show();
 const q=mock.queries.find(q=>q.table==='health_records')!;
 expect(q.options.enabled).toBe(false);
 expect(screen.getByText(/Select an enrolled student to see their record/)).toBeInTheDocument();
 expect(screen.getByRole('combobox',{name:'Select enrolled student at this centre'})).toBeInTheDocument();
});
it('unsupported active role cannot retrieve health or create a patient record',()=>{
 mock.user={id:'agent',tenantId:'centre-a',role:'agent'};
 show();
 expect(screen.getByRole('alert')).toHaveTextContent('verified student or welfare/centre leadership role');
 expect(mock.queries.find(q=>q.table==='health_records')!.options.enabled).toBe(false);
 expect(screen.queryByRole('button',{name:'Save health record'})).toBeNull();
});
