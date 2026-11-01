import {render,screen,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({query:vi.fn(),user:{id:'staff',tenantId:'centre',role:'exams_officer',roles:['exams_officer']} as any}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mocks.user})}));
vi.mock('@/hooks/useSupabaseQuery',()=>({useSupabaseQuery:(...args:unknown[])=>mocks.query(...args)}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
import ExamsDashboard from '@/pages/exams/ExamsDashboard';
import QADashboard from '@/pages/qa/QADashboard';
afterEach(cleanup);
beforeEach(()=>{vi.clearAllMocks();mocks.user={id:'staff',tenantId:'centre',role:'exams_officer',roles:['exams_officer']};mocks.query.mockReturnValue({data:[],loading:false,error:null,refetch:vi.fn()});});
it('shows only centre-owned recorded exam events, without invented rooms or invigilators',()=>{
 mocks.query.mockReturnValue({data:[
  {id:'exam',tenant_id:'centre',event_type:'exam',title:'Recorded exam',start_date:'2026-11-01T09:00:00Z',location:null},
  {id:'other',tenant_id:'another-centre',event_type:'exam',title:'Other centre exam',start_date:'2026-11-01T09:00:00Z'},
  {id:'class',tenant_id:'centre',event_type:'class',title:'Ordinary lesson',start_date:'2026-11-01T09:00:00Z'},
 ],loading:false,error:null});
 render(<MemoryRouter initialEntries={['/exams']}><ExamsDashboard/></MemoryRouter>);
 expect(screen.getByText('Recorded exam')).toBeInTheDocument();
 expect(screen.getByText('Location: Not assigned')).toBeInTheDocument();
 expect(screen.queryByText('Other centre exam')).toBeNull();
 expect(screen.queryByText('Ordinary lesson')).toBeNull();
 expect(mocks.query.mock.calls[0][1].filters).toContainEqual({column:'tenant_id',operator:'eq',value:'centre'});
 expect(mocks.query.mock.calls[0][1].enabled).toBe(true);
});
it('shows unconnected examination services without fake incident saving',()=>{
 render(<MemoryRouter initialEntries={['/exams/incidents']}><ExamsDashboard/></MemoryRouter>);
 expect(screen.getByText(/persistent exam incident workflow is not connected/)).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:/Log Incident/})).not.toBeInTheDocument();
});
it('never treats an exam query failure as an empty timetable',()=>{
 mocks.query.mockReturnValue({data:[],error:'denied',loading:false});
 render(<MemoryRouter><ExamsDashboard/></MemoryRouter>);
 expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded');
 expect(screen.queryByText('No exam events have been recorded.')).toBeNull();
});
it('blocks exam reads when the account switches to another active role',()=>{
 mocks.user={id:'staff',tenantId:'centre',role:'student',roles:['student','exams_officer']};
 render(<MemoryRouter><ExamsDashboard/></MemoryRouter>);
 expect(mocks.query.mock.calls[0][1].enabled).toBe(false);
 expect(screen.getByRole('alert')).toHaveTextContent('verified Exams Officer');
});
it('directs centre programme leaders to their own quality workflows without loading learner submissions',()=>{
 mocks.user={id:'staff',tenantId:'centre',role:'programme_leader',roles:['programme_leader']};
 render(<MemoryRouter initialEntries={['/programme/moderation']}><QADashboard/></MemoryRouter>);
 expect(screen.getByRole('link',{name:/Independent assessment allocation/})).toHaveAttribute('href','/programme/assessments');
 expect(screen.queryByText('Recorded feedback')).toBeNull();
 expect(mocks.query).not.toHaveBeenCalled();
});
it('blocks unapproved QA roles and cannot load legacy submissions',()=>{
 mocks.user={id:'staff',tenantId:'centre',role:'agent',roles:['agent','iqa_officer']};
 render(<MemoryRouter><QADashboard/></MemoryRouter>);
 expect(screen.getByRole('alert')).toHaveTextContent('active, centre-verified');
 expect(mocks.query).not.toHaveBeenCalled();
});
