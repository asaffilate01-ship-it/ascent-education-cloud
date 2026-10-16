import {render,screen,cleanup,fireEvent} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({query:vi.fn(),eq:vi.fn(),tasks:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'learner-1',tenantId:'centre-1',roles:['student']}})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/components/progression/SupportTasks',()=>({default:({student}:{student:boolean})=><div>{student?'Read-only support':'Staff support'}</div>}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:(table:string)=>{const chain={select:()=>chain,eq:(...args:unknown[])=>{mocks.eq(...args);return chain;},in:()=>chain,order:()=>chain,range:()=>table==='international_support_tasks'?mocks.tasks():mocks.query()};return chain;}}}));
import GlobalProgression from '@/pages/progression/GlobalProgression';
afterEach(cleanup);beforeEach(()=>{vi.clearAllMocks();mocks.tasks.mockResolvedValue({data:[],error:null});});
it('scopes applications to the learner and shows closed cases honestly',async()=>{
 mocks.query.mockResolvedValue({data:[{id:'case-1',programme:'Business',destination_country:'UK',status:'withdrawn',intake:null,career_organisations:{name:'Example University'}}],error:null});render(<MemoryRouter><GlobalProgression/></MemoryRouter>);
 expect(await screen.findByText('Example University')).toBeInTheDocument();expect(screen.getByText('0 active applications · 1 closed')).toBeInTheDocument();expect(screen.getByText('Read-only support')).toBeInTheDocument();expect(mocks.eq).toHaveBeenCalledWith('tenant_id','centre-1');expect(mocks.eq).toHaveBeenCalledWith('student_id','learner-1');
});
it('distinguishes a failed request from an empty application list',async()=>{mocks.query.mockResolvedValue({data:null,error:{message:'denied'}});render(<MemoryRouter><GlobalProgression/></MemoryRouter>);expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');expect(screen.queryByText(/No university applications/)).not.toBeInTheDocument();});

it('shows the application when deadline loading fails without claiming an empty agenda',async()=>{mocks.query.mockResolvedValue({data:[{id:'case-1',programme:'Business',destination_country:'UK',status:'offer',intake:null,career_organisations:null}],error:null});mocks.tasks.mockResolvedValue({data:null,error:{message:'denied'}});render(<MemoryRouter><GlobalProgression/></MemoryRouter>);expect(await screen.findByRole('alert')).toHaveTextContent('Support deadlines could not be loaded');expect(screen.getByText('Business')).toBeInTheDocument();expect(screen.queryByText('No support tasks match this view.')).not.toBeInTheDocument();});
it('moves focus from a deadline to its application without offering task writes',async()=>{mocks.query.mockResolvedValue({data:[{id:'case-1',programme:'Business',destination_country:'UK',status:'offer',intake:null,career_organisations:null}],error:null});mocks.tasks.mockResolvedValue({data:[{id:'task-1',application_id:'case-1',title:'Upload evidence',task_type:'documents',status:'pending',due_at:null}],error:null});render(<MemoryRouter><GlobalProgression/></MemoryRouter>);fireEvent.click(await screen.findByRole('button',{name:'View application for Upload evidence'}));expect(screen.getByRole('article',{name:'Application case-1'})).toHaveFocus();expect(screen.queryByRole('button',{name:'Complete task'})).not.toBeInTheDocument();});
