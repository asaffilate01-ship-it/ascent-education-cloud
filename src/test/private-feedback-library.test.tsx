import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import FeedbackLibrary from '@/components/assessment/FeedbackLibrary';
const state=vi.hoisted(()=>({user:{id:'marker',tenantId:'centre',role:'assessor'},rows:[] as any[],ranges:[] as number[],reads:[] as any[],write:vi.fn(),remove:vi.fn(),fail:false,load:undefined as undefined|((offset:number,rows:any[])=>Promise<any>)}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user})}));
vi.mock('@/lib/db',()=>({db:{from:()=>{
 const filters:Record<string,string>={};let mutation='read';let payload:any;
 const q:any={select:()=>q,order:()=>q,eq:(k:string,v:string)=>{filters[k]=v;return q;},insert:(v:any)=>{mutation='insert';payload=v;return q;},delete:()=>{mutation='delete';return q;},single:()=>state.write(payload),range:(a:number,b:number)=>{
  state.ranges.push(a);state.reads.push({...filters});const rows=state.rows.filter(r=>Object.entries(filters).every(([k,v])=>r[k]===v));
  return state.load?state.load(a,rows):Promise.resolve(state.fail&&a>=250?{data:null,error:Error('offline')}:{data:rows.slice(a,b+1),error:null});
 },then:(resolve:any)=>Promise.resolve(mutation==='delete'?state.remove({...filters}):{data:[],error:null}).then(resolve)};return q;
}}}));
const phrase=(i:number)=>({id:String(i).padStart(4,'0'),title:`Phrase ${i}`,body:`Generic wording ${i}`,owner_id:'marker',tenant_id:'centre',created_at:`2026-01-${String(1+i%28).padStart(2,'0')}`});
beforeEach(()=>{vi.clearAllMocks();state.user={id:'marker',tenantId:'centre',role:'assessor'};state.rows=[];state.ranges=[];state.reads=[];state.fail=false;state.load=undefined;state.write.mockImplementation(async p=>({data:{...p,id:'new'},error:null}));state.remove.mockResolvedValue({data:[{id:'0001'}],error:null});vi.spyOn(window,'confirm').mockReturnValue(true);});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const mount=(insert=vi.fn().mockReturnValue(true))=>render(<FeedbackLibrary disabled={false} onInsert={insert}/>);
const ready=()=>screen.findByText(/saved in your private library/);
function fill(){fireEvent.change(screen.getByLabelText('Phrase title'),{target:{value:'Comparison'}});fireEvent.change(screen.getByLabelText('Reusable wording'),{target:{value:'Compare the alternatives and explain the result.'}});}
it('loads the complete owner/centre library beyond 200 and displays ten cards per page',async()=>{
 state.rows=Array.from({length:301},(_,i)=>phrase(i));mount();await ready();
 expect(state.ranges).toEqual([0,250]);expect(state.reads.every(r=>r.owner_id==='marker'&&r.tenant_id==='centre')).toBe(true);
 expect(screen.getAllByRole('button',{name:'Insert phrase'})).toHaveLength(10);
 fireEvent.click(screen.getByText('Next phrases'));expect(screen.getByText('Page 2 of 31')).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Find saved feedback'),{target:{value:'  Phrase 300  '}});
 expect(screen.getByText('Phrase 300')).toBeInTheDocument();expect(screen.getByText(/1 matching phrases/)).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Find saved feedback'),{target:{value:'zz-not-found'}});
 expect(screen.getByText(/No saved phrases match/)).toBeInTheDocument();fireEvent.click(screen.getByText('Clear feedback search'));
 expect(screen.getByLabelText('Find saved feedback')).toHaveFocus();expect(screen.getAllByRole('button',{name:'Insert phrase'})).toHaveLength(10);
});
it('fails closed on a later-page error and supports explicit reload',async()=>{
 state.rows=Array.from({length:251},(_,i)=>phrase(i));state.fail=true;mount();await screen.findByRole('alert');
 expect(screen.queryByText('Phrase 0')).toBeNull();expect(screen.queryByText(/No saved phrases yet/)).toBeNull();expect(screen.getByText('Save phrase')).toBeDisabled();
 state.fail=false;fireEvent.click(screen.getByText('Reload feedback library'));await ready();expect(screen.queryByRole('alert')).toBeNull();
});
it('clears unsaved wording, search and old results immediately on account/centre/role changes',async()=>{
 state.rows=[phrase(1)];const view=mount();await ready();fill();fireEvent.change(screen.getByLabelText('Find saved feedback'),{target:{value:'Private'}});
 state.user={id:'other',tenantId:'other-centre',role:'assessor'};view.rerender(<FeedbackLibrary disabled={false} onInsert={()=>true}/>);
 expect(screen.getByLabelText('Phrase title')).toHaveValue('');expect(screen.getByLabelText('Reusable wording')).toHaveValue('');expect(screen.getByLabelText('Find saved feedback')).toHaveValue('');await ready();expect(screen.queryByText('Phrase 1')).toBeNull();
});
it('suppresses a late save after an account switch without clearing the new account draft',async()=>{
 let finish!:(value:any)=>void;state.write.mockReturnValue(new Promise(r=>{finish=r;}));const view=mount();await ready();fill();fireEvent.click(screen.getByText('Save phrase'));await waitFor(()=>expect(state.write).toHaveBeenCalledTimes(1));
 state.user={id:'other',tenantId:'other-centre',role:'assessor'};view.rerender(<FeedbackLibrary disabled={false} onInsert={()=>true}/>);await ready();fill();
 await act(async()=>finish({data:{id:'old',title:'Comparison',body:'Compare the alternatives and explain the result.'},error:null}));
 expect(screen.getByLabelText('Phrase title')).toHaveValue('Comparison');expect(screen.queryByText('Phrase saved to your private library.')).toBeNull();
});
it('requires a matching save receipt and rechecks an uncertain save without automatically duplicating it',async()=>{
 state.write.mockResolvedValue({data:null,error:Error('connection lost')});mount();await ready();fill();fireEvent.click(screen.getByText('Save phrase'));await screen.findByRole('alert');
 expect(screen.getByLabelText('Phrase title')).toHaveValue('Comparison');expect(screen.getByText('Save phrase')).toBeDisabled();expect(screen.queryByText('Phrase saved to your private library.')).toBeNull();
 state.rows=[{...phrase(1),title:'Comparison',body:'Compare the alternatives and explain the result.'}];fireEvent.click(screen.getByText('Reload feedback library'));await ready();
 expect(screen.getByText(/this exact title and wording is already saved/)).toBeInTheDocument();expect(screen.getByText('Save phrase')).toBeDisabled();expect(state.write).toHaveBeenCalledTimes(1);
});
it('shows confirmed creation only for the current account and keeps the original owner binding',async()=>{
 mount();await ready();fill();fireEvent.click(screen.getByText('Save phrase'));fireEvent.click(screen.getByText('Saving change…'));
 await screen.findByText('Phrase saved to your private library.');expect(state.write).toHaveBeenCalledTimes(1);
 expect(state.write).toHaveBeenCalledWith({owner_id:'marker',tenant_id:'centre',title:'Comparison',body:'Compare the alternatives and explain the result.'});expect(screen.getByLabelText('Phrase title')).toHaveValue('');
});
it('keeps phrase insertion distinct from saving or final marking and handles declined insertion',async()=>{
 state.rows=[phrase(1)];const insert=vi.fn().mockReturnValue(false);mount(insert);await ready();fireEvent.click(screen.getByText('Insert phrase'));
 expect(screen.getByText(/Phrase was not inserted/)).toBeInTheDocument();expect(state.write).not.toHaveBeenCalled();insert.mockReturnValue(true);fireEvent.click(screen.getByText('Insert phrase'));expect(screen.getByText(/Tailor it and save the draft/)).toBeInTheDocument();expect(insert).toHaveBeenCalledWith('Generic wording 1');
});
it('scopes deletion to the displayed owner/centre/id and requires its receipt',async()=>{
 state.rows=[phrase(1)];mount();await ready();state.remove.mockResolvedValueOnce({data:[],error:null});fireEvent.click(screen.getByText('Delete phrase'));await screen.findByRole('alert');
 expect(state.remove).toHaveBeenCalledWith({id:'0001',owner_id:'marker',tenant_id:'centre'});expect(screen.queryByText(/Phrase deleted from/)).toBeNull();
 fireEvent.click(screen.getByText('Reload feedback library'));await ready();fireEvent.click(screen.getByText('Delete phrase'));await screen.findByText(/Phrase deleted from your private library/);
});
it('preserves unsaved new wording during a list reload and honours disabled marking state',async()=>{
 state.rows=[phrase(1)];const insert=vi.fn();const view=mount(insert);await ready();fill();fireEvent.click(screen.getByText('Reload feedback library'));await ready();expect(screen.getByLabelText('Reusable wording')).toHaveValue('Compare the alternatives and explain the result.');
 view.rerender(<FeedbackLibrary disabled={true} onInsert={insert}/>);expect(screen.getByText('Insert phrase')).toBeDisabled();expect(screen.getByText('Delete phrase')).toBeDisabled();expect(screen.getByText('Save phrase')).toBeDisabled();
});
