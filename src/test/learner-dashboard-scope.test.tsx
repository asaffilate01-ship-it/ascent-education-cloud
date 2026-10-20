import {render,screen,cleanup,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({query:vi.fn(),from:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'learner',tenantId:'centre',name:'Learner'}})}));
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
  for(const key of ['select','eq','order','limit'])chain[key]=()=>chain;
  chain.then=(resolve:(v:unknown)=>unknown,reject?:(e:unknown)=>unknown)=>
   Promise.resolve({data:[],error:null}).then(resolve,reject);
  return chain;
 });
 render(<MemoryRouter><StudentDashboard/></MemoryRouter>);
 expect(mocks.query.mock.calls.find(c=>c[0]==='programmes')?.[1].filters)
  .toContainEqual({column:'id',operator:'in',value:['p1']});
 expect(mocks.query.mock.calls.find(c=>c[0]==='assignments')?.[1].filters)
  .toContainEqual({column:'module_id',operator:'in',value:['m1']});
 expect(mocks.query.mock.calls.find(c=>c[0]==='submissions')).toBeUndefined();
 expect(screen.getByText('Scheduled legacy task')).toBeInTheDocument();
 await waitFor(()=>expect(mocks.from).toHaveBeenCalled());
 expect(screen.queryByText('99%')).not.toBeInTheDocument();
 expect(screen.getByText('No independently released grades yet')).toBeInTheDocument();
});
