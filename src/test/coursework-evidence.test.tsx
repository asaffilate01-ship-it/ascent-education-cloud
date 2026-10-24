import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import CourseworkFiles from '@/components/assessment/CourseworkFiles';
import {courseworkFileError} from '@/lib/courseworkEvidence';
const mock=vi.hoisted(()=>({query:vi.fn(),rpc:vi.fn(),upload:vi.fn(),remove:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'student',tenantId:'centre'}})}));
vi.mock('@/components/native/NativeCapture',()=>({default:()=>null}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{storage:{from:()=>({upload:mock.upload,remove:mock.remove})}}}));
vi.mock('@/lib/db',()=>({db:{rpc:mock.rpc,from:()=>{const q:Record<string,unknown>={then:(resolve:(value:unknown)=>unknown)=>mock.query().then(resolve)};for(const m of ['select','eq','is','order'])q[m]=()=>q;return q;}}}));
beforeEach(()=>{vi.clearAllMocks();mock.query.mockResolvedValue({data:[]});});afterEach(cleanup);
it('accepts documented formats and rejects empty, oversized and mismatched evidence',()=>{
 expect(courseworkFileError({name:'work.PDF',type:'application/pdf',size:20*1024*1024})).toBeNull();
 for(const file of [{name:'x.pdf',type:'text/html',size:12},{name:'x.png',type:'image/png',size:0},{name:'x.png',type:'image/png',size:20971521}])expect(courseworkFileError(file)).toBeTruthy();
});
it('blocks submission until attachment discovery succeeds and supports recovery',async()=>{
 const busy=vi.fn(),files=vi.fn();mock.query.mockResolvedValueOnce({error:{message:'offline'}}).mockResolvedValue({data:[]});render(<CourseworkFiles briefId="brief" onBusy={busy} onFiles={files}/>);
 await screen.findByRole('alert');expect(busy).not.toHaveBeenCalledWith(false);
 fireEvent.click(screen.getByText('Refresh attachments'));await screen.findByText('No attachments.');expect(busy).toHaveBeenLastCalledWith(false);expect(files).toHaveBeenLastCalledWith([]);
});
it('preserves a failed upload warning while refreshing its reserved manifest',async()=>{
 mock.rpc.mockResolvedValue({data:{id:'upload',storage_path:'centre/student/upload'}});mock.upload.mockResolvedValue({error:{message:'network'}});
 render(<CourseworkFiles briefId="brief"/>);await screen.findByText('No attachments.');fireEvent.change(screen.getByLabelText('Choose assignment attachment'),{target:{files:[new File(['work'],'evidence.pdf',{type:'application/pdf'})]}});
 fireEvent.click(screen.getByText('Upload selected file'));await screen.findByRole('alert');await waitFor(()=>expect(mock.query).toHaveBeenCalledTimes(2));expect(screen.getByRole('alert')).toHaveTextContent('Upload could not be confirmed');
});
it('never offers removal or upload controls for submitted evidence',async()=>{
 mock.query.mockResolvedValue({data:[{id:'f',file_name:'evidence.pdf',storage_path:'private',byte_size:120,attempt_id:'attempt'}]});render(<CourseworkFiles attemptId="attempt"/>);await screen.findByText(/evidence.pdf/);expect(screen.queryByText('Remove')).toBeNull();expect(screen.queryByLabelText('Choose assignment attachment')).toBeNull();
});
