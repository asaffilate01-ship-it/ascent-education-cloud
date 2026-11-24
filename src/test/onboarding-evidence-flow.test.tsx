import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import OnboardingEvidence from '@/components/admissions/OnboardingEvidence';
import {studentEvidence} from '@/lib/onboardingEvidence';
const mock=vi.hoisted(()=>({
 user:{id:'learner',tenantId:'centre',role:'student',roles:['student']} as {id:string;tenantId:string;role:string;roles:string[]},
 rows:[] as Record<string,unknown>[],error:null as string|null,loading:false,
 query:vi.fn(),refetch:vi.fn(),upload:vi.fn(),insert:vi.fn(),remove:vi.fn(),receipt:vi.fn(),
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mock.user,loading:false})}));
vi.mock('@/hooks/useSupabaseQuery',()=>({useSupabaseQuery:(table:string,options:unknown)=>{mock.query(table,options);return {data:mock.rows,error:mock.error,loading:mock.loading,refetch:mock.refetch};}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{
 storage:{from:()=>({upload:mock.upload,remove:mock.remove})},
 from:()=>({insert:(row:unknown)=>{mock.insert(row);return {select:()=>({single:mock.receipt})};}}),
}}));
const own={id:'own',user_id:'learner',tenant_id:'centre',document_type:'passport',status:'pending',created_at:'2026-11-20T09:00:00Z',file_name:'Own identity.pdf',rejection_reason:null};
beforeEach(()=>{vi.clearAllMocks();mock.user={id:'learner',tenantId:'centre',role:'student',roles:['student']};mock.rows=[own];mock.error=null;mock.loading=false;mock.refetch.mockResolvedValue(undefined);mock.upload.mockResolvedValue({error:null});mock.remove.mockResolvedValue({error:null});mock.receipt.mockImplementation(async()=>{const row=mock.insert.mock.calls.at(-1)?.[0];return {error:null,data:{id:row.id,user_id:row.user_id,tenant_id:row.tenant_id,status:'pending'}};});});
afterEach(cleanup);
const mount=()=>render(<OnboardingEvidence kind="student" requirements={studentEvidence}/>);
it('scopes records and keeps submitted and verified counts distinct',()=>{
 mock.rows=[own,{...own,id:'peer',user_id:'other',file_name:'Private peer.pdf'},{...own,id:'foreign',tenant_id:'foreign',file_name:'Foreign centre.pdf'}];
 mount();
 expect(mock.query).toHaveBeenCalledWith('kyc_documents',expect.objectContaining({enabled:true,filters:[{column:'tenant_id',operator:'eq',value:'centre'},{column:'user_id',operator:'eq',value:'learner'}]}));
 expect(screen.getByText('Own identity.pdf')).toBeInTheDocument();
 expect(screen.queryByText('Private peer.pdf')).toBeNull();expect(screen.queryByText('Foreign centre.pdf')).toBeNull();
 expect(screen.getByText('1/3')).toBeInTheDocument();expect(screen.getByText('0/3')).toBeInTheDocument();
 expect(screen.queryByLabelText(/^Upload CNIC/)).toBeNull();
});
it('does not interpret a failed read as missing evidence or enable uploads for an unverified role',()=>{
 mock.error='unavailable';const view=mount();expect(screen.getByRole('alert')).toHaveTextContent('could not be verified');expect(screen.queryByLabelText('Upload Academic transcripts')).toBeNull();
 mock.error=null;mock.user={...mock.user,roles:['lecturer']};view.rerender(<OnboardingEvidence kind="student" requirements={studentEvidence}/>);
 expect(mock.query.mock.calls.at(-1)?.[1]).toMatchObject({enabled:false});expect(screen.queryByText('Own identity.pdf')).toBeNull();
});
it('saves a pending tenant-linked receipt without replacing earlier verified records',async()=>{
 mount();fireEvent.change(screen.getByLabelText('Upload Academic transcripts'),{target:{files:[new File(['example'],'transcript.pdf',{type:'application/pdf'})]}});
 await waitFor(()=>expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({tenant_id:'centre',user_id:'learner',document_type:'transcript',status:'pending',file_name:'transcript.pdf'})));
 expect(mock.upload).toHaveBeenCalledWith(expect.stringMatching(/^learner\/[^/]+\.pdf$/),expect.any(File),{upsert:false});
 expect(await screen.findByText('Document received for verification. It has not yet been approved.')).toBeInTheDocument();
 expect(mock.refetch).toHaveBeenCalledTimes(1);
});
it('rejects invalid files before storage and requires a refresh after an uncertain metadata result',async()=>{
 mount();const input=screen.getByLabelText('Upload Academic transcripts');
 fireEvent.change(input,{target:{files:[new File(['wrong'],'bad.pdf',{type:'text/html'})]}});
 expect(screen.getByRole('alert')).toHaveTextContent('matching file type');expect(mock.upload).not.toHaveBeenCalled();
 mock.receipt.mockResolvedValue({error:{code:'network'},data:null});
 fireEvent.change(input,{target:{files:[new File(['example'],'transcript.pdf',{type:'application/pdf'})]}});
 await screen.findByText(/Document submission could not be confirmed/);
 expect(input).toBeDisabled();expect(mock.remove).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Refresh document records'}));expect(mock.refetch).toHaveBeenCalled();
});
