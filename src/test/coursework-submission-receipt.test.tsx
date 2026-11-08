import {useEffect,useRef,type ReactNode} from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {MemoryRouter,useNavigate} from 'react-router-dom';
import StudentCoursework from '@/pages/student/StudentCoursework';

type Row=Record<string,unknown>;
type Response={data:unknown;error:unknown};
const ids={student:'10000000-0000-4000-8000-000000000001',tenant:'10000000-0000-4000-8000-000000000002',module:'10000000-0000-4000-8000-000000000003',programme:'10000000-0000-4000-8000-000000000004',brief:'10000000-0000-4000-8000-000000000005',attempt:'10000000-0000-4000-8000-000000000006',file:'10000000-0000-4000-8000-000000000007',laterFile:'10000000-0000-4000-8000-000000000008'};
const original='My own reviewed evidence explains the method, calculations and reasoned conclusions.';
const later='My later draft changes the analysis after the first submission was sent.';
const mock=vi.hoisted(()=>({tables:{} as Record<string,Row[]>,user:{id:'',tenantId:'',role:'student',roles:['student']},authLoading:false,fail:'',rpc:vi.fn(),single:vi.fn(),toast:vi.fn(),files:[] as string[],fileChange:null as null|((ids:string[])=>void),reads:[] as {table:string;filters:Record<string,unknown>;single:boolean}[]}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mock.user,loading:mock.authLoading})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:ReactNode})=><main>{children}</main>}));
vi.mock('@/components/assessment/ModuleJourney',()=>({default:()=>null}));
vi.mock('@/components/assessment/SubmittedResponse',()=>({default:()=>null}));
vi.mock('sonner',()=>({toast:{error:mock.toast}}));
vi.mock('@/components/assessment/CourseworkFiles',()=>({default:function MockCourseworkFiles({briefId,disabled,onFiles,onBusy}:{briefId?:string;disabled?:boolean;onFiles?:(ids:string[])=>void;onBusy?:(busy:boolean)=>void}){
 const callbacks=useRef({onFiles,onBusy});callbacks.current={onFiles,onBusy};
 useEffect(()=>{if(briefId){mock.fileChange=callbacks.current.onFiles||null;callbacks.current.onFiles?.([...mock.files]);callbacks.current.onBusy?.(false);}},[briefId]);
 return briefId?<button disabled={disabled}>Manage attachments</button>:null;
}}));
vi.mock('@/lib/db',()=>({db:{rpc:(...args:unknown[])=>mock.rpc(...args),from:(table:string)=>{
 let data=mock.tables[table]||[];const filters:Record<string,unknown>={};
 const q={select:()=>q,eq:(key:string,value:unknown)=>{filters[key]=value;data=data.filter(row=>row[key]===value);return q;},in:(key:string,values:unknown[])=>{data=data.filter(row=>values.includes(row[key]));return q;},order:()=>q,
  range:async(from:number,to:number)=>{mock.reads.push({table,filters:{...filters},single:false});return mock.fail===table?{data:null,error:{message:'unavailable'}}:{data:data.slice(from,to+1),error:null};},
  maybeSingle:()=>{mock.reads.push({table,filters:{...filters},single:true});return mock.single(filters);}};
 return q;
}}}));
function RouteControls(){const navigate=useNavigate();return <><button onClick={()=>navigate('/student/assignments?module=other-module')}>Switch module</button><button onClick={()=>navigate(`/student/assignments?module=${ids.module}`)}>Return to original module</button></>;}
function mount(){return render(<MemoryRouter initialEntries={[`/student/assignments?module=${ids.module}`]}><StudentCoursework/><RouteControls/></MemoryRouter>);}
async function review(text=original){const answer=await screen.findByLabelText('Your original submitted evidence');fireEvent.change(answer,{target:{value:text}});const opener=screen.getByRole('button',{name:'Submit coursework'});fireEvent.click(opener);const dialog=await screen.findByRole('alertdialog',{name:'Submit Reasoned portfolio?'});return {answer,opener,dialog};}
async function sendUnconfirmed(){const {dialog}=await review();fireEvent.click(within(dialog).getByRole('button',{name:'Confirm submission'}));await within(dialog).findByText(/Submission could not be confirmed/);return dialog;}
function deferred(){let finish!:(response:Response)=>void;const promise=new Promise<Response>(resolve=>{finish=resolve;});return {promise,finish};}
beforeEach(()=>{
 vi.clearAllMocks();mock.user={id:ids.student,tenantId:ids.tenant,role:'student',roles:['student']};mock.authLoading=false;mock.fail='';mock.reads=[];mock.files=[ids.file];mock.fileChange=null;
 mock.rpc.mockResolvedValue({data:ids.attempt,error:null});mock.single.mockResolvedValue({data:null,error:null});
 mock.tables={student_enrolments:[{id:'enrolment',student_id:ids.student,tenant_id:ids.tenant,programme_id:ids.programme,status:'active'}],modules:[{id:ids.module,tenant_id:ids.tenant,programme_id:ids.programme,title:'Research methods'}],
  unipathway_assessment_briefs:[{id:ids.brief,module_id:ids.module,tenant_id:ids.tenant,status:'published',title:'Reasoned portfolio',assessment_type:'coursework',teaching_summary:'Evidence and method',learning_outcomes:'Explain an original method',student_expectations:'Show independent reasoning',required_evidence:'An original written explanation',due_at:'2099-01-01T12:00:00Z',submission_cutoff:'2099-02-01T12:00:00Z',max_attempts:3,penalty_points_per_resubmission:5,policy_reference:'Published assessment policy',rubric_version:'1'}],
  unipathway_assessment_criteria:[{id:'criterion',brief_id:ids.brief,criterion_code:'P1',learning_outcome:'Explain reasoning',criterion_description:'Explain method',scoring_guidance:'Use evidence',max_points:100,display_order:1}],unipathway_assessment_attempts:[],unipathway_assessment_released_results:[],unipathway_assessment_grade_amendments:[]};
});
afterEach(()=>{cleanup();vi.restoreAllMocks();});

