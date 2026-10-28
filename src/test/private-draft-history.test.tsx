import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import PrivateDraftHistory from '@/components/assessment/PrivateDraftHistory';
const state=vi.hoisted(()=>({user:{id:'marker',tenantId:'centre',role:'assessor'},rows:[] as any[],reads:[] as any[],load:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user})}));
vi.mock('@/lib/db',()=>({db:{from:(table:string)=>{
 const filters:Record<string,string>={};const q:any={select:()=>q,eq:(key:string,value:string)=>{filters[key]=value;return q;},order:()=>q,range:(start:number,end:number)=>{state.reads.push({table,...filters,start,end});return state.load(start,end);}};return q;
}}}));
const snapshot=(revision:number)=>({id:`snapshot-${revision}`,revision,created_at:'2026-10-28T12:00:00Z',feedback:`Saved wording ${revision}`,guidance:'Improve the explanation.',criteria:{A:{code:'A',points:4,reason:'Private unfinished reasoning',evidence:'Document page 2',missing:'Compare methods'}}});
beforeEach(()=>{state.user={id:'marker',tenantId:'centre',role:'assessor'};state.rows=[];state.reads=[];state.load.mockReset().mockImplementation(async(a,b)=>({data:state.rows.slice(a,b+1),error:null}));});
afterEach(cleanup);
const mount=(revision=0)=>render(<PrivateDraftHistory attemptId="attempt" savedRevision={revision}/>);
const open=()=>fireEvent.click(screen.getByText('View private draft history'));
it('loads only on demand with owner, centre, attempt filters and eleven-row lookahead',async()=>{
 state.rows=Array.from({length:12},(_,i)=>snapshot(12-i));mount();expect(state.load).not.toHaveBeenCalled();open();
 await screen.findByText(/Page 1 · showing 10/);expect(state.reads[0]).toEqual({table:'uni_marking_draft_events',attempt_id:'attempt',marker_id:'marker',tenant_id:'centre',start:0,end:10});
 expect(screen.getAllByText(/Draft revision \d/)).toHaveLength(10);
 fireEvent.click(screen.getByText('Older draft revisions'));await screen.findByText(/Page 2 · showing 2/);
 expect(state.reads[1].start).toBe(10);expect(screen.getByText('Older draft revisions')).toBeDisabled();expect(screen.queryByText(/Draft revision 12/)).toBeNull();
 fireEvent.click(screen.getByText('Newer draft revisions'));await screen.findByText(/Page 1 · showing 10/);
});
it('shows saved content separately from uncaptured historical wording and exposes no restore action',async()=>{
 state.rows=[snapshot(2),{...snapshot(1),criteria:null,feedback:null,guidance:null}];mount();open();await screen.findByText(/Page 1/);
 const section=screen.getByLabelText('Private saved draft history');
 expect(within(section).getByText('Saved wording 2')).toBeInTheDocument();expect(within(section).getByText('Document page 2')).toBeInTheDocument();
 expect(screen.getByText(/wording was not captured and cannot be reconstructed/)).toBeInTheDocument();expect(screen.queryByText('Saved wording 1')).toBeNull();expect(screen.queryByRole('button',{name:/restore|submit|copy/i})).toBeNull();
});
it('does not present a failed read as empty and provides explicit retry',async()=>{
 state.load.mockResolvedValue({data:null,error:Error('schema pending')});mount();open();await screen.findByRole('alert');
 expect(screen.queryByText(/No saved revisions/)).toBeNull();state.rows=[snapshot(1)];state.load.mockImplementation(async()=>({data:state.rows,error:null}));
 fireEvent.click(screen.getByText('Refresh draft history'));await screen.findByText(/Draft revision 1/);expect(screen.queryByRole('alert')).toBeNull();
});
it('clears content immediately during account or attempt changes and ignores late responses',async()=>{
 let finish!:(value:any)=>void;state.load.mockReturnValue(new Promise(r=>{finish=r;}));const view=mount();open();await screen.findByText(/Loading your saved draft revisions/);
 state.user={id:'other',tenantId:'elsewhere',role:'assessor'};view.rerender(<PrivateDraftHistory attemptId="another" savedRevision={0}/>);
 expect(screen.getByText('View private draft history')).toHaveAttribute('aria-expanded','false');
 await act(async()=>finish({data:[snapshot(99)],error:null}));expect(screen.queryByText(/Draft revision 99/)).toBeNull();
 state.rows=[];state.load.mockResolvedValue({data:[],error:null});open();await screen.findByText(/No saved revisions/);
 expect(state.reads.at(-1)).toMatchObject({attempt_id:'another',marker_id:'other',tenant_id:'elsewhere'});
});
it('invalidates displayed snapshots while a newly confirmed save is being loaded',async()=>{
 state.rows=[snapshot(1)];const view=mount(1);open();await screen.findByText(/Draft revision 1/);
 let finish!:(value:any)=>void;state.load.mockReturnValue(new Promise(r=>{finish=r;}));view.rerender(<PrivateDraftHistory attemptId="attempt" savedRevision={2}/>);
 expect(screen.queryByText(/Draft revision 1/)).toBeNull();expect(screen.getByLabelText('Private saved draft history')).toHaveAttribute('aria-busy','true');
 await act(async()=>finish({data:[snapshot(2),snapshot(1)],error:null}));await screen.findByText(/Draft revision 2/);
});
it('retains no visible private history after hiding it',async()=>{
 state.rows=[snapshot(1)];mount();open();await screen.findByText(/Draft revision 1/);fireEvent.click(screen.getByText('Hide private draft history'));
 expect(screen.queryByText('Saved wording 1')).toBeNull();await waitFor(()=>expect(screen.getByText('View private draft history')).toHaveAttribute('aria-expanded','false'));
});
