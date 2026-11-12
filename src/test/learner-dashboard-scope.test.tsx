import {render,screen,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({query:vi.fn(),from:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'learner',tenantId:'centre',name:'Learner',role:'student',roles:['student']}})}));
vi.mock('@/hooks/useSupabaseQuery',()=>({useSupabaseQuery:(...args:unknown[])=>mocks.query(...args)}));
vi.mock('@/lib/db',()=>({db:{from:(...args:unknown[])=>mocks.from(...args)}}));
vi.mock('@/components/student/STEMCoachLearningAccess',()=>({default:()=>null}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
import StudentDashboard from '@/pages/student/StudentDashboard';
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('only queries enrolled programmes and never reads provisional legacy submission marks',async()=>{
 const records:Record<string,unknown[]>={
  student_enrolments:[{programme_id:'p1'}],
  programmes:[{id:'p1',title:'My programme'}],
  modules:[{id:'m1',title:'Enrolled module',programme_id:'p1'}],
  assignments:[{id:'a1',title:'Scheduled legacy task',module_id:'m1',deadline:'2099-01-01'}],
  submissions:[{id:'s1',assignment_id:'a1',student_id:'learner',status:'graded',grade:99}]
 };
 mocks.query.mockImplementation((table:string)=>({data:records[table]||[],loading:false,error:null}));
 mocks.from.mockImplementation(()=>{
  const chain:Record<string,unknown>={};
  for(const key of ['select','eq','order','limit','in','gte','range'])chain[key]=()=>chain;
  chain.then=(resolve:(v:unknown)=>unknown,reject?:(e:unknown)=>unknown)=>
   Promise.resolve({data:[],error:null}).then(resolve,reject);
  return chain;
 });
 render(<MemoryRouter><StudentDashboard/></MemoryRouter>);
 expect(mocks.query.mock.calls.find(c=>c[0]==='programmes')?.[1].filters)
  .toContainEqual({column:'id',operator:'in',value:['p1']});
 expect(mocks.query.mock.calls.find(c=>c[0]==='assignments')).toBeUndefined();
 expect(mocks.query.mock.calls.find(c=>c[0]==='submissions')).toBeUndefined();
 expect(screen.queryByText('Scheduled legacy task')).not.toBeInTheDocument();
 expect(await screen.findByText('No independently released grades yet')).toBeInTheDocument();
 expect(mocks.from).toHaveBeenCalled();
 expect(screen.queryByText('99%')).not.toBeInTheDocument();
});
it('loads corrections for the displayed released attempts rather than an unrelated capped history',async()=>{
 mocks.query.mockReturnValue({data:[],loading:false,error:null});
 const filter=vi.fn();
 mocks.from.mockImplementation((table:string)=>{
  const chain:Record<string,unknown>={};
  for(const key of ['select','eq','order','limit','gte','range'])chain[key]=()=>chain;
  chain.in=(...args:unknown[])=>{filter(table,...args);return chain;};
  chain.then=(resolve:(v:unknown)=>unknown)=>Promise.resolve(resolve({data:table==='unipathway_assessment_released_results'?[{attempt_id:'latest',brief_id:'brief',tenant_id:'centre',student_id:'learner',final_score:72,released_at:'2026-10-24'}]:table==='unipathway_assessment_grade_amendments'?[{attempt_id:'latest',brief_id:'brief',tenant_id:'centre',student_id:'learner',corrected_final_score:78}]:[],error:null}));
  return chain;
 });
 render(<MemoryRouter><StudentDashboard/></MemoryRouter>);
 expect(await screen.findByText('78/100')).toBeInTheDocument();
 expect(filter).toHaveBeenCalledWith('unipathway_assessment_grade_amendments','attempt_id',['latest']);
 expect(screen.queryByText('72/100')).not.toBeInTheDocument();
});

it('prioritises learning, verified assessment and a compact support area without losing service routes',async()=>{
 mocks.query.mockImplementation((table:string)=>({
  data:table==='student_enrolments'?[{programme_id:'p1'}]:
    table==='programmes'?[{id:'p1',title:'My programme',level:'4',awarding_body:'OTHM'}]:
    table==='modules'?[{id:'m1',title:'My module',programme_id:'p1'}]:[],
  loading:false,error:null,refetch:vi.fn(),
 }));
 mocks.from.mockImplementation(()=>{
  const chain:Record<string,unknown>={};
  for(const key of ['select','eq','order','limit','in','gte','range'])chain[key]=()=>chain;
  chain.then=(resolve:(v:unknown)=>unknown,reject?:(e:unknown)=>unknown)=>
   Promise.resolve({data:[],error:null}).then(resolve,reject);
  return chain;
 });
 const {container}=render(<MemoryRouter><StudentDashboard/></MemoryRouter>);
 const progress=screen.getByRole('heading',{name:'Your learning overview'});
 const assessment=screen.getByRole('heading',{name:'Coursework and feedback'});
 const support=screen.getByRole('heading',{name:'Support and additional services'});
 expect(progress.compareDocumentPosition(assessment)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 expect(assessment.compareDocumentPosition(support)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 expect(screen.getByRole('link',{name:'My coursework'})).toHaveAttribute('href','/student/assignments');
 expect(screen.getByRole('link',{name:'Approved results'})).toHaveAttribute('href','/student/grades');
 expect(screen.getByRole('link',{name:'Ask the Welfare team'})).toHaveAttribute('href','/student/wellbeing');
 expect(screen.getByRole('link',{name:'All student services'})).toHaveAttribute('href','/workspace');
 expect(container.querySelector('details summary')).toHaveTextContent('Optional revision and linked services');
});