describe('reviewed coursework and confirmed receipts',()=>{
 it('names the confirmation, starts on Keep editing and cancels without sending',async()=>{
  mount();const {dialog,opener}=await review();
  expect(within(dialog).getByText(`Attempt 1 · ${original.length} characters · 1 attachment`)).toBeInTheDocument();
  expect(within(dialog).getByText(original)).toBeInTheDocument();expect(within(dialog).getByRole('button',{name:'Keep editing'})).toHaveFocus();
  fireEvent.click(within(dialog).getByRole('button',{name:'Keep editing'}));
  await waitFor(()=>expect(screen.queryByRole('alertdialog')).toBeNull());await waitFor(()=>expect(opener).toHaveFocus());
  expect(mock.rpc).not.toHaveBeenCalled();expect(screen.getByLabelText('Your original submitted evidence')).toHaveValue(original);
 });
 it('requires a UUID receipt before confirming and clearing the reviewed draft',async()=>{
  mount();const {dialog}=await review(`  ${original}  `);fireEvent.click(within(dialog).getByRole('button',{name:'Confirm submission'}));
  expect(await screen.findByRole('status',{name:'Submission receipt'})).toHaveTextContent(ids.attempt);
  expect(await screen.findByLabelText('Your original submitted evidence')).toHaveValue('');
  expect(mock.rpc).toHaveBeenCalledTimes(1);expect(mock.rpc).toHaveBeenCalledWith('submit_unipathway_coursework',{p_brief:ids.brief,p_evidence:original,p_uploads:[ids.file],p_request:expect.stringMatching(/^[a-f0-9-]{36}$/)});
  await waitFor(()=>expect(screen.getByRole('heading',{name:'Submission confirmed'})).toHaveFocus());
 });
 it.each([null,'',{},'not-a-uuid'])('retains the reviewed version when RPC receipt is %j',async data=>{
  mock.rpc.mockResolvedValue({data,error:null});mount();const dialog=await sendUnconfirmed();
  expect(screen.queryByRole('status',{name:'Submission receipt'})).toBeNull();expect(within(dialog).getByRole('button',{name:'Retry same submission'})).toBeEnabled();
  fireEvent.click(within(dialog).getByRole('button',{name:'Keep editing'}));
  expect(screen.getByText('Submission not confirmed',{selector:'span'})).toBeInTheDocument();expect(screen.queryByText('Ready for submission')).toBeNull();
  expect(screen.getByLabelText('Your original submitted evidence')).toHaveValue(original);expect(screen.getByRole('button',{name:'Manage attachments'})).toBeDisabled();
 });
 it('freezes reviewed text, attachments and request key across an uncertain retry while preserving later edits',async()=>{
  mock.rpc.mockResolvedValueOnce({data:null,error:null}).mockResolvedValue({data:ids.attempt,error:null});mount();const dialog=await sendUnconfirmed();
  const sent=mock.rpc.mock.calls[0][1];fireEvent.click(within(dialog).getByRole('button',{name:'Keep editing'}));
  fireEvent.change(screen.getByLabelText('Your original submitted evidence'),{target:{value:later}});
  act(()=>mock.fileChange?.([ids.laterFile]));
  fireEvent.click(screen.getByRole('button',{name:'Retry reviewed submission'}));
  const retry=await screen.findByRole('alertdialog',{name:'Submit Reasoned portfolio?'});
  expect(within(retry).getByText(original)).toBeInTheDocument();expect(within(retry).queryByText(later)).toBeNull();
  fireEvent.click(within(retry).getByRole('button',{name:'Retry same submission'}));
  await screen.findByRole('status',{name:'Submission receipt'});expect(mock.rpc).toHaveBeenCalledTimes(2);expect(mock.rpc.mock.calls[1][1]).toEqual(sent);
  expect(screen.getByLabelText('Unsent later edits')).toHaveValue(later);expect(await screen.findByLabelText('Your original submitted evidence')).toHaveValue(later);
 });
 it('blocks rapid repeated confirms synchronously and does not erase edits made while waiting',async()=>{
  const pending=deferred();mock.rpc.mockReturnValue(pending.promise);mount();const {answer,dialog}=await review();const confirm=within(dialog).getByRole('button',{name:'Confirm submission'});
  act(()=>{confirm.click();confirm.click();});expect(mock.rpc).toHaveBeenCalledTimes(1);
  expect(within(dialog).getByRole('button',{name:'Keep editing'})).toBeDisabled();
  fireEvent.change(answer,{target:{value:later}});await act(async()=>pending.finish({data:ids.attempt,error:null}));
  expect(await screen.findByLabelText('Unsent later edits')).toHaveValue(later);
 });
 it('keeps later edits accessible on their submitted brief after navigating away from its receipt',async()=>{
  mock.rpc.mockResolvedValueOnce({data:null,error:null}).mockImplementation(async()=>{
   mock.tables.unipathway_assessment_attempts=[{id:ids.attempt,brief_id:ids.brief,tenant_id:ids.tenant,student_id:ids.student,attempt_no:1,status:'submitted',submitted_at:'2026-11-08T12:00:00Z'}];
   return {data:ids.attempt,error:null};
  });
  mount();const dialog=await sendUnconfirmed();fireEvent.click(within(dialog).getByRole('button',{name:'Keep editing'}));
  fireEvent.change(screen.getByLabelText('Your original submitted evidence'),{target:{value:later}});fireEvent.click(screen.getByRole('button',{name:'Retry reviewed submission'}));fireEvent.click(screen.getByRole('button',{name:'Retry same submission'}));
  await screen.findByText('Attempt 1 — submitted');expect(screen.getByLabelText('Unsent later edits')).toHaveValue(later);expect(screen.queryByLabelText('Your original submitted evidence')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Switch module'}));await screen.findByText(/Your lecturers have not published coursework/);
  fireEvent.click(screen.getByRole('button',{name:'Return to original module'}));await screen.findByText('Attempt 1 — submitted');
  expect(screen.queryByRole('status',{name:'Submission receipt'})).toBeNull();expect(screen.getByLabelText('Unsent later edits')).toHaveValue(later);
 });
 it('allows a changed review after a definite initial transaction rejection',async()=>{
  mock.rpc.mockResolvedValueOnce({data:null,error:{code:'P0001'}}).mockResolvedValue({data:ids.attempt,error:null});mount();const {dialog}=await review();fireEvent.click(within(dialog).getByRole('button',{name:'Confirm submission'}));
  await within(dialog).findByText(/Submission was not accepted/);fireEvent.click(within(dialog).getByRole('button',{name:'Keep editing'}));
  expect(screen.queryByRole('button',{name:'Retry reviewed submission'})).toBeNull();expect(screen.getByRole('button',{name:'Manage attachments'})).toBeEnabled();
  act(()=>mock.fileChange?.([ids.laterFile]));const next=await review(later);fireEvent.click(within(next.dialog).getByRole('button',{name:'Confirm submission'}));
  await screen.findByRole('status',{name:'Submission receipt'});expect(mock.rpc.mock.calls[1][1]).toMatchObject({p_evidence:later,p_uploads:[ids.laterFile]});
 });
 it('does not release the original snapshot when a retry is rejected after an uncertain attempt',async()=>{
  mock.rpc.mockResolvedValueOnce({data:null,error:{message:'connection lost'}}).mockResolvedValueOnce({data:null,error:{code:'P0001'}}).mockResolvedValue({data:ids.attempt,error:null});mount();const dialog=await sendUnconfirmed();
  fireEvent.click(within(dialog).getByRole('button',{name:'Retry same submission'}));await waitFor(()=>expect(mock.rpc).toHaveBeenCalledTimes(2));
  await waitFor(()=>expect(within(dialog).getByRole('button',{name:'Retry same submission'})).toBeEnabled());
  fireEvent.click(within(dialog).getByRole('button',{name:'Keep editing'}));fireEvent.change(screen.getByLabelText('Your original submitted evidence'),{target:{value:later}});
  fireEvent.click(screen.getByRole('button',{name:'Retry reviewed submission'}));fireEvent.click(screen.getByRole('button',{name:'Retry same submission'}));
  await screen.findByRole('status',{name:'Submission receipt'});expect(mock.rpc.mock.calls[2][1]).toEqual(mock.rpc.mock.calls[0][1]);
 });
 it('checks the current cutoff again at confirm time',async()=>{
  mount();const {dialog}=await review();vi.spyOn(Date,'now').mockReturnValue(Date.parse('2100-01-01T00:00:00Z'));
  fireEvent.click(within(dialog).getByRole('button',{name:'Confirm submission'}));await within(dialog).findByText(/submission window or attachments have changed/);expect(mock.rpc).not.toHaveBeenCalled();
 });
});

describe('scoped submission recovery and access',()=>{
 it('recovers only a matching receipt using all four scope filters without another write',async()=>{
  mock.rpc.mockResolvedValue({data:null,error:null});mount();const dialog=await sendUnconfirmed();const request=mock.rpc.mock.calls[0][1].p_request;
  mock.single.mockResolvedValue({data:{id:ids.attempt,brief_id:ids.brief,submission_request_id:request},error:null});
  fireEvent.click(within(dialog).getByRole('button',{name:'Keep editing'}));fireEvent.click(screen.getByRole('button',{name:'Check submission status'}));
  expect(await screen.findByRole('status',{name:'Submission receipt'})).toHaveTextContent(ids.attempt);expect(mock.rpc).toHaveBeenCalledTimes(1);
  expect(mock.reads.find(read=>read.single)).toEqual({table:'unipathway_assessment_attempts',single:true,filters:{tenant_id:ids.tenant,student_id:ids.student,brief_id:ids.brief,submission_request_id:request}});
 });
 it.each(['none','failure','mismatch'])('retains the same retry when receipt lookup returns %s',async kind=>{
  mock.rpc.mockResolvedValueOnce({data:null,error:null}).mockResolvedValue({data:ids.attempt,error:null});mount();const dialog=await sendUnconfirmed();
  mock.single.mockResolvedValue(kind==='failure'?{data:null,error:{code:'42501'}}:kind==='mismatch'?{data:{id:ids.attempt,brief_id:'other-brief',submission_request_id:mock.rpc.mock.calls[0][1].p_request},error:null}:{data:null,error:null});
  fireEvent.click(within(dialog).getByRole('button',{name:'Keep editing'}));fireEvent.click(screen.getByRole('button',{name:'Check submission status'}));
  await screen.findByText(kind==='none'?/No receipt is visible yet/:/Submission status could not be verified/);
  expect(screen.queryByRole('status',{name:'Submission receipt'})).toBeNull();expect(mock.rpc).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button',{name:'Retry reviewed submission'}));fireEvent.click(screen.getByRole('button',{name:'Retry same submission'}));
  await screen.findByRole('status',{name:'Submission receipt'});expect(mock.rpc.mock.calls[1][1]).toEqual(mock.rpc.mock.calls[0][1]);
 });
 it.each(['account','role','membership','verifying'])('ignores a pending submission after %s changes',async change=>{
  const pending=deferred();mock.rpc.mockReturnValue(pending.promise);const view=mount();const {dialog}=await review();fireEvent.click(within(dialog).getByRole('button',{name:'Confirm submission'}));
  if(change==='account')mock.user={...mock.user,id:'other-student',tenantId:'other-centre'};
  if(change==='role')mock.user={...mock.user,role:'lecturer',roles:['student','lecturer']};
  if(change==='membership')mock.user={...mock.user,roles:[]};
  if(change==='verifying')mock.authLoading=true;
  view.rerender(<MemoryRouter><StudentCoursework/><RouteControls/></MemoryRouter>);
  await act(async()=>pending.finish({data:ids.attempt,error:null}));
  expect(screen.queryByRole('status',{name:'Submission receipt'})).toBeNull();expect(screen.queryByRole('alertdialog')).toBeNull();expect(screen.queryByText(original)).toBeNull();expect(mock.toast).not.toHaveBeenCalled();
 });
 it('ignores a pending response after the module changes',async()=>{
  const pending=deferred();mock.rpc.mockReturnValue(pending.promise);mount();const {dialog}=await review();fireEvent.click(within(dialog).getByRole('button',{name:'Confirm submission'}));
  fireEvent.click(screen.getByText('Switch module'));await screen.findByText(/Your lecturers have not published coursework/);
  await act(async()=>pending.finish({data:ids.attempt,error:null}));expect(screen.queryByRole('status',{name:'Submission receipt'})).toBeNull();
 });
 it('fails closed for unverified role membership without querying assignments',async()=>{
  mock.user.roles=[];mount();expect(await screen.findByRole('alert')).toHaveTextContent('active, verified Student role');expect(mock.reads).toHaveLength(0);expect(mock.rpc).not.toHaveBeenCalled();
 });
 it('keeps assignment read failures distinct from an empty queue',async()=>{
  mock.fail='unipathway_assessment_attempts';mount();expect(await screen.findByRole('alert')).toHaveTextContent('Assignments could not be loaded');expect(screen.queryByText(/Your lecturers have not published coursework/)).toBeNull();
  mock.fail='';fireEvent.click(screen.getByRole('button',{name:'Refresh assignments'}));expect(await screen.findByLabelText('Your original submitted evidence')).toBeInTheDocument();
 });
});
