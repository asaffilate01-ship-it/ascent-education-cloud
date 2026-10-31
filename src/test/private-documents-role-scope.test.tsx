import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {readFileSync} from 'node:fs';
const mock=vi.hoisted(()=>({
 user:{id:'student-a',tenantId:'centre-a',role:'student',roles:['student']} as any,
 error:null as string|null,
 calls:[] as {table:string;options:any}[],
 documents:[
  {id:'own',tenant_id:'centre-a',user_id:'student-a',document_type:'passport',file_name:'Own identity',file_url:'student-a/file',status:'pending',created_at:'2026-10-01'},
  {id:'peer',tenant_id:'centre-a',user_id:'student-b',document_type:'passport',file_name:'Peer identity',file_url:'student-b/file',status:'verified',created_at:'2026-10-01'},
  {id:'foreign',tenant_id:'centre-b',user_id:'student-a',document_type:'passport',file_name:'Foreign centre identity',file_url:'student-a/foreign',status:'pending',created_at:'2026-10-01'}
 ] as any[],
 signatures:[
  {id:'s1',tenant_id:'centre-a',user_id:'student-a',document_type:'own-agreement',signed_at:'2026-10-01'},
  {id:'s2',tenant_id:'centre-a',user_id:'student-b',document_type:'private-peer-agreement',signed_at:'2026-10-01'}
 ] as any[]
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mock.user})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/hooks/useSupabaseQuery',()=>({useSupabaseQuery:(table:string,options:any)=>{
 mock.calls.push({table,options});
 const entries=table==='kyc_documents'?mock.documents:mock.signatures;
 const data=options.enabled===false?[]:entries.filter(row=>(options.filters||[]).every((f:any)=>f.operator!=='eq'||row[f.column]===f.value));
 return {data,loading:false,error:mock.error,refetch:vi.fn()};
}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{storage:{from:()=>({upload:async()=>({error:null}),remove:async()=>({error:null}),createSignedUrl:async()=>({error:null,data:{signedUrl:'https://example.test/private'}})})},from:()=>({insert:async()=>({error:null})})}}));
vi.mock('sonner',()=>({toast:{success:vi.fn(),error:vi.fn()}}));
import DocumentManagement from '@/pages/documents/DocumentManagement';
beforeEach(()=>{mock.user={id:'student-a',tenantId:'centre-a',role:'student',roles:['student']};mock.error=null;mock.calls=[];});
afterEach(cleanup);
const show=()=>render(<MemoryRouter><DocumentManagement/></MemoryRouter>);
it('scopes both KYC records and signatures to the student account and centre',()=>{
 show();
 for(const call of mock.calls)expect(call.options.filters).toEqual([
  {column:'tenant_id',operator:'eq',value:'centre-a'},
  {column:'user_id',operator:'eq',value:'student-a'}
 ]);
 expect(screen.getByText('Own identity')).toBeInTheDocument();
 expect(screen.queryByText('Peer identity')).toBeNull();
 expect(screen.queryByText('Foreign centre identity')).toBeNull();
 expect(screen.getByText('1 authorised records match this view.')).toBeInTheDocument();
});
it('staff queries the selected centre only, never centre-wide unscoped records',()=>{
 mock.user={id:'admin',tenantId:'centre-a',role:'admissions_admin',roles:['admissions_admin']};
 show();
 expect(mock.calls.every(c=>c.options.filters.some((f:any)=>f.column==='tenant_id'&&f.value==='centre-a'))).toBe(true);
 expect(screen.getByText('Own identity')).toBeInTheDocument();
 expect(screen.getByText('Peer identity')).toBeInTheDocument();
 expect(screen.queryByText('Foreign centre identity')).toBeNull();
});
it('forbids unsupported roles and fails closed on an unavailable private data source',()=>{
 mock.user={id:'agent',tenantId:'centre-a',role:'agent',roles:['agent']};
 const v=show();
 expect(screen.getByRole('alert')).toHaveTextContent('verified student, admissions or centre leadership role');
 expect(mock.calls.every(c=>c.options.enabled===false)).toBe(true);
 expect(screen.queryByText('Own identity')).toBeNull();
 v.unmount();
 mock.user={id:'student-a',tenantId:'centre-a',role:'student',roles:['student']};mock.error='offline';
 show();
 expect(screen.getByRole('alert')).toHaveTextContent('could not be verified');
 expect(screen.queryByText('Own identity')).toBeNull();
});
it('does not expose the private document workspace through a generic authenticated route',()=>{
 const app=readFileSync('src/App.tsx','utf8');
 expect(app).toContain('path="/documents" element={<RoleGuard allowed=');
 expect(app).not.toContain('path="/documents" element={<P><DocumentManagement');
});
