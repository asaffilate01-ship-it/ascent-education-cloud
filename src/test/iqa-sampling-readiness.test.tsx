import {cleanup,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,it,expect,vi} from 'vitest';
const session=vi.hoisted(()=>({user:{id:'reviewer',tenantId:'centre-a',role:'iqa_officer',roles:['iqa_officer']} as {
 id:string;tenantId:string;role:string;roles:string[];
 }|null,loading:false}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>session}));
vi.mock('@/lib/roleMembership',()=>({activeRoleVerified:(user:{role:string;roles:string[]})=>user.roles.includes(user.role)}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
import IqaSamplingReadiness from '@/pages/qa/IqaSamplingReadiness';
afterEach(()=>{cleanup();session.user={id:'reviewer',tenantId:'centre-a',role:'iqa_officer',roles:['iqa_officer']};session.loading=false;});
it('states clearly that the sampler is staged and protects the existing independently allocated IQA queue',()=>{
 render(<MemoryRouter><IqaSamplingReadiness/></MemoryRouter>);
 expect(screen.getByRole('heading',{name:'Automated audit service not activated'})).toBeInTheDocument();
 expect(screen.getByRole('link',{name:'Open authorised quality work'})).toHaveAttribute('href','/qa/assessment-approval');
 expect(screen.getByText(/cannot schedule, save, approve or complete an IQA audit/)).toBeInTheDocument();
 expect(screen.getAllByRole('listitem')).toHaveLength(5);
 expect(screen.queryByRole('button',{name:/approve sampling|run sampling/i})).toBeNull();
});
it('does not expose sampling content to an unverified centre role',()=>{
 session.user={id:'student',tenantId:'centre-a',role:'student',roles:['student']};
 render(<MemoryRouter><IqaSamplingReadiness/></MemoryRouter>);
 expect(screen.getByRole('alert')).toHaveTextContent('No sampling plans, students, scripts or assessment records were loaded');
 expect(screen.queryByRole('heading',{name:'Required activation steps'})).toBeNull();
});
it('routes centre directors to their scoped academic quality workspace',()=>{
 session.user={id:'director',tenantId:'centre-a',role:'centre_director',roles:['centre_director']};
 render(<MemoryRouter><IqaSamplingReadiness/></MemoryRouter>);
 expect(screen.getByRole('link',{name:'Open authorised quality work'})).toHaveAttribute('href','/director/quality');
});
