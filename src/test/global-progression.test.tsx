import {render,screen,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({query:vi.fn(),eq:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'learner-1',tenantId:'centre-1',roles:['student']}})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/components/progression/SupportTasks',()=>({default:({student}:{student:boolean})=><div>{student?'Read-only support':'Staff support'}</div>}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>{const chain={select:()=>chain,eq:(...args:unknown[])=>{mocks.eq(...args);return chain;},order:()=>chain,range:()=>mocks.query()};return chain;}}}));
import GlobalProgression from '@/pages/progression/GlobalProgression';
afterEach(cleanup);beforeEach(()=>vi.clearAllMocks());
it('scopes applications to the learner and shows closed cases honestly',async()=>{
 mocks.query.mockResolvedValue({data:[{id:'case-1',programme:'Business',destination_country:'UK',status:'withdrawn',intake:null,career_organisations:{name:'Example University'}}],error:null});render(<MemoryRouter><GlobalProgression/></MemoryRouter>);
 expect(await screen.findByText('Example University')).toBeInTheDocument();expect(screen.getByText('0 active applications · 1 closed')).toBeInTheDocument();expect(screen.getByText('Read-only support')).toBeInTheDocument();expect(mocks.eq).toHaveBeenCalledWith('tenant_id','centre-1');expect(mocks.eq).toHaveBeenCalledWith('student_id','learner-1');
});
it('distinguishes a failed request from an empty application list',async()=>{mocks.query.mockResolvedValue({data:null,error:{message:'denied'}});render(<MemoryRouter><GlobalProgression/></MemoryRouter>);expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');expect(screen.queryByText(/No university applications/)).not.toBeInTheDocument();});
