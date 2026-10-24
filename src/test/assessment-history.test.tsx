import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import StudentReleasedResults from '@/pages/student/StudentReleasedResults';
import StudentCoursework from '@/pages/student/StudentCoursework';
const mock=vi.hoisted(()=>({tables:{} as Record<string,Record<string,unknown>[]>,fail:'',failOffset:0,user:{id:'student',tenantId:'centre',role:'student'},calls:[] as {table:string;key:string;from:number}[],pending:null as null|Promise<{data:Record<string,unknown>[];error:null}>}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mock.user})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/components/assessment/GuardianResultSharing',()=>({default:()=>null}));
vi.mock('@/components/assessment/CourseworkFiles',()=>({default:()=>null}));
vi.mock('@/lib/db',()=>({db:{from:(table:string)=>{let data=mock.tables[table]||[],key='id';const q={select:()=>q,eq:(k:string,value:unknown)=>{data=data.filter(r=>r[k]===value);return q;},in:(k:string,values:unknown[])=>{data=data.filter(r=>values.includes(r[k]));return q;},order:(k:string)=>{key=k;return q;},range:async(from:number,to:number)=>{mock.calls.push({table,key,from});if(mock.pending&&table==='unipathway_assessment_released_results')return mock.pending;if(mock.fail===table&&from>=mock.failOffset)return {data:null,error:{message:'offline'}};return {data:[...data].sort((a,b)=>String(a[key]).localeCompare(String(b[key]))).slice(from,to+1),error:null};}};return q;}}}));
beforeEach(()=>{mock.fail='';mock.failOffset=0;mock.calls=[];mock.pending=null;mock.user={id:'student',tenantId:'centre',role:'student'};mock.tables={
 student_enrolments:[{id:'e',programme_id:'p',student_id:'student',tenant_id:'centre',status:'active'}],
 modules:[{id:'m',programme_id:'p',tenant_id:'centre',title:'Maths'}],
 unipathway_assessment_briefs:Array.from({length:301},(_,i)=>({id:`b${String(i).padStart(3,'0')}`,module_id:'m',tenant_id:'centre',title:`Assessment ${i}`,assessment_type:'coursework',status:'published',due_at:'2099-01-01',submission_cutoff:'2099-02-01',max_attempts:3,penalty_points_per_resubmission:5,policy_reference:'Approved policy'})),
 unipathway_assessment_attempts:Array.from({length:301},(_,i)=>({id:`a${String(i).padStart(3,'0')}`,brief_id:`b${String(i).padStart(3,'0')}`,student_id:'student',tenant_id:'centre',status:'released',attempt_no:1,submitted_at:'2026-01-01'})),
 unipathway_assessment_released_results:Array.from({length:301},(_,i)=>({attempt_id:`a${String(i).padStart(3,'0')}`,brief_id:`b${String(i).padStart(3,'0')}`,student_id:'student',tenant_id:'centre',final_score:55,raw_score:55,penalty_points:0,published_feedback:'Original released feedback',released_at:'2026-01-02'})),
 unipathway_assessment_grade_amendments:[{attempt_id:'a300',brief_id:'b300',tenant_id:'centre',student_id:'student',original_final_score:55,corrected_final_score:78,corrected_raw_score:78,corrected_feedback:'Independently corrected feedback',recorded_at:'2026-02-01'}],
};});
afterEach(()=>{cleanup();vi.clearAllMocks();});
const mount=(view:React.ReactNode)=>render(<MemoryRouter>{view}</MemoryRouter>);
it('searches the complete result history and keeps approved amendments on older records',async()=>{
 mount(<StudentReleasedResults/>);await screen.findByText('Page 1 of 16 · 301 results');
 fireEvent.change(screen.getByLabelText('Search released results'),{target:{value:'Assessment 300'}});
 await screen.findByText('Independently corrected feedback');expect(screen.getAllByText(/78\/100/)[0]).toBeInTheDocument();expect(screen.queryByText('Original released feedback')).toBeNull();
 expect(mock.calls.some(c=>c.table==='unipathway_assessment_released_results'&&c.from===250&&c.key==='attempt_id')).toBe(true);
});
it('fails closed when a later result page or amendment query fails, and recovers on refresh',async()=>{
 mock.fail='unipathway_assessment_released_results';mock.failOffset=250;mount(<StudentReleasedResults/>);
 await screen.findByRole('alert');expect(screen.queryByText('Assessment 0')).toBeNull();
 mock.fail='';fireEvent.click(screen.getByText('Refresh results'));await screen.findByText('Assessment 0');
 mock.fail='unipathway_assessment_grade_amendments';mock.failOffset=0;fireEvent.click(screen.getByText('Refresh results'));
 expect(screen.queryByText('Assessment 0')).toBeNull();await screen.findByRole('alert');expect(screen.queryByText('Original released feedback')).toBeNull();
});
it('keeps older coursework submission history and displays the same amended result',async()=>{
 mount(<StudentCoursework/>);await screen.findByText('Page 1 of 31 · 301 assessments');
 fireEvent.change(screen.getByLabelText('Search coursework'),{target:{value:'Assessment 300'}});
 await screen.findByText('Attempt 1 — released');expect(screen.getByText('Approved score: 78/100 — independently amended')).toBeInTheDocument();expect(screen.getByText('Independently corrected feedback')).toBeInTheDocument();expect(screen.getByText(/Original released score: 55/)).toBeInTheDocument();expect(screen.queryByText('Submit coursework')).toBeNull();
 mock.fail='unipathway_assessment_grade_amendments';fireEvent.click(screen.getByText('Refresh assignments'));await screen.findByRole('alert');expect(screen.queryByText('Approved score: 78/100 — independently amended')).toBeNull();
});
it('ignores an old account result request completing after an account switch',async()=>{
 let finish!:(value:{data:Record<string,unknown>[];error:null})=>void;
 mock.pending=new Promise(resolve=>{finish=resolve;});const view=mount(<StudentReleasedResults/>);
 await waitFor(()=>expect(mock.calls.some(c=>c.table==='unipathway_assessment_released_results')).toBe(true));
 mock.pending=null;mock.user={id:'other-student',tenantId:'other-centre',role:'student'};
 view.rerender(<MemoryRouter><StudentReleasedResults/></MemoryRouter>);await screen.findByText('No released scores yet');
 await act(async()=>{finish({data:[mock.tables.unipathway_assessment_released_results[0]],error:null});});
 await waitFor(()=>expect(screen.queryByText('Assessment 0')).toBeNull());expect(screen.queryByText('Original released feedback')).toBeNull();
});
it('retains unsent coursework text while searching and refreshing',async()=>{
 mock.tables.unipathway_assessment_attempts=mock.tables.unipathway_assessment_attempts.filter(a=>a.id!=='a000');
 mock.tables.unipathway_assessment_released_results=mock.tables.unipathway_assessment_released_results.filter(a=>a.attempt_id!=='a000');
 mount(<StudentCoursework/>);const answer=await screen.findByLabelText('Your original submitted evidence');
 fireEvent.change(answer,{target:{value:'My original explanation remains here while I check my other work.'}});
 fireEvent.change(screen.getByLabelText('Search coursework'),{target:{value:'Assessment 300'}});expect(screen.queryByLabelText('Your original submitted evidence')).toBeNull();
 fireEvent.change(screen.getByLabelText('Search coursework'),{target:{value:'Assessment 0'}});
 expect(screen.getByLabelText('Your original submitted evidence')).toHaveValue('My original explanation remains here while I check my other work.');
 fireEvent.click(screen.getByText('Refresh assignments'));
 expect(await screen.findByLabelText('Your original submitted evidence')).toHaveValue('My original explanation remains here while I check my other work.');
});
