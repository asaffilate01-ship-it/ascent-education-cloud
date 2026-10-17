import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';

const mocks=vi.hoisted(()=>({
 rows: {
  routes:[{id:'route-1',route_name:'Level 5 to Business',qualification_name:'Business Diploma',qualification_level:'Level 5',destination_country:'UK',destination_institution:'Verified Example University',destination_programme:'Business Top Up',entry_stage:'Final year'}],
  applications:[{id:'application-1',student_id:'learner-1',programme:'Business Top Up',destination_country:'UK',status:'offer',intake:'Autumn'}],
 },
 filters:[] as {table:string;key:string;value:unknown}[],
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'learner-1',tenantId:'centre-1',roles:['student']}})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/components/progression/PartnerWorkflow',()=>({default:()=> <div>Student consent workflow</div>}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:(table:string)=>{
 const chain={
  select:()=>chain,
  eq:(key:string,value:unknown)=>{mocks.filters.push({table,key,value});return chain;},
  order:()=>chain,
  limit:async()=>({data:table==='international_pathway_routes'?mocks.rows.routes:mocks.rows.applications,error:null})
 };
 return chain;
}}}));
import ProgressionDashboard from '@/pages/progression/ProgressionDashboard';

beforeEach(()=>{mocks.filters.length=0;});
afterEach(cleanup);

it('only queries verified and published routes, scopes student applications, and hides invented commissions',async()=>{
 render(<MemoryRouter><ProgressionDashboard/></MemoryRouter>);
 expect(await screen.findByText('Verified Example University')).toBeInTheDocument();
 expect(screen.getAllByText('Business Top Up').length).toBeGreaterThan(0);
 expect(screen.getByText('Student consent workflow')).toBeInTheDocument();
 expect(mocks.filters).toContainEqual({table:'international_pathway_routes',key:'review_status',value:'verified'});
 expect(mocks.filters).toContainEqual({table:'international_pathway_routes',key:'student_visible',value:true});
 expect(mocks.filters).toContainEqual({table:'international_university_applications',key:'student_id',value:'learner-1'});
 expect(screen.queryByText(/Commission Rates by Country/)).not.toBeInTheDocument();
 expect(screen.queryByText(/commission per student/i)).not.toBeInTheDocument();
});
