import {readFileSync} from 'node:fs';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import ModuleMaterials from '@/pages/learning/ModuleMaterials';

const mock=vi.hoisted(()=>({
 user:{id:'student',tenantId:'centre',role:'student',roles:['student']},
 query:vi.fn(),sign:vi.fn(),rpc:vi.fn(),
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mock.user})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/components/assessment/ModuleJourney',()=>({default:()=>null}));
vi.mock('@/lib/db',()=>({db:{from:mock.query,rpc:mock.rpc}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:mock.rpc,storage:{from:()=>({createSignedUrl:mock.sign})}}}));
beforeEach(()=>{vi.clearAllMocks();mock.user={id:'student',tenantId:'centre',role:'student',roles:['student']};});
afterEach(cleanup);
const mount=(path='/student/materials')=>render(<MemoryRouter initialEntries={[path]}><ModuleMaterials/></MemoryRouter>);
const source=readFileSync('src/pages/learning/ModuleMaterials.tsx','utf8');

describe('staged materials cannot bypass the post-class publishing and storage controls',()=>{
 it('shows a transparent disabled state and never reads private resources before backend activation',async()=>{
  mount();await screen.findByRole('alert');
  expect(screen.getByText(/Secure post-class release is not yet enabled on this backend/)).toBeInTheDocument();
  expect(mock.query).not.toHaveBeenCalled();
  expect(mock.rpc).not.toHaveBeenCalled();
  expect(mock.sign).not.toHaveBeenCalled();
  expect(screen.queryByRole('button',{name:'Open'})).toBeNull();
 });
 it('does not reveal selected material IDs through direct links while the service is disabled',async()=>{
  mount('/student/materials?module=other&material=private-id');
  await screen.findByRole('alert');
  expect(screen.queryByText('private-id')).toBeNull();
  expect(mock.query).not.toHaveBeenCalled();
  expect(mock.sign).not.toHaveBeenCalled();
 });
 it('keeps lecturer publishing and upload buttons disabled, even with a rights acknowledgement',async()=>{
  mock.user={id:'lecturer',tenantId:'centre',role:'lecturer',roles:['lecturer']};
  mount('/lecturer/materials');
  await screen.findByRole('alert');
  expect(screen.getByRole('button',{name:'Save secure draft'})).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox',{name:'Confirm teaching material distribution rights'}));
  expect(screen.getByRole('button',{name:'Save secure draft'})).toBeDisabled();
  expect(mock.query).not.toHaveBeenCalled();
  expect(mock.rpc).not.toHaveBeenCalled();
 });
 it('does not confer lecturer rights from an inactive secondary membership',async()=>{
  mock.user={id:'lecturer',tenantId:'centre',role:'student',roles:['student','lecturer']};
  mount();await screen.findByRole('alert');
  expect(screen.queryByRole('heading',{name:'Upload teaching material'})).toBeNull();
 });
 it('requires active enrolment, module scope and private file signing in source',()=>{
  expect(source).toContain("from('student_enrolments')");
  expect(source).toContain(".eq('student_id',uid).eq('status','active')");
  expect(source).toContain("if(staff&&!manager)q=q.eq('lecturer_id',uid)");
  expect(source).toContain("class_session_id:classSessionId||null");
  expect(source).toContain("'can_open_my_unipathway_material'");
  expect(source).toContain("createSignedUrl(m.object_path,120)");
  expect(source).toContain("'publish_unipathway_course_material'");
  expect(source).not.toContain('available_at:new Date().toISOString()');
 });
 it('requires independent preparatory classification and teaching distribution rights',()=>{
  expect(source).toContain('rightsAcknowledged');
  expect(source).toContain('preparatoryOnly');
  expect(source).toContain('(!classSessionId&&!preparatoryOnly)');
  expect(source).toContain('publication_status:\'draft\'');
  expect(source).toContain('!classReleaseEnabled');
 });
});
