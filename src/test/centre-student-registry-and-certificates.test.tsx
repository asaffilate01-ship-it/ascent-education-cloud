import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {readFileSync} from 'node:fs';

const state=vi.hoisted(()=>({
 user:{id:'director',tenantId:'centre-a',role:'centre_director'} as any,
 fail:'',queries:[] as {table:string;filters:{column:string;value:unknown}[]}[],
 records:{
  student_enrolments:[
   {id:'e1',student_id:'student-a',programme_id:'p1',tenant_id:'centre-a',status:'active',enrolled_at:'2026-10-01'},
   {id:'e2',student_id:'student-b',programme_id:'p2',tenant_id:'centre-b',status:'active',enrolled_at:'2026-10-01'}
  ],
  profiles:[
   {user_id:'student-a',tenant_id:'centre-a',full_name:'Student in my centre',email:'a@example.test'},
   {user_id:'student-b',tenant_id:'centre-b',full_name:'Private other centre',email:'b@example.test'}
  ],
  programmes:[
   {id:'p1',tenant_id:'centre-a',title:'Business'},
   {id:'p2',tenant_id:'centre-b',title:'Another course'}
  ],
  attendance_records:[{student_id:'student-a',tenant_id:'centre-a',status:'present'}],
 } as Record<string,Record<string,unknown>[]>,
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/components/ui/StatCard',()=>({default:({label,value}:any)=><p>{label}: {value}</p>}));
vi.mock('@/components/ui/DataTable',()=>({default:({data}:any)=><div>{data.map((x:any)=><p key={x.id}>{x.name} — {x.programme}</p>)}</div>}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:(table:string)=>{
 const filters:{column:string;value:unknown}[]=[];
 const q:any={
  select:()=>q,
  eq:(column:string,value:unknown)=>{filters.push({column,value});return q;},
  then:(resolve:any,reject:any)=>{
   state.queries.push({table,filters});
   const rows=(state.records[table]||[]).filter(r=>filters.every(f=>r[f.column]===f.value));
   return Promise.resolve(state.fail===table?{data:null,error:{message:'unavailable'}}:{data:rows,error:null}).then(resolve,reject);
  }
 };return q;
}}}));
import StudentManagement from '@/pages/director/StudentManagement';
beforeEach(()=>{state.user={id:'director',tenantId:'centre-a',role:'centre_director'};state.fail='';state.queries=[];});
afterEach(cleanup);
const show=()=>render(<MemoryRouter><StudentManagement/></MemoryRouter>);
it('restricts every management registry query to the verified centre and does not read provisional grades',async()=>{
 show();
 expect(await screen.findByText(/Student in my centre/)).toBeInTheDocument();
 expect(screen.queryByText(/Private other centre/)).toBeNull();
 for(const q of state.queries)expect(q.filters).toContainEqual({column:'tenant_id',value:'centre-a'});
 expect(state.queries.map(q=>q.table).sort()).toEqual(['attendance_records','profiles','programmes','student_enrolments']);
 expect(screen.queryByText(/At Risk/)).toBeNull();
 expect(screen.queryByText(/Generate Certificate/)).toBeNull();
});
it('lecturer gets module-only navigation, not centre-wide student or billing data',async()=>{
 state.user={id:'lecturer',tenantId:'centre-a',role:'lecturer'};
 show();
 expect(screen.getByRole('link',{name:'My assigned modules'})).toHaveAttribute('href','/lecturer/teaching');
 expect(state.queries).toEqual([]);
 expect(screen.queryByText(/Student in my centre/)).toBeNull();
});
it('keeps failed registry queries distinct from empty enrolments and supports a retry',async()=>{
 state.fail='profiles';
 show();
 expect(await screen.findByRole('alert')).toHaveTextContent('could not be verified completely');
 expect(screen.queryByText(/Student in my centre/)).toBeNull();
 expect(screen.getByRole('button',{name:'Retry registry'})).toBeInTheDocument();
});
it('removes the unverified official certificate issuance endpoint and arbitrary certificate form',()=>{
 const endpoint=readFileSync('supabase/functions/generate-certificate/index.ts','utf8');
 const modal=readFileSync('src/components/modals/CertificateDownloadModal.tsx','utf8');
 const registry=readFileSync('src/pages/director/StudentManagement.tsx','utf8');
 expect(endpoint).toContain('UNIPATHWAY_CERTIFICATE_RELEASE_NOT_VERIFIED');
 expect(endpoint).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
 expect(endpoint).not.toContain('Accredited</div>');
 expect(modal).not.toContain('generate-certificate');
 expect(registry).not.toContain('CertificateDownloadModal');
 expect(registry).not.toContain('from(\\'submissions\\')');
});
