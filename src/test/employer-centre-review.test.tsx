import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({
 user:{id:'director-a',tenantId:'centre-a',role:'centre_director',roles:['centre_director']},
 read:vi.fn(),write:vi.fn()
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/lib/db',()=>({db:{from:(table:string)=>{
 let operation='read',payload:unknown;const filters:[string,unknown][]=[];
 const chain={
  select:()=>chain,eq:(key:string,value:unknown)=>{filters.push([key,value]);return chain;},
  order:()=>chain,update:(value:unknown)=>{operation='update';payload=value;return chain;},
  insert:(value:unknown)=>{operation='insert';payload=value;return chain;},
  then:(resolve:(v:unknown)=>unknown,reject:(e:unknown)=>unknown)=>
   Promise.resolve(operation==='read'?state.read(table):state.write(table,operation,payload,filters)).then(resolve,reject),
 };
 return chain;
}}}));
import EmployerPartnershipsPage from '@/pages/director/EmployerPartnershipsPage';
const orgs=[
 {id:'org-prospect',name:'Not approved yet',sector:'Software',city:'Islamabad',status:'prospect',verification_reference:null},
 {id:'org-verified',name:'Verified Group',sector:'Software',city:'Islamabad',status:'verified',verification_reference:'private-reference'},
];
const jobs=[{id:'job-a',organisation_id:'org-verified',title:'Approved QA Role',status:'published',opportunity_type:'internship',
 role_description:'A meaningful QA placement',employer_display_name:'Verified Group'}];
const apps=[{id:'app-a',opportunity_id:'job-a',student_id:'student-a',statement:'Consent-provided skills statement',status:'submitted'}];
function response(table:string){
 if(table==='unipathway_employer_organisations')return {data:orgs,error:null};
 if(table==='unipathway_employer_opportunities')return {data:jobs,error:null};
 if(table==='unipathway_employer_applications')return {data:apps,error:null};
 return {data:[],error:null};
}
function deferred(){let resolve!:(value:unknown)=>void;const promise=new Promise<unknown>(r=>{resolve=r;});return {promise,resolve};}
beforeEach(()=>{
 state.user={id:'director-a',tenantId:'centre-a',role:'centre_director',roles:['centre_director']};
 state.read.mockReset().mockImplementation(response);
 state.write.mockReset().mockReturnValue({data:[{id:'app-a'}],error:null});
});
afterEach(cleanup);

it('does not allow membership verification against an unapproved organisation',async()=>{
 render(<EmployerPartnershipsPage/>);
 const membership=await screen.findByRole('combobox',{name:'Organisation'});
 expect(within(membership).getByRole('option',{name:'Verified Group'})).toBeInTheDocument();
 expect(within(membership).queryByRole('option',{name:/Not approved yet/})).not.toBeInTheDocument();
});

it('restricts screening actions to centre leadership and the selected tenant',async()=>{
 render(<EmployerPartnershipsPage/>);
 expect(await screen.findByText('Consent-provided skills statement')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Start screening'}));
 await waitFor(()=>expect(state.write).toHaveBeenCalledWith('unipathway_employer_applications','update',{status:'screening'},
  expect.arrayContaining([['id','app-a'],['tenant_id','centre-a'],['status','submitted']])));
});

it('discards late employer records after the director switches centre identity',async()=>{
 const old=deferred();let first=true;
 state.read.mockImplementation((table:string)=>{
  if(table==='unipathway_employer_organisations'&&first){first=false;return old.promise;}
  return {data:[],error:null};
 });
 const view=render(<EmployerPartnershipsPage/>);
 state.user={id:'director-b',tenantId:'centre-b',role:'centre_director',roles:['centre_director']};
 view.rerender(<EmployerPartnershipsPage/>);
 expect(await screen.findByText('No employers have been submitted for vetting.')).toBeInTheDocument();
 await act(async()=>{old.resolve({data:orgs,error:null});});
 expect(screen.queryByText('Verified Group')).not.toBeInTheDocument();
});
