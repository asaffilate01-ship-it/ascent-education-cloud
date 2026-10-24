import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import ModuleOverview from '@/pages/learning/ModuleOverview';
import {courseworkState,loadModuleOverview} from '@/lib/moduleOverview';
const mock=vi.hoisted(()=>({tables:{} as Record<string,Record<string,unknown>[]>,fail:'',calls:[] as string[],user:{id:'student',tenantId:'centre'}}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mock.user})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/lib/db',()=>({db:{from:(table:string)=>{mock.calls.push(table);let data=mock.tables[table]||[];const response=()=>({data,error:mock.fail===table?{message:'offline'}:null});const q={select:()=>q,eq:(key:string,value:unknown)=>{data=data.filter(r=>r[key]===value);return q;},in:(key:string,values:unknown[])=>{data=data.filter(r=>values.includes(r[key]));return q;},gte:()=>q,lte:()=>q,order:()=>q,limit:async(n:number)=>({...response(),data:data.slice(0,n)}),range:async(a:number,b:number)=>({...response(),data:data.slice(a,b+1)})};return q;}}}));
beforeEach(()=>{mock.calls=[];mock.fail='';mock.user={id:'student',tenantId:'centre'};mock.tables={
 modules:[{id:'m',title:'Maths',tenant_id:'centre',programme_id:'p',lecturer_id:'tutor'}],
 student_enrolments:[{id:'e',tenant_id:'centre',programme_id:'p',student_id:'student',status:'active'}],
 unipathway_assessment_briefs:[{id:'b',title:'Algebra evidence',tenant_id:'centre',module_id:'m',status:'published',due_at:'2099-01-01',submission_cutoff:'2099-02-01'}],
 live_class_sessions:[{id:'s',title:'Next algebra class',tenant_id:'centre',module_id:'m',status:'scheduled',starts_at:'2099-01-01',ends_at:'2099-01-02'}],
};});
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('connects real module records and shows an unavailable section without inventing zero counts',async()=>{
 mock.fail='unipathway_learning_plans';render(<MemoryRouter initialEntries={['/student/module?module=m']}><ModuleOverview/></MemoryRouter>);
 await screen.findByText('Next algebra class');expect(screen.getByRole('link',{name:'Algebra evidence'})).toHaveAttribute('href','/student/assignments?module=m');
 const practice=screen.getByRole('region',{name:'Individual practice'});expect(within(practice).getByRole('alert')).toHaveTextContent('Could not verify');
 expect(within(practice).queryByText('Your tutor has not created a plan yet')).toBeNull();
 mock.tables.student_enrolments=[];fireEvent.click(screen.getByText('Refresh module'));
 await screen.findByText(/This module is unavailable/);expect(screen.queryByText('Next algebra class')).toBeNull();expect(screen.queryByText('Algebra evidence')).toBeNull();
});
it('does not request learning details for an unassigned lecturer or another centre',async()=>{
 expect((await loadModuleOverview('other-tutor','centre','m',true)).module).toBeNull();expect(mock.calls).toEqual(['modules']);mock.calls=[];
 expect((await loadModuleOverview('student','different-centre','m',false)).module).toBeNull();expect(mock.calls).toEqual(['modules']);
});
it('teacher overview omits learner result queries and links recording release to the archive',async()=>{
 const result=await loadModuleOverview('tutor','centre','m',true);expect(result.module?.title).toBe('Maths');
 expect(mock.calls).not.toContain('unipathway_assessment_released_results');expect(result.panels.find(p=>p.title==='Materials and recordings')?.items[0].to).toBe('/lecturer/lesson-archive?module=m');
});
it('distinguishes submission, resubmission, overdue and closed windows',()=>{
 const b={id:'b',title:'Brief',status:'published',due_at:'2026-01-01',submission_cutoff:'2026-02-01'};
 const time=Date.parse('2026-01-10');expect(courseworkState(b,[],time)).toMatch(/^Overdue/);
 expect(courseworkState(b,[],Date.parse('2026-03-01'))).toMatch(/^Submission window closed/);
 expect(courseworkState(b,[{id:'a',brief_id:'b',attempt_no:1,status:'submitted'}],time)).toMatch(/^Submitted/);
 expect(courseworkState(b,[{id:'a',brief_id:'b',attempt_no:1,status:'resubmission_requested'}],time)).toMatch(/^Resubmission requested/);
});
it('prioritises open work above older closed assessments',async()=>{
 mock.tables.unipathway_assessment_briefs.push(...Array.from({length:6},(_,i)=>({id:`closed${i}`,title:`Closed work ${i}`,tenant_id:'centre',module_id:'m',status:'published',due_at:'2020-01-01',submission_cutoff:'2020-02-01'})));
 const result=await loadModuleOverview('student','centre','m',false);
 expect(result.panels.find(p=>p.title==='Coursework')?.items[0].title).toBe('Algebra evidence');
});
