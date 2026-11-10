import {cleanup,render,screen,fireEvent,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';

const state=vi.hoisted(()=>({
 user:{id:'reviewer-a',tenantId:'centre-a',role:'iqa_officer',roles:['iqa_officer']} as
  null|{id:string;tenantId:string;role:string;roles:string[]},
 from:vi.fn(),queries:[] as Array<{table:string;from:number;to:number}>,
 allocations:[] as Record<string,unknown>[],
 attempts:[] as Record<string,unknown>[],
 failSecondPage:false,injectForeign:false,
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({title,children}:{title:string;children:React.ReactNode})=><main><h1>{title}</h1>{children}</main>}));
vi.mock('@/lib/db',()=>({db:{from:(table:string)=>state.from(table)}}));
import QADashboard from '@/pages/qa/QADashboard';

function makeRows(count:number){
 state.allocations=Array.from({length:count},(_,i)=>({attempt_id:`attempt-${String(i).padStart(4,'0')}`,tenant_id:'centre-a',qa_reviewer_id:'reviewer-a'}));
 state.attempts=state.allocations.map((r,i)=>({id:r.attempt_id,tenant_id:'centre-a',status:i<201?'human_marked':i<221?'qa_approved':'released'}));
}
function mockDb(){
 state.from.mockImplementation((table:string)=>{
  const eqs:Record<string,unknown>={},inFilters:Record<string,unknown[]>={};
  const chain:Record<string,unknown>={};
  chain.select=()=>chain;
  chain.eq=(field:string,value:unknown)=>{eqs[field]=value;return chain;};
  chain.in=(field:string,values:unknown[])=>{inFilters[field]=values;return chain;};
  chain.order=()=>chain;
  chain.range=(from:number,to:number)=>{
   state.queries.push({table,from,to});
   if(table==='unipathway_assessment_allocations'&&state.failSecondPage&&from>=250)
    return Promise.resolve({data:null,error:{message:'Second page unavailable'}});
   const rows=table==='unipathway_assessment_allocations'?state.allocations:state.attempts;
   const selected=rows.filter(record=>
    Object.entries(eqs).every(([field,value])=>record[field]===value)&&
    Object.entries(inFilters).every(([field,values])=>values.includes(record[field])));
   if(table==='unipathway_assessment_allocations'&&state.injectForeign&&from===0)
    return Promise.resolve({data:[{attempt_id:'foreign-case',tenant_id:'centre-b',qa_reviewer_id:'reviewer-a'},...selected.slice(from,to)],error:null});
   return Promise.resolve({data:selected.slice(from,to+1),error:null});
  };
  return chain;
 });
}
const mount=()=>render(<MemoryRouter initialEntries={['/qa']}><QADashboard/></MemoryRouter>);
beforeEach(()=>{
 vi.clearAllMocks();state.queries=[];state.failSecondPage=false;state.injectForeign=false;
 state.user={id:'reviewer-a',tenantId:'centre-a',role:'iqa_officer',roles:['iqa_officer']};
 makeRows(251);mockDb();
});
afterEach(cleanup);

it('counts all 251 centre-and-reviewer allocations rather than silently capping at 200',async()=>{
 mount();
 const region=screen.getByRole('region',{name:'My assigned IQA workload'});
 await waitFor(()=>expect(withinTotals(region)).toEqual(['201','20','30']));
 expect(state.queries.filter(q=>q.table==='unipathway_assessment_allocations')).toEqual([
  {table:'unipathway_assessment_allocations',from:0,to:249},
  {table:'unipathway_assessment_allocations',from:250,to:499},
 ]);
 expect(state.queries.some(q=>q.table==='unipathway_assessment_attempts')).toBe(true);
 expect(state.queries.filter(q=>q.table==='unipathway_assessment_attempts')).toHaveLength(6);
});
function withinTotals(region:HTMLElement):string[]{
 return ['Awaiting IQA review','Awaiting separate release','Other allocated attempts']
  .map(label=>{
   const title=Array.from(region.querySelectorAll('p')).find(el=>el.textContent===label);
   return title?.nextElementSibling?.textContent||'';
  });
}
it('shows no partial totals if the second allocation page cannot be verified, then recovers on retry',async()=>{
 state.failSecondPage=true;mount();
 const region=screen.getByRole('region',{name:'My assigned IQA workload'});
 expect(await screen.findByRole('alert')).toHaveTextContent('No partial figures are shown');
 expect(withinTotals(region)).toEqual(['','','']);
 state.failSecondPage=false;
 fireEvent.click(screen.getByRole('button',{name:'Refresh'}));
 await waitFor(()=>expect(withinTotals(region)).toEqual(['201','20','30']));
});
it('rejects foreign-centre allocation rows even if a malformed backend result contains them',async()=>{
 state.injectForeign=true;mount();
 const region=screen.getByRole('region',{name:'My assigned IQA workload'});
 expect(await screen.findByRole('alert')).toHaveTextContent('No partial figures are shown');
 expect(withinTotals(region)).toEqual(['','','']);
});
it('never starts the workload read for another active role',()=>{
 state.user={id:'student',tenantId:'centre-a',role:'student',roles:['student','iqa_officer']};
 mount();
 expect(screen.getByRole('alert')).toHaveTextContent('active, centre-verified');
 expect(state.from).not.toHaveBeenCalled();
});
