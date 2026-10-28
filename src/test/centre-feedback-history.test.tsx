import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import CentreFeedbackHistory from '@/components/assessment/CentreFeedbackHistory';
const state=vi.hoisted(()=>({user:{id:'reviewer',tenantId:'centre',role:'iqa_officer'},rows:[] as any[],reads:[] as any[],load:vi.fn(),rpc:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user})}));
vi.mock('@/lib/db',()=>({db:{rpc:state.rpc,from:(table:string)=>{
 const filters:Record<string,string>={};let order:unknown;const q:any={select:()=>q,eq:(k:string,v:string)=>{filters[k]=v;return q;},order:(column:string,options:unknown)=>{order={column,options};return q;},range:(start:number,end:number)=>{state.reads.push({table,...filters,start,end,order});return state.load(start,end);}};return q;
}}}));
const event=(revision:number)=>({id:`event-${revision}`,feedback_id:'phrase',tenant_id:'centre',actor_id:'reviewer',revision,status:revision===1?'proposed':'approved',reference:`Internal reference ${revision}`,created_at:'2026-10-28T10:00:00Z'});
beforeEach(()=>{state.user={id:'reviewer',tenantId:'centre',role:'iqa_officer'};state.rows=[];state.reads=[];state.rpc.mockReset();state.load.mockReset().mockImplementation(async(a,b)=>({data:state.rows.slice(a,b+1),error:null}));});
afterEach(cleanup);
const mount=(revision=1)=>render(<CentreFeedbackHistory feedbackId="phrase" title="Compare methods" revision={revision}/>);
const open=()=>fireEvent.click(screen.getByRole('button',{name:'View decision history for Compare methods'}));
it('loads only when requested with phrase/centre scope and ordered six-row lookahead',async()=>{
 state.rows=Array.from({length:12},(_,i)=>event(12-i));mount(12);expect(state.load).not.toHaveBeenCalled();open();await screen.findByText(/Page 1 · 5 recorded decisions/);
 expect(state.reads[0]).toEqual({table:'uni_centre_feedback_events',feedback_id:'phrase',tenant_id:'centre',start:0,end:5,order:{column:'revision',options:{ascending:false}}});
 expect(within(screen.getByRole('list',{name:'Recorded decisions for Compare methods'})).getAllByRole('listitem')).toHaveLength(5);
 fireEvent.click(screen.getByText('Older decisions'));await screen.findByText(/Page 2 · 5/);expect(screen.queryByText('Revision 12 · approved')).toBeNull();expect(state.reads[1].start).toBe(5);
 fireEvent.click(screen.getByText('Older decisions'));await screen.findByText(/Page 3 · 2/);expect(screen.getByText('Older decisions')).toBeDisabled();fireEvent.click(screen.getByText('Newer decisions'));await screen.findByText(/Page 2 · 5/);expect(state.rpc).not.toHaveBeenCalled();
});
it('shows recorded actors/references safely without treating a historical approval as current permission',async()=>{
 state.rows=[{...event(3),status:'withdrawn',actor_id:'other-staff'},{...event(2),reference:'<script>literal reference</script>'},event(1)];const {container}=mount(3);open();await screen.findByText('Revision 3 · withdrawn');
 expect(screen.getByText(/Historical approval is not current permission/)).toBeInTheDocument();expect(screen.getByText('other-staff')).toBeInTheDocument();expect(screen.getAllByText(/Your account/)).toHaveLength(2);expect(container.querySelector('script')).toBeNull();expect(screen.getByText('Reference: <script>literal reference</script>')).toBeInTheDocument();expect(screen.queryByRole('button',{name:/approve|withdraw|insert/i})).toBeNull();
});
it('keeps a failed or malformed read distinct from a verified empty result and permits retry',async()=>{
 state.load.mockResolvedValue({data:null,error:Error('offline')});mount();open();await screen.findByRole('alert');expect(screen.queryByText(/No recorded decisions/)).toBeNull();
 state.load.mockResolvedValue({data:[],error:null});fireEvent.click(screen.getByText('Refresh decision history'));await screen.findByText(/No recorded decisions are available to this account/);expect(screen.queryByRole('alert')).toBeNull();
});
it('fails closed for malformed rows or records from a different phrase or centre',async()=>{
 state.rows=[{...event(1),tenant_id:'other-centre'}];mount();open();await screen.findByRole('alert');expect(screen.queryByText('Revision 1 · proposed')).toBeNull();
 state.rows=[{...event(1),feedback_id:'another'}];fireEvent.click(screen.getByText('Refresh decision history'));await screen.findByRole('alert');
 state.rows=[{...event(1),status:'invented'}];fireEvent.click(screen.getByText('Refresh decision history'));await screen.findByRole('alert');expect(state.rpc).not.toHaveBeenCalled();
});
it('clears displayed records when revision changes and ignores a late read after account/phrase changes',async()=>{
 state.rows=[event(1)];const view=mount(1);open();await screen.findByText('Revision 1 · proposed');
 let finish!:(value:any)=>void;state.load.mockReturnValue(new Promise(r=>{finish=r;}));view.rerender(<CentreFeedbackHistory feedbackId="phrase" title="Compare methods" revision={2}/>);
 expect(screen.queryByText('Revision 1 · proposed')).toBeNull();expect(screen.getByText('Loading recorded decisions…')).toBeInTheDocument();
 state.user={id:'other',tenantId:'elsewhere',role:'assessor'};view.rerender(<CentreFeedbackHistory feedbackId="another" title="Another wording" revision={1}/>);
 await act(async()=>finish({data:[event(2)],error:null}));expect(screen.queryByText('Revision 2 · approved')).toBeNull();expect(screen.getByRole('button',{name:'View decision history for Another wording'})).toHaveAttribute('aria-expanded','false');
});
it('clears hidden content and makes a fresh read on reopening rather than reusing revoked history',async()=>{
 state.rows=[event(1)];mount();open();await screen.findByText('Revision 1 · proposed');fireEvent.click(screen.getByRole('button',{name:'Hide decision history for Compare methods'}));expect(screen.queryByText('Revision 1 · proposed')).toBeNull();
 state.rows=[];open();await screen.findByText(/No recorded decisions/);await waitFor(()=>expect(state.load).toHaveBeenCalledTimes(2));expect(screen.queryByText('Revision 1 · proposed')).toBeNull();
});
