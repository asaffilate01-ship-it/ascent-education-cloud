import {render,screen,cleanup} from '@testing-library/react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({rows:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'staff-1',tenantId:'centre-1',roles:['centre_director']}})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
vi.mock('@/components/progression/FactoryOperations',()=>({default:()=>null}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/lib/workflowRows',()=>({workflowRows:(...args:unknown[])=>mocks.rows(...args)}));
import EducationIntelligence from '@/pages/analytics/EducationIntelligence';
afterEach(cleanup);beforeEach(()=>vi.clearAllMocks());
it('distinguishes failed intelligence reads from a genuine empty state',async()=>{mocks.rows.mockResolvedValue({data:[],error:{message:'denied'}});render(<EducationIntelligence/>);expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded completely');expect(screen.queryByText('No student intelligence records have been calculated.')).not.toBeInTheDocument();});
it('shows snapshot provenance, learner ID and unavailable metrics without inventing health',async()=>{
 mocks.rows.mockImplementation(async(_db,table)=>({data:table==='omniqora_student_intelligence'?[{id:'record-1',student_id:'learner-1',risk_score:0,attendance_score:null,engagement_score:null,assessment_score:null,calculated_at:'2026-10-15T12:00:00Z',human_review_status:'pending'}]:[],error:null}));render(<EducationIntelligence/>);await screen.findByText('Student: learner-1');expect(screen.getByText(/Attendance Not available/)).toBeInTheDocument();expect(screen.queryByText('On track')).not.toBeInTheDocument();expect(mocks.rows.mock.calls.every(args=>args[2]==='centre-1')).toBe(true);expect(screen.getByText(/stored snapshots, not live calculations/)).toBeInTheDocument();
});
