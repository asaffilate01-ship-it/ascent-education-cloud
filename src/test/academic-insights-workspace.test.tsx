import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
import {readFileSync} from 'node:fs';

const state=vi.hoisted(()=>({
 role:'centre_director',tenant:'centre-a',roles:['centre_director'] as string[],
 fail:'',loading:false,queries:[] as {table:string;options:any}[],
 retry:vi.fn(),download:vi.fn()
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'director',name:'Director',role:state.role,roles:state.roles,tenantId:state.tenant}})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({title,children}:{title:string;children:React.ReactNode})=><main><h1>{title}</h1>{children}</main>}));
vi.mock('@/lib/downloadText',()=>({downloadText:(...args:unknown[])=>state.download(...args)}));
vi.mock('@/hooks/useSupabaseQuery',()=>({useSupabaseQuery:(table:string,options:any)=>{
 state.queries.push({table,options});
 const records:Record<string,unknown[]>={
  student_enrolments:[{tenant_id:'centre-a',student_id:'student-1',status:'active'}],
  attendance_records:[{tenant_id:'centre-a',student_id:'student-1',status:'absent'}],
  submissions:[{tenant_id:'centre-a',status:'submitted'}],
  modules:[{tenant_id:'centre-a',status:'active',lecturer_id:null}],
 };
 return {data:options.enabled?(records[table]||[]):[],loading:options.enabled&&state.loading,
  error:options.enabled&&table===state.fail?'permission denied':null,refetch:state.retry};
}}));
import AIRecommendations from '@/pages/ai/AIRecommendations';
const view=()=>render(<MemoryRouter><AIRecommendations/></MemoryRouter>);
beforeEach(()=>{state.role='centre_director';state.tenant='centre-a';state.roles=['centre_director'];state.fail='';state.loading=false;state.queries=[];state.retry.mockReset();state.download.mockReset();});
afterEach(cleanup);

it('renders a real, scoped review and exports only aggregate counts',()=>{
 view();
 expect(screen.getByRole('heading',{name:'Academic operations insights'})).toBeInTheDocument();
 expect(screen.getByText(/1 learners with absence records/)).toBeInTheDocument();
 expect(screen.getAllByRole('link',{name:/Open records/})[0]).toHaveAttribute('href','/director/attendance-corrections');
 expect(state.queries).toHaveLength(4);
 for(const q of state.queries){
  expect(q.options.enabled).toBe(true);
  expect(q.options.filters).toContainEqual({column:'tenant_id',operator:'eq',value:'centre-a'});
  expect(q.options.select).not.toMatch(/grade|student_name|email|medical|health|statement/);
 }
 fireEvent.click(screen.getByRole('button',{name:'Download de-identified brief'}));
 expect(state.download).toHaveBeenCalledOnce();
 const brief=state.download.mock.calls[0][1] as string;
 expect(brief).toContain('Coursework submissions awaiting review: 1');
 expect(brief).not.toContain('student-1');
});

it('does not query data for an active student or for an unassigned centre',()=>{
 state.role='student';state.roles=['student'];view();
 expect(screen.getByRole('alert')).toHaveTextContent('Centre leadership access required');
 expect(state.queries.every(q=>q.options.enabled===false)).toBe(true);
 cleanup();state.queries=[];state.role='centre_director';state.roles=['centre_director'];state.tenant='';
 view();
 expect(screen.getByRole('alert')).toHaveTextContent('Centre leadership access required');
 expect(state.queries.every(q=>q.options.enabled===false)).toBe(true);
});

it('never presents partial metrics as trustworthy when a source fails',()=>{
 state.fail='attendance_records';view();
 expect(screen.getByRole('alert')).toHaveTextContent('Operational evidence could not be verified');
 expect(screen.queryByText('Centre snapshot')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Retry centre records'}));
 expect(state.retry).toHaveBeenCalledTimes(4);
});

it('distinguishes a loading read from an evidence-free successful response',()=>{
 state.loading=true;const r=view();
 expect(screen.getByRole('status')).toHaveTextContent('Checking centre records');
 expect(screen.queryByText('Centre snapshot')).not.toBeInTheDocument();
 state.loading=false;state.role='student';state.roles=['student'];r.rerender(<MemoryRouter><AIRecommendations/></MemoryRouter>);
 expect(screen.queryByText('Centre snapshot')).not.toBeInTheDocument();
});

it('requires centre leadership at the actual route boundary',()=>{
 const app=readFileSync('src/App.tsx','utf8');
 expect(app).toContain('<Route path="/ai-recommendations" element={<Director><AIRecommendations /></Director>} />');
 expect(app).not.toContain('<Route path="/ai-recommendations" element={<P><AIRecommendations /></P>} />');
});
