import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import CentreFeedbackLibrary from '@/components/assessment/CentreFeedbackLibrary';
const state=vi.hoisted(()=>({user:{id:'assessor',tenantId:'centre',role:'assessor'},rows:[] as any[],reads:[] as any[],rpc:vi.fn(),single:vi.fn(),load:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user})}));
vi.mock('@/lib/db',()=>({db:{rpc:state.rpc,from:(table:string)=>{
 const filters:Record<string,string>={};const q:any={select:()=>q,order:()=>q,eq:(k:string,v:string)=>{filters[k]=v;return q;},range:(a:number,b:number)=>{state.reads.push({table,...filters,a,b});return state.load(a,b);},single:()=>state.single(filters)};return q;
}}}));
const phrase=(id='phrase',status='approved',proposed_by='another')=>({id,tenant_id:'centre',proposed_by,title:`Title ${id}`,body:`Generic wording ${id}`,status,revision:status==='approved'?2:1,created_at:'2026-10-28T10:00:00Z',review_reference:status==='approved'?'Internal review 2026':'',reviewed_by:status==='approved'?'reviewer':null});
beforeEach(()=>{
 state.user={id:'assessor',tenantId:'centre',role:'assessor'};state.rows=[];state.reads=[];state.rpc.mockReset();state.single.mockReset().mockImplementation(async filters=>({data:state.rows.find(x=>Object.entries(filters).every(([k,v])=>x[k]===v)),error:null}));
 state.load.mockReset().mockImplementation(async(a,b)=>({data:state.rows.slice(a,b+1),error:null}));vi.spyOn(window,'confirm').mockReturnValue(true);vi.stubGlobal('crypto',{randomUUID:()=> 'request-1'});
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
const mount=(onInsert=vi.fn().mockReturnValue(true))=>render(<CentreFeedbackLibrary onInsert={onInsert}/>);
async function open(){const details=screen.getByText('Centre feedback catalogue').closest('details')!;details.open=true;fireEvent(details,new Event('toggle'));await screen.findByText(/matching centre phrases/);}
function fill(){fireEvent.change(screen.getByLabelText('Centre phrase title'),{target:{value:'Compare methods'}});fireEvent.change(screen.getByLabelText('Proposed centre wording'),{target:{value:'Compare the alternatives and explain your reasoning.'}});}
it('loads only on demand, reads complete centre pages, searches older phrases and paginates',async()=>{
 state.rows=Array.from({length:301},(_,i)=>phrase(String(i)));mount();expect(state.load).not.toHaveBeenCalled();await open();expect(state.reads.map(r=>r.a)).toEqual([0,250]);expect(state.reads.every(r=>r.tenant_id==='centre')).toBe(true);
 expect(screen.getAllByText('Insert approved wording')).toHaveLength(10);fireEvent.click(screen.getByText('Next centre phrases'));expect(screen.getByText(/page 2 of 31/)).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Find centre feedback'),{target:{value:'  Title 300  '}});expect(screen.getByText('Title 300')).toBeInTheDocument();fireEvent.change(screen.getByLabelText('Find centre feedback'),{target:{value:'missing'}});fireEvent.click(screen.getByText('Clear centre feedback search'));expect(screen.getByLabelText('Find centre feedback')).toHaveFocus();
});
it('submits immutable generic wording with a request id and requires an exact proposal receipt',async()=>{
 state.rpc.mockImplementation(async(_fn,p)=>{const row={...phrase(p.p_request,'proposed','assessor'),title:p.p_title,body:p.p_body};state.rows=[row];return {data:row,error:null};});mount();await open();fill();fireEvent.click(screen.getByText('Submit phrase for IQA review'));
 await screen.findByText(/Proposal submitted for independent IQA review/);expect(state.rpc).toHaveBeenCalledExactlyOnceWith('propose_uni_centre_feedback',{p_request:'request-1',p_title:'Compare methods',p_body:'Compare the alternatives and explain your reasoning.'});expect(screen.getByLabelText('Centre phrase title')).toHaveValue('');
});
it('retains wording and reuses its request id only after an explicit reload when acknowledgement is uncertain',async()=>{
 state.rpc.mockResolvedValue({data:null,error:Error('offline')});mount();await open();fill();fireEvent.click(screen.getByText('Submit phrase for IQA review'));await screen.findByRole('alert');expect(screen.getByLabelText('Centre phrase title')).toHaveValue('Compare methods');expect(screen.getByText('Submit phrase for IQA review')).toBeDisabled();
 fireEvent.click(screen.getByText('Reload centre feedback'));await screen.findByText(/matching centre phrases/);fireEvent.click(screen.getByText('Submit phrase for IQA review'));await screen.findByRole('alert');expect(state.rpc.mock.calls.map(c=>c[1].p_request)).toEqual(['request-1','request-1']);
});
it('fails closed on a later-page read error without presenting a partial catalogue',async()=>{
 state.rows=Array.from({length:251},(_,i)=>phrase(String(i)));state.load.mockImplementation(async(a,b)=>a===0?{data:state.rows.slice(a,b+1),error:null}:{data:null,error:Error('offline')});mount();
 const details=screen.getByText('Centre feedback catalogue').closest('details')!;details.open=true;fireEvent(details,new Event('toggle'));await screen.findByRole('alert');expect(screen.queryByText('Title 0')).toBeNull();expect(screen.queryByText(/No centre phrases match/)).toBeNull();expect(screen.getByText('Submit phrase for IQA review')).toBeDisabled();
});
it('rechecks approval at insertion and does not insert withdrawn or changed wording',async()=>{
 state.rows=[phrase()];const insert=vi.fn().mockReturnValue(false);mount(insert);await open();fireEvent.click(screen.getByText('Insert approved wording'));await screen.findByText(/Wording was not inserted/);expect(state.single).toHaveBeenCalledWith({id:'phrase',tenant_id:'centre',status:'approved'});
 insert.mockReturnValue(true);fireEvent.click(screen.getByText('Insert approved wording'));await screen.findByText(/Approved wording inserted as an unsaved draft edit/);expect(insert).toHaveBeenCalledTimes(2);
 state.single.mockResolvedValue({data:{...phrase(),status:'withdrawn'},error:null});fireEvent.click(screen.getByText('Insert approved wording'));await screen.findByRole('alert');expect(insert).toHaveBeenCalledTimes(2);expect(state.rpc).not.toHaveBeenCalled();
});
it('requires a separate reviewer, an internal reference, confirmation and the expected review revision',async()=>{
 state.user={id:'reviewer',tenantId:'centre',role:'iqa_officer'};state.rows=[phrase('other','proposed'),phrase('self','proposed','reviewer')];mount();await open();expect(screen.queryByLabelText('Centre phrase title')).toBeNull();
 const approve=screen.getAllByText('Approve centre wording');expect(approve.every(b=>(b as HTMLButtonElement).disabled)).toBe(true);
 fireEvent.change(screen.getByLabelText('Internal review reference for Title other'),{target:{value:'Approval record 2026'}});vi.mocked(window.confirm).mockReturnValue(false);fireEvent.click(approve[0]);expect(state.rpc).not.toHaveBeenCalled();
 vi.mocked(window.confirm).mockReturnValue(true);state.rpc.mockResolvedValue({data:{...phrase('other'),revision:99},error:null});fireEvent.click(approve[0]);await screen.findByRole('alert');expect(screen.queryByText(/Centre wording approved/)).toBeNull();
 expect(state.rpc).toHaveBeenCalledExactlyOnceWith('review_uni_centre_feedback',{p_feedback:'other',p_revision:1,p_action:'approve',p_reference:'Approval record 2026'});
 fireEvent.click(screen.getByText('Reload centre feedback'));await screen.findByText('Title other');expect(screen.getByLabelText('Internal review reference for Title other')).toHaveValue('Approval record 2026');
});
it('announces a review only after its exact matching receipt and exposes approved withdrawal',async()=>{
 state.user={id:'reviewer',tenantId:'centre',role:'iqa_officer'};state.rows=[phrase('other','proposed')];state.rpc.mockImplementation(async(_fn,p)=>{const row={...state.rows[0],status:p.p_action==='approve'?'approved':'withdrawn',revision:p.p_revision+1,reviewed_by:'reviewer',review_reference:p.p_reference};state.rows=[row];return {data:row,error:null};});mount();await open();
 fireEvent.change(screen.getByLabelText('Internal review reference for Title other'),{target:{value:'Approval record 2026'}});fireEvent.click(screen.getByText('Approve centre wording'));await screen.findByText(/Centre wording approved/);
 fireEvent.change(screen.getByLabelText('Centre feedback status'),{target:{value:'approved'}});await screen.findByText('Title other');fireEvent.change(screen.getByLabelText('Internal review reference for Title other'),{target:{value:'Withdraw superseded wording'}});fireEvent.click(screen.getByText('Withdraw centre wording'));await screen.findByText(/Centre wording withdrawn/);
});
it('clears form state across account boundaries and suppresses a late proposal receipt',async()=>{
 let finish!:(value:any)=>void;state.rpc.mockReturnValue(new Promise(r=>{finish=r;}));const view=mount();await open();fill();fireEvent.click(screen.getByText('Submit phrase for IQA review'));await waitFor(()=>expect(state.rpc).toHaveBeenCalledTimes(1));
 state.user={id:'other',tenantId:'other-centre',role:'assessor'};view.rerender(<CentreFeedbackLibrary onInsert={()=>true}/>);await open();expect(screen.getByLabelText('Centre phrase title')).toHaveValue('');fill();
 await act(async()=>finish({data:{...phrase('request-1','proposed','assessor'),title:'Compare methods',body:'Compare the alternatives and explain your reasoning.'},error:null}));expect(screen.getByLabelText('Centre phrase title')).toHaveValue('Compare methods');expect(screen.queryByText(/Proposal submitted for independent/)).toBeNull();
});
