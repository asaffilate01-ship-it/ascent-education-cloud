import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';

const mocks=vi.hoisted(()=>({
 user:{id:'exam-officer',tenantId:'jhelum',role:'exams_officer',roles:['exams_officer'] as string[]},
 data:[] as Record<string,unknown>[],
 loading:false,error:null as string|null,refetch:vi.fn(),
 queries:[] as unknown[],
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mocks.user})}));
vi.mock('@/hooks/useSupabaseQuery',()=>({useSupabaseQuery:(table:string,opts:unknown)=>{
 mocks.queries.push([table,opts]);return {data:mocks.data,loading:mocks.loading,error:mocks.error,refetch:mocks.refetch};
}}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
import ExamsDashboard from '@/pages/exams/ExamsDashboard';

const event=(id:string,start_date='2026-11-18T19:00:00Z',end_date='2026-11-18T21:00:00Z')=>({
 id,tenant_id:'jhelum',event_type:'exam',title:'Exam '+id,start_date,end_date,
 all_day:false,location:'Room 1',description:null,
});
const mount=(path='/exams')=>render(<MemoryRouter initialEntries={[path]}><ExamsDashboard/></MemoryRouter>);
beforeEach(()=>{
 mocks.user={id:'exam-officer',tenantId:'jhelum',role:'exams_officer',roles:['exams_officer']};
 mocks.data=[event('alpha')];mocks.loading=false;mocks.error=null;mocks.queries=[];vi.clearAllMocks();
});
afterEach(cleanup);

it('renders verified exam dates in Pakistan time and provides accessible section navigation',()=>{
 mount();
 expect(screen.getByText('Exam alpha')).toBeInTheDocument();
 expect(screen.getByText(/19 Nov 2026.*Pakistan time/)).toBeInTheDocument();
 expect(screen.getByRole('link',{name:'schedule'})).toHaveAttribute('aria-current','page');
 expect(screen.getByRole('link',{name:'rooms'})).toHaveAttribute('href','/exams/rooms');
 expect(screen.getByText(/invigilator assignments/)).toBeInTheDocument();
});

it('does not show cross-centre or duplicated exam records as an empty valid timetable',()=>{
 mocks.data=[{...event('foreign'),tenant_id:'different-centre'}];
 mount();
 expect(screen.getByRole('alert')).toHaveTextContent('could not be verified');
 expect(screen.queryByText('Exam foreign')).toBeNull();
 expect(screen.queryByText('No exam events have been recorded.')).toBeNull();
 expect(mocks.queries[0][1]).toMatchObject({
  enabled:true,filters:[{column:'tenant_id',operator:'eq',value:'jhelum'},{column:'event_type',operator:'eq',value:'exam'}],
 });
});

it('marks corrupt exam dates as unavailable while retaining the timetable item for review',()=>{
 mocks.data=[event('alpha','2026-11-18T19:00:00','2026-11-18T21:00:00Z')];
 mount();
 const details=screen.getByText('Exam alpha').closest('article');
 expect(details).not.toBeNull();
 expect(within(details!).getByText(/Date unavailable/)).toBeInTheDocument();
 expect(within(details!).getByText('Review needed: invalid start or finish date')).toBeInTheDocument();
});

it('fails closed on source errors and offers an explicit retry',()=>{
 mocks.error='service denied';
 mount();
 expect(screen.getByRole('alert')).toHaveTextContent('could not be verified');
 expect(screen.queryByText('No exam events have been recorded.')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Retry exam events'}));
 expect(mocks.refetch).toHaveBeenCalledTimes(1);
});

it('does not leak exam events after the verified active role is changed',()=>{
 mocks.user={...mocks.user,role:'student',roles:['student','exams_officer']};
 mount();
 expect(screen.getByRole('alert')).toHaveTextContent('Exams Officer role');
 expect(screen.queryByText('Exam alpha')).toBeNull();
 expect(mocks.queries[0][1]).toMatchObject({enabled:false});
});

it('recovers when a previously selected results page disappears after a source refresh',()=>{
 mocks.data=Array.from({length:21},(_,i)=>event(String(i).padStart(2,'0')));
 const view=mount();
 fireEvent.click(screen.getByRole('button',{name:'Next exams'}));
 expect(screen.getByText('Exam 20')).toBeInTheDocument();
 mocks.data=[event('only')];
 view.rerender(<MemoryRouter initialEntries={['/exams']}><ExamsDashboard/></MemoryRouter>);
 expect(screen.getByText('Exam only')).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Next exams'})).toBeDisabled();
});
