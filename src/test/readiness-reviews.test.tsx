import {render,screen,cleanup,fireEvent,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({rows:vi.fn(),rpc:vi.fn(),roles:['centre_director'],role:'centre_director',history:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'staff-1',tenantId:'centre-1',role:mocks.role,roles:mocks.roles}})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{
 rpc:(...args:unknown[])=>mocks.rpc(...args),
 from:()=>{
  const query:any={select:()=>query,eq:()=>query,order:()=>query,limit:()=>mocks.history()};
  return query;
 },
}}));
vi.mock('@/components/assessment/CourseOfferEditor',()=>({default:()=> <p>Course offer editor authorised</p>}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/lib/workflowRows',()=>({workflowRows:(...args:unknown[])=>mocks.rows(...args)}));
import ProductionReadiness from '@/pages/superadmin/ProductionReadiness';
afterEach(cleanup);beforeEach(()=>{vi.clearAllMocks();mocks.roles=['centre_director'];mocks.role='centre_director';mocks.history.mockResolvedValue({data:[],error:null});mocks.rows.mockImplementation(async(_db,table)=>({data:table==='production_readiness_checks'?[{
 id:'check-1',tenant_id:'centre-1',check_key:'full_migration_replay',category:'security',
 status:'pending',revision:4,evidence_reference:null,checked_at:null,
 checked_by:null,notes:null,valid_until:null,
}]:[],error:null}));});
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
it('rejects returned evidence from a different centre instead of displaying its review controls',async()=>{
 mocks.rows.mockImplementation(async(_db,table)=>({
  data:table==='production_readiness_checks'?[{
   id:'foreign-check',tenant_id:'another-centre',
   check_key:'tenant_role_isolation',category:'security',status:'pending',
   revision:1,checked_at:null,checked_by:null,notes:null,
   evidence_reference:null,valid_until:null,
  }]:[],error:null,
 }));
 render(<ProductionReadiness/>);
 expect(await screen.findByRole('alert')).toHaveTextContent('could not be verified');
 expect(screen.queryByText('Record a review')).toBeNull();
 expect(mocks.rpc).not.toHaveBeenCalled();
});
it('denies duplicate launch check rows rather than claiming their status',async()=>{
 mocks.rows.mockImplementation(async(_db,table)=>({
  data:table==='production_readiness_checks'?[
   {id:'check-a',tenant_id:'centre-1',check_key:'tenant_role_isolation',category:'security',
    status:'pass',revision:1,checked_at:null,checked_by:null,notes:null,
    evidence_reference:null,valid_until:null},
   {id:'check-b',tenant_id:'centre-1',check_key:'tenant_role_isolation',category:'security',
    status:'pass',revision:1,checked_at:null,checked_by:null,notes:null,
    evidence_reference:null,valid_until:null},
  ]:[],error:null,
 }));
 render(<ProductionReadiness/>);
 expect(await screen.findByRole('alert')).toHaveTextContent('could not be verified');
 expect(screen.queryByText('Record a review')).toBeNull();
});
it('rejects unverified active roles even when the role string is leadership',()=>{
 mocks.roles=['student'];mocks.role='centre_director';
 render(<ProductionReadiness/>);
 expect(screen.getByRole('alert')).toHaveTextContent('active, verified centre leadership role');
 expect(mocks.rows).not.toHaveBeenCalled();
});

it('clears previously accepted audit history when a new history response fails centre verification',async()=>{
 const prior={
  id:'history-one',tenant_id:'centre-1',check_id:'check-1',
  revision:2,old_status:'pending',new_status:'pass',
  evidence_reference:'approved-review-42',notes:null,valid_until:null,
  reviewed_by:'reviewer-one',created_at:'2026-11-18T12:00:00Z',
 };
 mocks.history.mockResolvedValueOnce({data:[prior],error:null})
  .mockResolvedValueOnce({data:[{...prior,tenant_id:'other-centre'}],error:null});
 render(<ProductionReadiness/>);
 await screen.findByText('Record a review');
 fireEvent.click(screen.getByRole('button',{name:'Load latest 20 reviews'}));
 expect(await screen.findByText(/Revision 2: pending/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Load latest 20 reviews'}));
 expect(await screen.findByText('Review history unavailable. Retry.')).toBeInTheDocument();
 expect(screen.queryByText(/Revision 2: pending/)).toBeNull();
});

it('does not allow an existing mandatory waiver to clear a launch check',async()=>{
 mocks.rows.mockImplementation(async(_db,table)=>({data:table==='production_readiness_checks'?[{
  id:'check-1',tenant_id:'centre-1',check_key:'tenant_role_isolation',category:'security',
  status:'not_applicable',revision:4,evidence_reference:'waiver-123',checked_at:'2026-11-18T12:00:00Z',
  checked_by:'reviewer',notes:'Legacy exception',valid_until:null,
 }]:[],error:null}));
 render(<ProductionReadiness/>);
 expect(await screen.findByText('This critical launch check requires a current evidenced pass. An exemption cannot clear it.')).toBeInTheDocument();
 expect(screen.getByRole('option',{name:'not_applicable'})).toBeDisabled();
 expect(screen.getByText('Save review')).toBeDisabled();
 fireEvent.change(screen.getByLabelText('Decision'),{target:{value:'blocked'}});
 expect(screen.getByText('Save review')).toBeEnabled();
 expect(mocks.rpc).not.toHaveBeenCalled();
 expect(screen.getByText(/Production activation register/)).toBeInTheDocument();
});
it('retains a documented optional exemption decision for an out-of-scope capability',async()=>{
 mocks.rows.mockImplementation(async(_db,table)=>({data:table==='production_readiness_checks'?[{
  id:'check-1',tenant_id:'centre-1',check_key:'cctv_security_playback',category:'security',
  status:'pending',revision:1,evidence_reference:null,checked_at:null,checked_by:null,notes:null,valid_until:null,
 }]:[],error:null}));
 render(<ProductionReadiness/>);
 await screen.findByText('Record a review');
 expect(screen.getByRole('option',{name:'not_applicable'})).toBeEnabled();
});
