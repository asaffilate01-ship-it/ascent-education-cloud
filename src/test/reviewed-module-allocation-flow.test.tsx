import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import ReviewedModuleAllocation from '@/components/admissions/ReviewedModuleAllocation';
const mock=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/db',()=>({db:{rpc:mock.rpc}}));
const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),tenant=id(1),moduleId=id(2),lecturer=id(3),uid=id(4),review=id(5),time='2026-11-25T05:00:00Z';
const scope={module_id:moduleId,programme_id:id(6),module_title:'Mathematics',module_code:'M1',programme_title:'A Level',level:'3',awarding_body:'Cambridge'};
const evidence={id:review,slot:1,subject:'Mathematics',framework:'Cambridge',maximum_level:'A Level',reviewed_at:time};
const context=(target:string|null=null,writes=true)=>({tenant_id:tenant,module_id:moduleId,current_lecturer:null,updated_at:time,module_scope:scope,people:[{id:lecturer,name:'Example lecturer'}],selected_lecturer:target,reviews:target?[evidence]:[],latest_decision:null,decision_current:false,writes_enabled:writes});
const success=(data:unknown)=>({error:null,data});
beforeEach(()=>{mock.rpc.mockReset();});afterEach(cleanup);
function open(onSaved=vi.fn()){render(<ReviewedModuleAllocation uid={uid} tenant={tenant} moduleId={moduleId} onSaved={onSaved}/>);fireEvent.click(screen.getByRole('button',{name:'Open allocation review'}));fireEvent.click(screen.getByRole('button',{name:'Load module and eligible lecturers'}));return onSaved;}
async function selectEvidence(){await screen.findByLabelText('Lecturer for reviewed allocation');fireEvent.change(screen.getByLabelText('Lecturer for reviewed allocation'),{target:{value:lecturer}});fireEvent.click(await screen.findByRole('radio',{name:/Mathematics.*Cambridge/}));fireEvent.change(screen.getByLabelText('Module-specific academic fit and evidence reference'),{target:{value:'Reviewed module specification reference'}});}
it('requires current evidence, explicit confirmation and exact retry before acknowledging a reviewed assignment',async()=>{
 mock.rpc.mockImplementation(async(method:string,args:any)=>method==='get_unipathway_reviewed_allocation'?success(context(args.p_lecturer)):success({id:args.p_id,tenant_id:tenant,module_id:moduleId,previous_lecturer:null,lecturer_id:lecturer,review_id:review,module_scope:scope,recorded_by:uid,recorded_at:time}));
 const saved=open();await selectEvidence();
 expect(screen.getByRole('button',{name:'Record reviewed assignment'})).toBeDisabled();
 fireEvent.click(screen.getByRole('checkbox',{name:/I have independently checked/}));
 mock.rpc.mockResolvedValueOnce({data:null,error:{message:'offline'}});
 fireEvent.click(screen.getByRole('button',{name:'Record reviewed assignment'}));expect(await screen.findByRole('alert')).toHaveTextContent('Allocation was not confirmed');expect(saved).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Record reviewed assignment'}));await screen.findByText(/Reviewed allocation recorded/);
 const writes=mock.rpc.mock.calls.filter(c=>c[0]==='record_unipathway_reviewed_allocation');expect(writes).toHaveLength(2);expect(writes[0]).toEqual(writes[1]);expect(saved).toHaveBeenCalledTimes(1);
});
it('keeps a read-only activation from recording an allocation',async()=>{
 mock.rpc.mockImplementation(async(_method:string,args:any)=>success(context(args.p_lecturer,false)));
 open();await selectEvidence();fireEvent.click(screen.getByRole('checkbox',{name:/I have independently checked/}));
 expect(screen.getByRole('button',{name:'Record reviewed assignment'})).toBeDisabled();
 expect(screen.getByText(/Read-only review/)).toBeInTheDocument();
 expect(mock.rpc.mock.calls.every(c=>c[0]==='get_unipathway_reviewed_allocation')).toBe(true);
});
it('does not show a mismatched centre response',async()=>{
 mock.rpc.mockResolvedValue(success({...context(),tenant_id:id(9)}));open();expect(await screen.findByRole('alert')).toHaveTextContent('could not be verified');expect(screen.queryByLabelText('Lecturer for reviewed allocation')).toBeNull();
});