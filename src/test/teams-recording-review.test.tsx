import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
import TeamsRecordingStatus from '@/components/classroom/TeamsRecordingStatus';
const mock=vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn(),sign:vi.fn(),status:'draft'}));
vi.mock('@/lib/db',()=>({db:mock}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{storage:{from:()=>({createSignedUrl:mock.sign})}}}));
beforeEach(()=>{vi.clearAllMocks();mock.status='draft';mock.rpc.mockResolvedValue({error:null});mock.from.mockImplementation((table:string)=>{
 const result=()=>({data:table==='live_class_artifacts'?[{id:'recording',artifact_type:'recording',publication_status:mock.status,storage_reference:'tenant/class/file.mp4',available_at:null}]:null});
 const q={select:()=>q,eq:()=>q,in:()=>q,order:()=>q,limit:()=>Promise.resolve(result()),maybeSingle:()=>Promise.resolve(result())};return q;
});});
afterEach(cleanup);
const mount=(manager=true)=>render(<MemoryRouter><TeamsRecordingStatus sessionId="class" manager={manager}/></MemoryRouter>);
it('requires approval before offering release',async()=>{mount();fireEvent.click(await screen.findByText('Confirm review'));expect(mock.rpc).toHaveBeenCalledWith('review_unipathway_recording',{p_artifact:'recording',p_expected:'draft',p_status:'approved'});expect(screen.queryByText('Release to students')).toBeNull();await screen.findByText(/Review approved/);});
it('uses the expected state for release',async()=>{mock.status='approved';mount();fireEvent.click(await screen.findByText('Release to students'));expect(mock.rpc).toHaveBeenCalledWith('review_unipathway_recording',expect.objectContaining({p_expected:'approved',p_status:'published'}));await screen.findByText('Released to authorised students.');});
it('does not report a failed release as success',async()=>{mock.status='approved';mock.rpc.mockResolvedValue({error:{message:'denied'}});mount();fireEvent.click(await screen.findByText('Release to students'));await screen.findByRole('alert');expect(screen.queryByText('Released to authorised students.')).toBeNull();});
it('keeps transfer and review controls off the learner view',async()=>{mount(false);await screen.findByText('recording: Not available for playback');expect(screen.queryByText('Retrieve Teams recordings')).toBeNull();expect(screen.queryByText('Confirm review')).toBeNull();});
it('requests retrieval without claiming to start recording',async()=>{mount();fireEvent.click(await screen.findByText('Retrieve Teams recordings'));await screen.findByText(/A configured server worker must process it/);expect(mock.rpc).toHaveBeenCalledWith('request_unipathway_recordings',{p_session:'class'});});
