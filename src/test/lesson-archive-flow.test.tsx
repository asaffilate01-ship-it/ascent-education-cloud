import {readFileSync} from 'node:fs';
import {cleanup,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import LessonArchive from '@/pages/student/LessonArchive';
import ClassRecordingPlayer from '@/components/learning/ClassRecordingPlayer';
import {classMediaUrl} from '@/lib/learning/classMedia';
import {archiveAudience,publishedArchiveAssetAvailable} from '@/lib/learning/archiveAccess';

const state=vi.hoisted(()=>({
 user:{id:'student',tenantId:'centre',role:'student',roles:['student']},
 query:vi.fn(),rpc:vi.fn(),sign:vi.fn(),
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/components/assessment/ModuleJourney',()=>({default:()=>null}));
vi.mock('@/lib/db',()=>({db:{from:state.query}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:state.rpc,storage:{from:()=>({createSignedUrl:state.sign})}}}));
beforeEach(()=>{vi.clearAllMocks();state.user={id:'student',tenantId:'centre',role:'student',roles:['student']};});
afterEach(cleanup);
const mount=()=>render(<MemoryRouter><LessonArchive/></MemoryRouter>);
const source=readFileSync('src/pages/student/LessonArchive.tsx','utf8');

describe('private lesson archive with staged post-class service',()=>{
 it('does not list a centre-wide class history before backend verification',async()=>{
  mount();await screen.findByRole('alert');
  expect(screen.getByRole('alert')).toHaveTextContent(/could not be verified/i);
  expect(screen.getByText(/24 hours after the class has actually ended/)).toBeInTheDocument();
  expect(state.query).not.toHaveBeenCalled();
  expect(state.sign).not.toHaveBeenCalled();
 });
 it('refuses to reveal class history to unauthorised active roles',()=>{
  expect(archiveAudience({...state.user,role:'finance_officer',roles:['finance_officer']})).toBe('blocked');
  expect(archiveAudience({...state.user,role:'lecturer',roles:['student']})).toBe('blocked');
  expect(archiveAudience({...state.user,tenantId:''})).toBe('blocked');
 });
 it('requires enrolled programmes or allocated lecturer modules before reading sessions',()=>{
  expect(source).toContain("from('student_enrolments')");
  expect(source).toContain(".eq('student_id',uid).eq('status','active')");
  expect(source).toContain(".eq('lecturer_id',uid)");
  expect(source).toContain(".in('module_id',batch)");
  expect(source).toContain('rowsByIds<Session>(moduleIds');
 });
 it('keeps recordings locked without verified actual class end and a release timestamp',()=>{
  const session={status:'ended',ends_at:'2026-11-01T10:00:00Z',actual_ended_at:'2026-11-01T10:30:00Z'};
  const now=Date.parse('2026-11-02T12:00:00Z');
  expect(publishedArchiveAssetAvailable({publication_status:'published',available_at:null},session,now)).toBe(false);
  expect(publishedArchiveAssetAvailable({publication_status:'published',available_at:'2026-11-01T10:30:00Z'},session,now)).toBe(false);
  expect(publishedArchiveAssetAvailable({publication_status:'published',available_at:'2026-11-02T10:30:00Z'},{...session,status:'cancelled'},now)).toBe(false);
  expect(source).toContain('publishedArchiveAssetAvailable');
  expect(source).toContain('archiveMinimumEmbargoElapsed');
 });
 it('requires server permission before requesting a private media signing URL',async()=>{
  await expect(classMediaUrl('private/recording')).rejects.toThrow('not been activated');
  expect(state.rpc).not.toHaveBeenCalled();
  expect(state.sign).not.toHaveBeenCalled();
  expect(source).toContain('classMediaUrl(a.storage_reference)');
 });
 it('renders an inaccessible media error rather than playing a mocked public recording',async()=>{
  render(<MemoryRouter><ClassRecordingPlayer path="private/recording" title="Algebra" onClose={()=>{}}/></MemoryRouter>);
  await screen.findByRole('alert');
  expect(screen.queryByLabelText('Recording: Algebra')).toBeNull();
  expect(state.sign).not.toHaveBeenCalled();
 });
});
