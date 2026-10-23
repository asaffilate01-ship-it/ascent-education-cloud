import {render,screen,cleanup} from '@testing-library/react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({rows:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'staff-1',tenantId:'centre-1',roles:['centre_director']}})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
vi.mock('@/components/progression/IntelligenceCalculations',()=>({default:()=>null}));
vi.mock('@/components/progression/FactoryOperations',()=>({default:()=>null}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/lib/workflowRows',()=>({workflowRows:(...args:unknown[])=>mocks.rows(...args)}));
import EducationIntelligence from '@/pages/analytics/EducationIntelligence';
afterEach(cleanup);beforeEach(()=>vi.clearAllMocks());
it('distinguishes failed intelligence reads from a genuine empty state',async()=>{mocks.rows.mockResolvedValue({data:[],error:{message:'denied'}});render(<EducationIntelligence/>);expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded completely');expect(screen.queryByText('No student intelligence records have been calculated.')).not.toBeInTheDocument();});
it('shows snapshot provenance, learner ID and unavailable metrics without inventing health',async()=>{
 mocks.rows.mockImplementation(async(_db,table)=>({data:table==='omniqora_student_intelligence'?[{id:'record-1',student_id:'learner-1',risk_score:0,attendance_score:null,engagement_score:null,assessment_score:null,calculated_at:'2026-10-15T12:00:00Z',human_review_status:'pending'}]:[],error:null}));render(<EducationIntelligence/>);await screen.findByText('Student: learner-1');expect(screen.getByText(/Attendance Not available/)).toBeInTheDocument();expect(screen.queryByText('On track')).not.toBeInTheDocument();expect(mocks.rows.mock.calls.every(args=>args[2]==='centre-1')).toBe(true);expect(screen.getByText(/stored snapshots, not live calculations/)).toBeInTheDocument();
});

it('reads the cohort generator table and shows the latest centre snapshot without zero-filling missing metrics',async()=>{
 mocks.rows.mockImplementation(async(_db,table)=>({data:table==='omniqora_cohort_intelligence'?[{id:'c',course_id:'course-a',cohort_reference:'Autumn',learner_count:8,high_attention_count:2,completion_rate:null,attendance_rate:null,resubmission_rate:null,calculated_at:'2026-10-23T12:00:00Z'}]:table==='omniqora_executive_snapshots'?[{id:'x',snapshot_date:'2026-10-23',learners:8,active_courses:1,high_attention:2,attendance_rate:null,completion_rate:null,engagement_score:null,open_interventions:0,labs_completed:0,placements_completed:0}]:[],error:null}));
 render(<EducationIntelligence/>);await screen.findByText('Cohort: Autumn');expect(screen.getByText(/Enrolled learners: 8/)).toBeInTheDocument();expect(screen.getByText(/Recorded attendance: Not available/)).toBeInTheDocument();expect(mocks.rows.mock.calls.some(args=>args[1]==='omniqora_course_intelligence')).toBe(false);
});
it('excludes legacy risk models from the recorded attendance high-risk total',async()=>{
 mocks.rows.mockImplementation(async(_db,table)=>({data:table==='omniqora_student_intelligence'?[{id:'legacy',student_id:'a',risk_score:99,model_version:'legacy',calculated_at:'2026-10-23'},{id:'measured',student_id:'b',risk_score:70,model_version:'recorded-attendance-v2',calculated_at:'2026-10-23'}]:[],error:null}));render(<EducationIntelligence/>);await screen.findByText('Student: a');expect(screen.getByText('Recorded attendance risk 70+').parentElement).toHaveTextContent('1');
});
