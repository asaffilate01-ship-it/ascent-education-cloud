import {render,screen,cleanup,fireEvent,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({rows:vi.fn(),rpc:vi.fn(),roles:['centre_director'],role:'centre_director'}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'staff-1',tenantId:'centre-1',role:mocks.role,roles:mocks.roles}})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:(...args:unknown[])=>mocks.rpc(...args)}}));
vi.mock('@/components/assessment/CourseOfferEditor',()=>({default:()=> <p>Course offer editor authorised</p>}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/lib/workflowRows',()=>({workflowRows:(...args:unknown[])=>mocks.rows(...args)}));
import ProductionReadiness from '@/pages/superadmin/ProductionReadiness';
afterEach(cleanup);beforeEach(()=>{vi.clearAllMocks();mocks.roles=['centre_director'];mocks.role='centre_director';mocks.rows.mockImplementation(async(_db,table)=>({data:table==='production_readiness_checks'?[{id:'check-1',tenant_id:'centre-1',check_key:'full_migration_replay',status:'pending',revision:4}]:[],error:null}));});
it('denies learner access before loading evidence',()=>{mocks.roles=['student'];render(<ProductionReadiness/>);expect(screen.getByRole('alert')).toHaveTextContent('An active, verified centre leadership role is required');expect(mocks.rows).not.toHaveBeenCalled();});
it('fails closed on loading errors',async()=>{mocks.rows.mockResolvedValue({data:[],error:{message:'denied'}});render(<ProductionReadiness/>);expect(await screen.findByRole('alert')).toHaveTextContent('Launch status is unknown');});
it('sends the observed revision and retains entries after a conflicting review',async()=>{mocks.rpc.mockResolvedValue({error:{message:'Check changed; reload before reviewing'}});render(<ProductionReadiness/>);await screen.findByText('Record a review');fireEvent.change(screen.getByLabelText('Evidence reference'),{target:{value:'report-123'}});fireEvent.click(screen.getByText('Save review'));await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('review_production_check',expect.objectContaining({p_check:'check-1',p_revision:4,p_evidence:'report-123'})));expect(await screen.findByText(/Your entries are retained/)).toBeInTheDocument();expect(screen.getByLabelText('Evidence reference')).toHaveValue('report-123');expect(mocks.rows.mock.calls.every(args=>args[2]==='centre-1')).toBe(true);});

it('denies dormant director privileges while the user is actively a student',()=>{
 mocks.roles=['student','centre_director'];mocks.role='student';
 render(<ProductionReadiness/>);
 expect(screen.getByRole('alert')).toHaveTextContent('active, verified centre leadership role');
 expect(screen.queryByText('Record a review')).toBeNull();
 expect(mocks.rows).not.toHaveBeenCalled();
});
it('clears leadership data when the active role changes without changing the account',async()=>{
 const view=render(<ProductionReadiness/>);
 await screen.findByText('Record a review');
 const before=mocks.rows.mock.calls.length;
 mocks.roles=['centre_director','student'];mocks.role='student';
 view.rerender(<ProductionReadiness/>);
 expect(screen.queryByText('Record a review')).toBeNull();
 expect(screen.getByRole('alert')).toHaveTextContent('active, verified centre leadership role');
 expect(mocks.rows).toHaveBeenCalledTimes(before);
});
it('permits the course offer editor only for the active, verified superadmin',async()=>{
 mocks.roles=['superadmin','centre_director'];mocks.role='centre_director';
 const view=render(<ProductionReadiness/>);
 await screen.findByText('Record a review');
 expect(screen.queryByText('Course offer editor authorised')).toBeNull();
 mocks.role='superadmin';view.rerender(<ProductionReadiness/>);
 expect(screen.getByText('Course offer editor authorised')).toBeInTheDocument();
});
it('rejects unverified active roles even when the role string is leadership',()=>{
 mocks.roles=['student'];mocks.role='centre_director';
 render(<ProductionReadiness/>);
 expect(screen.getByRole('alert')).toHaveTextContent('active, verified centre leadership role');
 expect(mocks.rows).not.toHaveBeenCalled();
});
