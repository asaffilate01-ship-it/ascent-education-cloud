import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import StudentCourses from '@/pages/student/StudentCourses';
const state=vi.hoisted(()=>({user:{id:'learner',tenantId:'centre',role:'student'},tables:{} as Record<string,any[]>,error:'',loading:false,query:vi.fn(),refetch:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user})}));vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:any)=><main>{children}</main>}));
vi.mock('@/hooks/useSupabaseQuery',()=>({useSupabaseQuery:(table:string,options:any)=>{state.query(table,options);return {data:state.user.id==='learner'?state.tables[table]||[]:[],loading:state.loading,error:state.error,refetch:state.refetch};}}));
beforeEach(()=>{state.user={id:'learner',tenantId:'centre',role:'student'};state.error='';state.loading=false;state.query.mockClear();state.refetch.mockReset().mockResolvedValue(undefined);state.tables={student_enrolments:[{programme_id:'p1'},{programme_id:'p2'}],programmes:[{id:'p1',title:'Computing diploma',awarding_body:'OTHM',level:'5'},{id:'p2',title:'Business diploma',awarding_body:'Qualifi',level:'4'},{id:'other',title:'Private unrelated course'}],modules:[{id:'m1',programme_id:'p1',title:'Network design',code:'NET101',status:'active'},{id:'m2',programme_id:'p1',title:'Archived security module',code:'SEC102',status:'archived'},{id:'m3',programme_id:'p2',title:'Business planning',code:'BUS101',status:'active'},{id:'secret',programme_id:'other',title:'Private unrelated module'}]};});afterEach(cleanup);
const mount=()=>render(<MemoryRouter><StudentCourses/></MemoryRouter>);
it('scopes programme and module queries to active enrolments and the current centre',()=>{
 mount();const options=(table:string)=>state.query.mock.calls.find(c=>c[0]===table)![1];
 expect(options('student_enrolments').filters).toEqual(expect.arrayContaining([{column:'student_id',operator:'eq',value:'learner'},{column:'tenant_id',operator:'eq',value:'centre'},{column:'status',operator:'eq',value:'active'}]));
 expect(options('programmes').filters).toContainEqual({column:'id',operator:'in',value:['p1','p2']});expect(options('modules').filters).toContainEqual({column:'programme_id',operator:'in',value:['p1','p2']});expect(options('modules').enabled).toBe(true);
 expect(screen.queryByText('Private unrelated course')).toBeNull();expect(screen.queryByText('Private unrelated module')).toBeNull();expect(screen.getByText(/Module status: archived/)).toBeInTheDocument();
});
it('searches course/body and module title/code without showing unrelated enrolled modules',()=>{
 mount();const input=screen.getByLabelText('Find my course or module');fireEvent.change(input,{target:{value:' net101 '}});expect(screen.getByText('Network design')).toBeInTheDocument();expect(screen.queryByText('Archived security module')).toBeNull();expect(screen.queryByText('Business diploma')).toBeNull();expect(screen.getByRole('link',{name:'Network design'})).toHaveAttribute('href','/student/module?module=m1');
 fireEvent.change(input,{target:{value:'OTHM'}});expect(screen.getByText('Archived security module')).toBeInTheDocument();expect(screen.queryByText('Business diploma')).toBeNull();fireEvent.change(input,{target:{value:'zz-not-enrolled'}});expect(screen.getByText(/No enrolled courses or modules match/)).toBeInTheDocument();fireEvent.click(screen.getByText('Clear my course search'));expect(input).toHaveFocus();expect(screen.getByText('Business diploma')).toBeInTheDocument();
});
it('paginates course and module cards and resets module paging on a new search',()=>{
 state.tables.programmes=Array.from({length:7},(_,i)=>({id:`p${i}`,title:`Programme ${i}`}));state.tables.student_enrolments=state.tables.programmes.map(p=>({programme_id:p.id}));state.tables.modules=Array.from({length:8},(_,i)=>({id:`m${i}`,programme_id:'p0',title:`Module ${i}`,code:`C${i}`,status:'active'}));mount();
 expect(screen.queryByText('Programme 6')).toBeNull();const p0=screen.getByRole('region',{name:'Enrolled programme Programme 0'});expect(within(p0).queryByText('Module 7')).toBeNull();fireEvent.click(within(p0).getByRole('button',{name:'Next modules for Programme 0'}));expect(within(p0).getByText('Module 7')).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Find my course or module'),{target:{value:'Module'}});expect(screen.getByText('Module 0')).toBeInTheDocument();fireEvent.click(screen.getByText('Clear my course search'));fireEvent.click(screen.getByText('Next courses'));expect(screen.getByText('Programme 6')).toBeInTheDocument();
});
it('keeps failed reads distinct from no enrolments and supports retry',()=>{
 state.error='offline';mount();expect(screen.getByRole('alert')).toHaveTextContent('could not be verified');expect(screen.queryByText(/No active enrolments yet/)).toBeNull();fireEvent.click(screen.getByText('Retry my courses'));expect(state.refetch).toHaveBeenCalledTimes(3);
});
it('does not request programme or module lists without an active enrolment',()=>{
 state.tables.student_enrolments=[];mount();expect(screen.getByText(/No active enrolments yet/)).toBeInTheDocument();for(const table of ['programmes','modules'])expect(state.query.mock.calls.find(c=>c[0]===table)?.[1].enabled).toBe(false);
});
it('clears search and course content immediately when account scope changes',()=>{
 const view=mount();fireEvent.change(screen.getByLabelText('Find my course or module'),{target:{value:'Network'}});state.user={id:'other',tenantId:'another',role:'student'};view.rerender(<MemoryRouter><StudentCourses/></MemoryRouter>);expect(screen.queryByDisplayValue('Network')).toBeNull();expect(screen.queryByText('Network design')).toBeNull();expect(screen.getByText(/No active enrolments yet/)).toBeInTheDocument();
});
