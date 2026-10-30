import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';

const state=vi.hoisted(()=>({
 user:{id:'student-a',tenantId:'centre-a',role:'student',roles:['student']},
 read:vi.fn(),write:vi.fn()
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/lib/db',()=>({db:{from:(table:string)=>{
 let operation='read',payload:unknown;
 const chain={
  select:()=>chain,eq:()=>chain,in:()=>chain,order:()=>chain,
  update:(value:unknown)=>{operation='update';payload=value;return chain;},
  insert:(value:unknown)=>{operation='insert';payload=value;return chain;},
  then:(resolve:(v:unknown)=>unknown,reject:(e:unknown)=>unknown)=>
   Promise.resolve(operation==='read'?state.read(table):state.write(table,operation,payload)).then(resolve,reject)
 };
 return chain;
}}}));
import CareerMarketplace from '@/pages/careers/CareerMarketplace';

const job={id:'job-a',tenant_id:'centre-a',employer_display_name:'Approved Employer',title:'Approved QA Internship',
 opportunity_type:'internship',city:'Islamabad',country:'Pakistan',remote:false,role_description:'Supervised QA training',
 safety_requirements:null,stipend_details:null,application_deadline:null,status:'published'};
const application={id:'app-a',opportunity_id:'job-a',status:'submitted',created_at:'2026-10-30T10:00:00Z'};
function deferred(){
 let resolve!:(value:unknown)=>void;
 const promise=new Promise<unknown>(r=>{resolve=r;});
 return {promise,resolve};
}
beforeEach(()=>{
 state.user={id:'student-a',tenantId:'centre-a',role:'student',roles:['student']};
 state.read.mockReset().mockImplementation((table:string)=>({data:table==='unipathway_employer_opportunities'?[job]:[application],error:null}));
 state.write.mockReset().mockReturnValue({data:[{id:'app-a'}],error:null});
});
afterEach(cleanup);

it('withdraws only the signed-in students application while retaining an audit notice',async()=>{
 render(<CareerMarketplace/>);
 fireEvent.click(await screen.findByRole('button',{name:'Withdraw application'}));
 await waitFor(()=>expect(state.write).toHaveBeenCalledWith('unipathway_employer_applications','update',{status:'withdrawn'}));
 expect(await screen.findByText(/Application withdrawn/)).toBeInTheDocument();
 expect(screen.getByText(/Application recorded/)).toBeInTheDocument();
});

it('does not display stale vacancies after changing student or centre identity',async()=>{
 const old=deferred();let jobReads=0;
 state.read.mockImplementation((table:string)=>{
  if(table==='unipathway_employer_opportunities'&&jobReads++===0)return old.promise;
  return {data:[],error:null};
 });
 const view=render(<CareerMarketplace/>);
 state.user={id:'student-b',tenantId:'centre-b',role:'student',roles:['student']};
 view.rerender(<CareerMarketplace/>);
 expect(await screen.findByText('No verified vacancies are open yet')).toBeInTheDocument();
 await act(async()=>{old.resolve({data:[job],error:null});});
 expect(screen.queryByText('Approved QA Internship')).not.toBeInTheDocument();
 expect(state.read).toHaveBeenCalledTimes(4);
});

it('never queries the employer tables for a non-student workspace',async()=>{
 state.user={id:'nonstudent',tenantId:'centre-a',role:'centre_director',roles:['centre_director']};
 render(<CareerMarketplace/>);
 expect(await screen.findByRole('alert')).toHaveTextContent('confirmed student account');
 expect(state.read).not.toHaveBeenCalled();
});
