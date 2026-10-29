import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import StudentCareer from '@/pages/student/StudentCareer';
const state=vi.hoisted(()=>({failed:false,retry:vi.fn()}));
vi.mock('@/hooks/useSupabaseQuery',()=>({useSupabaseQuery:(table:string)=>({data:[],loading:false,error:state.failed&&table!=='programmes'?'unavailable':null,refetch:state.retry})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/components/career/ProgressionPathway',()=>({default:()=>null}));vi.mock('@/components/career/PartnerCareerLinks',()=>({default:()=>null}));vi.mock('@/components/career/EntryRequirements',()=>({default:()=>null}));vi.mock('@/components/career/AccreditationPartners',()=>({default:()=>null}));
afterEach(cleanup);beforeEach(()=>{state.failed=false;state.retry.mockReset();});
it('opens the university and jobs tabs from their shortcut buttons',()=>{
 render(<StudentCareer/>);fireEvent.click(screen.getByRole('button',{name:'Browse universities'}));expect(screen.getByRole('tab',{name:'Universities'})).toHaveAttribute('aria-selected','true');expect(screen.getByText(/No partner universities found/)).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Browse jobs'}));expect(screen.getByRole('tab',{name:'Jobs'})).toHaveAttribute('aria-selected','true');expect(screen.getByText(/No job listings available/)).toBeVisible();
});
it('keeps failed reads separate from empty lists and exposes retries',()=>{
 state.failed=true;render(<StudentCareer/>);fireEvent.click(screen.getByRole('button',{name:'Browse universities'}));expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded');expect(screen.queryByText(/No partner universities found/)).toBeNull();fireEvent.click(screen.getByText('Retry universities'));
 fireEvent.click(screen.getByRole('button',{name:'Browse jobs'}));expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded');expect(screen.queryByText(/No job listings available/)).toBeNull();fireEvent.click(screen.getByText('Retry opportunities'));expect(state.retry).toHaveBeenCalledTimes(2);
});
it('uses a keyboard-operable CV trigger and labels each field',()=>{
 render(<StudentCareer/>);fireEvent.click(screen.getByRole('button',{name:/CV Builder/}));
 for(const label of ['Full Name','Email','Phone','Professional Summary','Skills (comma-separated)','Work Experience'])expect(screen.getByLabelText(label)).toBeInTheDocument();
});
