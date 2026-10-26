import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {act,render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import CourseworkFiles from '@/components/assessment/CourseworkFiles';
import {courseworkFileError} from '@/lib/courseworkEvidence';
const mock=vi.hoisted(()=>({query:vi.fn(),rpc:vi.fn(),upload:vi.fn(),remove:vi.fn(),download:vi.fn()}));
vi.mock('@/lib/learning/resumableCoursework',()=>({uploadCourseworkResumable:async(...args:any[])=>{const r=await mock.upload(...args);if(r?.error)throw Error('Upload could not be confirmed');},matchesCourseworkReservation:(file:File,row:any)=>file.size===row.byte_size&&file.type===row.mime_type}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'student',tenantId:'centre'}})}));
vi.mock('@/components/native/NativeCapture',()=>({default:()=>null}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{storage:{from:()=>({upload:mock.upload,remove:mock.remove,download:mock.download})}}}));
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

const evidence={id:'upload',file_name:'evidence.pdf',mime_type:'application/pdf',storage_path:'centre/student/upload',byte_size:4,attempt_id:null};
async function selectEvidence(){await screen.findByText('No attachments.');fireEvent.change(screen.getByLabelText('Choose assignment attachment'),{target:{files:[new File(['work'],'evidence.pdf',{type:'application/pdf'})]}});}
it('keeps submission blocked after upload until the new manifest is verified',async()=>{
 let finish!:(v:unknown)=>void;const busy=vi.fn();mock.query.mockResolvedValueOnce({data:[]}).mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));mock.rpc.mockResolvedValue({data:evidence});mock.upload.mockResolvedValue({error:null});
 render(<CourseworkFiles briefId="brief" onBusy={busy}/>);await selectEvidence();busy.mockClear();fireEvent.click(screen.getByText('Upload selected file'));
 await waitFor(()=>expect(mock.query).toHaveBeenCalledTimes(2));expect(busy).not.toHaveBeenCalledWith(false);expect(screen.getByText('Upload selected file')).toBeDisabled();
 await act(async()=>finish({data:[evidence]}));expect(busy).toHaveBeenLastCalledWith(false);expect(screen.getByText(/evidence.pdf ·/)).toBeInTheDocument();
});
it('does not upload a reservation completed after switching assignments',async()=>{
 let finish!:(v:unknown)=>void;mock.rpc.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));const view=render(<CourseworkFiles briefId="old"/>);await selectEvidence();fireEvent.click(screen.getByText('Upload selected file'));
 view.rerender(<CourseworkFiles briefId="new"/>);await screen.findByText('No attachments.');await act(async()=>finish({data:evidence}));expect(mock.upload).not.toHaveBeenCalled();expect(screen.queryByText('Selected: evidence.pdf')).toBeNull();
});
it('does not notify the old form after leaving an in-flight upload',async()=>{
 let finish!:(v:unknown)=>void;const busy=vi.fn(),files=vi.fn();mock.rpc.mockResolvedValue({data:evidence});mock.upload.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
 const view=render(<CourseworkFiles briefId="old" onBusy={busy} onFiles={files}/>);await selectEvidence();fireEvent.click(screen.getByText('Upload selected file'));await waitFor(()=>expect(mock.upload).toHaveBeenCalledTimes(1));view.unmount();busy.mockClear();files.mockClear();
 await act(async()=>finish({error:null}));expect(busy).not.toHaveBeenCalled();expect(files).not.toHaveBeenCalled();expect(mock.query).toHaveBeenCalledTimes(1);
});
it('keeps submission blocked when the post-upload refresh fails and allows retry',async()=>{
 const busy=vi.fn();mock.query.mockResolvedValueOnce({data:[]}).mockResolvedValueOnce({data:null,error:{message:'offline'}}).mockResolvedValue({data:[evidence]});mock.rpc.mockResolvedValue({data:evidence});mock.upload.mockResolvedValue({error:null});
 render(<CourseworkFiles briefId="brief" onBusy={busy}/>);await selectEvidence();busy.mockClear();fireEvent.click(screen.getByText('Upload selected file'));await screen.findByRole('alert');expect(busy).not.toHaveBeenCalledWith(false);
 fireEvent.click(screen.getByText('Refresh attachments'));await screen.findByText(/evidence.pdf ·/);expect(busy).toHaveBeenLastCalledWith(false);
});
it('does not open a private download completed after leaving the evidence screen',async()=>{
 let finish!:(v:unknown)=>void;mock.query.mockResolvedValue({data:[evidence]});mock.download.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
 const view=render(<CourseworkFiles attemptId="attempt"/>);fireEvent.click(await screen.findByText('Download'));view.unmount();await act(async()=>finish({data:new Blob(['private']),error:null}));expect(click).not.toHaveBeenCalled();click.mockRestore();
});

it('rechecks the manifest after an uncertain removal and keeps submission blocked on read failure',async()=>{
 const busy=vi.fn();mock.query.mockResolvedValueOnce({data:[evidence]}).mockResolvedValueOnce({data:null,error:{message:'offline'}}).mockResolvedValue({data:[]});mock.remove.mockResolvedValue({error:{message:'timeout'}});
 render(<CourseworkFiles briefId="brief" onBusy={busy}/>);await screen.findByText(/evidence.pdf ·/);busy.mockClear();fireEvent.click(screen.getByText('Remove'));
 await waitFor(()=>expect(mock.query).toHaveBeenCalledTimes(2));await screen.findByText('Attachments could not be loaded. Retry before submitting.');expect(busy).not.toHaveBeenCalledWith(false);expect(mock.rpc).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText('Refresh attachments'));await screen.findByText('No attachments.');expect(busy).toHaveBeenLastCalledWith(false);
});

it('resumes the selected manifest row without creating a duplicate reservation',async()=>{
 mock.query.mockResolvedValue({data:[evidence]});mock.upload.mockResolvedValue({error:null});
 render(<CourseworkFiles briefId="brief"/>);fireEvent.click(await screen.findByText('Resume with original file'));
 fireEvent.change(screen.getByLabelText('Choose assignment attachment'),{target:{files:[new File(['work'],'evidence.pdf',{type:'application/pdf'})]}});
 fireEvent.click(screen.getByText('Resume upload'));await waitFor(()=>expect(mock.upload).toHaveBeenCalledTimes(1));
 expect(mock.rpc).not.toHaveBeenCalled();expect(mock.upload.mock.calls[0][1]).toEqual(evidence);
});
it('rejects a different sized file before attempting resume',async()=>{
 mock.query.mockResolvedValue({data:[evidence]});render(<CourseworkFiles briefId="brief"/>);
 fireEvent.click(await screen.findByText('Resume with original file'));
 fireEvent.change(screen.getByLabelText('Choose assignment attachment'),{target:{files:[new File(['different'],'evidence.pdf',{type:'application/pdf'})]}});
 fireEvent.click(screen.getByText('Resume upload'));expect(await screen.findByRole('alert')).toHaveTextContent('original file');expect(mock.upload).not.toHaveBeenCalled();
});
