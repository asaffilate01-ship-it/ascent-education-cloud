import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({
  user:{id:'learner-a',tenantId:'centre-a',role:'student',roles:['student']} as
    {id:string;tenantId:string;role:string;roles:string[]}|null,
  loading:false,query:vi.fn(),refetch:vi.fn(),
  rows:[] as Array<Record<string,unknown>>,error:null as string|null,loadingRows:false,
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mocks.user,loading:mocks.loading})}));
vi.mock('@/hooks/useSupabaseQuery',()=>({useSupabaseQuery:(table:string,options:unknown)=>{
  mocks.query(table,options);
  return {data:mocks.rows,loading:mocks.loadingRows,error:mocks.error,refetch:mocks.refetch};
}}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({title,children}:{title:string;children:React.ReactNode})=><main><h1>{title}</h1>{children}</main>}));
import StudentApplications from '@/pages/student/StudentApplications';
const app=(id:string,overrides:Record<string,unknown>={})=>({
  id,tenant_id:'centre-a',user_id:'learner-a',programme_name:'Level 4 Business',
  stage:'under_review',created_at:'2026-11-01T09:00:00Z',updated_at:'2026-11-08T09:00:00Z',...overrides,
});
const show=()=>render(<MemoryRouter><StudentApplications/></MemoryRouter>);
beforeEach(()=>{
  vi.clearAllMocks();
  mocks.user={id:'learner-a',tenantId:'centre-a',role:'student',roles:['student']};
  mocks.loading=false;mocks.loadingRows=false;mocks.error=null;mocks.rows=[];
});
afterEach(cleanup);

it('queries only the linked learner and centre with a minimum metadata projection',()=>{
  mocks.rows=[app('case-a'),app('case-b',{user_id:'someone-else',programme_name:'Other student secret'}),
    app('case-c',{tenant_id:'centre-b',programme_name:'Other centre secret'})];
  show();
  const [table,options]=mocks.query.mock.calls[0];
  expect(table).toBe('applications');
  expect(options.enabled).toBe(true);
  expect(options.filters).toEqual([
    {column:'tenant_id',operator:'eq',value:'centre-a'},
    {column:'user_id',operator:'eq',value:'learner-a'},
  ]);
  expect(options.select).not.toContain('notes');
  expect(options.select).not.toContain('email');
  expect(options.select).not.toContain('document');
  expect(screen.getByText('Level 4 Business')).toBeInTheDocument();
  expect(screen.queryByText('Other student secret')).toBeNull();
  expect(screen.queryByText('Other centre secret')).toBeNull();
  expect(screen.getByText(/Only cases linked to your account appear/)).toBeInTheDocument();
});
it('does not expose records to an unverified active role or centre',()=>{
  mocks.user={id:'staff',tenantId:'centre-a',role:'admissions_admin',roles:['student','admissions_admin']};
  show();
  expect(mocks.query.mock.calls[0][1].enabled).toBe(false);
  expect(screen.getByRole('alert')).toHaveTextContent('A verified student role');
  expect(screen.queryByText('Level 4 Business')).toBeNull();
});
it('distinguishes a failed application read from a genuinely empty account-linked list',()=>{
  mocks.error='unavailable';const view=show();
  expect(screen.getByRole('alert')).toHaveTextContent('could not be verified');
  expect(screen.queryByText('No account-linked applications found')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Retry applications'}));
  expect(mocks.refetch).toHaveBeenCalledOnce();
  view.unmount();mocks.error=null;show();
  expect(screen.getByRole('heading',{name:'No account-linked applications found'})).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Explore study and application options'})).toHaveAttribute('href','/apply');
});
it('keeps stage display provisional and never asserts paid, accepted or certified outcomes',()=>{
  mocks.rows=[app('paid',{stage:'deposit_paid'}),app('offer',{stage:'unconditional_offer',programme_name:'Level 5 Computing'}),
    app('enrolled',{stage:'enrolled',programme_name:'Level 3 English'})];
  show();
  expect(screen.getByText('Deposit stage recorded')).toBeInTheDocument();
  expect(screen.getByText(/not verified payment settlement/)).toBeInTheDocument();
  expect(screen.getByText('Unconditional offer stage recorded')).toBeInTheDocument();
  expect(screen.getByText(/Confirm the formal offer document/)).toBeInTheDocument();
  expect(screen.getByText('Enrolment stage recorded')).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Check my active enrolments'})).toHaveAttribute('href','/student/courses');
  expect(screen.queryByText('Payment confirmed')).toBeNull();
});
it('supports filtering and resetting scoped application history on account change',()=>{
  mocks.rows=Array.from({length:14},(_,i)=>app('case-'+i,{programme_name:'Business '+i}));
  const view=show();
  expect(within(screen.getByRole('region',{name:'Your linked application records'})).getAllByRole('article')).toHaveLength(12);
  fireEvent.click(screen.getByRole('button',{name:'Next page'}));
  expect(screen.getByText('Business 12')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox',{name:'Search your applications'}),{target:{value:'Business 13'}});
  expect(screen.getByText('Business 13')).toBeInTheDocument();
  expect(screen.queryByText('Business 12')).toBeNull();
  mocks.user={id:'learner-b',tenantId:'centre-b',role:'student',roles:['student']};
  mocks.rows=[app('new',{tenant_id:'centre-b',user_id:'learner-b',programme_name:'New linked programme'})];
  view.rerender(<MemoryRouter><StudentApplications/></MemoryRouter>);
  expect(screen.queryByDisplayValue('Business 13')).toBeNull();
  expect(screen.queryByText('Business 13')).toBeNull();
  expect(screen.getByText('New linked programme')).toBeInTheDocument();
  expect(mocks.query.mock.calls.at(-1)?.[1].filters).toContainEqual({column:'user_id',operator:'eq',value:'learner-b'});
});
