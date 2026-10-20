import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {readFileSync} from 'node:fs';

const mocks=vi.hoisted(()=>({
 user:{id:'student-1',roles:['student'],tenantId:'tenant-1'},
 rpc:vi.fn(),
 from:vi.fn(),
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mocks.user})}));
vi.mock('@/integrations/supabase/client',()=>({
 supabase:{
  realtime:{setAuth:vi.fn(async()=>{})},
  channel:vi.fn(()=>({
   on:vi.fn(function(this:unknown){return this}),
   subscribe:vi.fn(function(this:unknown){return this}),
  })),
  removeChannel:vi.fn(async()=>{}),
 }
}));
vi.mock('@/lib/db',()=>({db:{from:(...args:unknown[])=>mocks.from(...args),rpc:(...args:unknown[])=>mocks.rpc(...args)}}));
import LectureInteractions from '@/components/classroom/LectureInteractions';

const session={id:'session-1',title:'Maths live lecture',starts_at:'2026-10-21T10:00:00Z',ends_at:'2026-10-21T11:00:00Z',status:'scheduled'};
const studentQuestion={id:'question-1',student_id:'student-1',body:'How is this formula derived?',status:'submitted',answer:null,created_at:'2026-10-21T10:05:00Z',answered_at:null};
function queryFor(table:string){
 let result:unknown[]=[];
 if(table==='live_class_hand_requests'&&mocks.user.roles.includes('lecturer'))
  result=[{session_id:'session-1',student_id:'student-1',status:'raised',raised_at:'2026-10-21T10:06:00Z'}];
 if(table==='live_class_questions')result=[studentQuestion];
 if(table==='live_class_published_answers')
  result=[{id:'public-answer',question_text:'What is algebra?',answer_text:'Rules for working with symbols.',published_at:'2026-10-21T10:05:00Z'}];
 if(table==='profiles')result=[{user_id:'student-1',full_name:'Sample Student'}];
 type Query={
  select:(...args:unknown[])=>Query;
  eq:(...args:unknown[])=>Query;
  in:(...args:unknown[])=>Query;
  order:(...args:unknown[])=>Query;
  limit:(...args:unknown[])=>Query;
  maybeSingle:()=>Promise<unknown>;
  then:(resolve:(data:unknown)=>unknown,reject?:(error:unknown)=>unknown)=>Promise<unknown>;
 };
 const obj={} as Query;
 for(const method of ['select','eq','in','order','limit'] as const)obj[method]=()=>obj;
 obj.maybeSingle=async()=>({data:table==='live_class_sessions'?session:null,error:null});
 obj.then=(resolve,reject)=>Promise.resolve({data:result,error:null}).then(resolve,reject);
 return obj;
}
beforeEach(()=>{
 vi.clearAllMocks();
 mocks.user={id:'student-1',roles:['student'],tenantId:'tenant-1'};
 mocks.rpc.mockResolvedValue({data:'raised',error:null});
 mocks.from.mockImplementation(queryFor);
});
afterEach(cleanup);

describe('large-class student raise hand and message controls',()=>{
 it('offers invited students their own speaking request, private question and course notes',async()=>{
  render(<LectureInteractions sessionId="session-1"/>);
  expect(await screen.findByRole('button',{name:'Raise hand'})).toBeInTheDocument();
  expect(screen.getByText('How is this formula derived?')).toBeInTheDocument();
  expect(screen.getByRole('link',{name:/Course notes, slides and homework/})).toHaveAttribute('href','/student/materials');
  expect(screen.queryByRole('button',{name:'Call to speak'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Raise hand'}));
  await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('set_unipathway_hand_raise',{p_session:'session-1',p_action:'raise'}));
 });
 it('lecturers can moderate verbal requests and answer questions without live Teams microphone control',async()=>{
  mocks.user={id:'lecturer-1',roles:['lecturer'],tenantId:'tenant-1'};
  render(<LectureInteractions sessionId="session-1"/>);
  expect(await screen.findByRole('button',{name:'Call to speak'})).toBeInTheDocument();
  expect(screen.getByText('Sample Student')).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Raise hand'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Call to speak'}));
  await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('respond_unipathway_hand_raise',
   {p_session:'session-1',p_student:'student-1',p_action:'called'}));
 });
});

describe('server permission contract for 100+ learner discussion',()=>{
 const sql=readFileSync('supabase/migrations/20261020120000_unipathway_live_hand_raise_questions.sql','utf8');
 const classes=readFileSync('src/pages/classroom/TeamsClassroom.tsx','utf8');
 const app=readFileSync('src/App.tsx','utf8');
 const materials=readFileSync('src/pages/learning/ModuleMaterials.tsx','utf8');
 it('must check invitation, active enrolment and role on each student action',()=>{
  expect(sql).toContain('public.can_join_unipathway_class(p_session)');
  expect(sql).toContain("public.has_role(auth.uid(),'student'::public.app_role)");
  expect(sql).toContain('public.can_manage_unipathway_class(p_session)');
  expect(sql).toContain('REVOKE INSERT,UPDATE,DELETE ON public.live_class_questions');
  expect(sql).toContain('REVOKE INSERT,UPDATE,DELETE ON public.live_class_hand_requests');
  expect(sql).toContain('auth.uid()');
 });
 it('does not broadcast student names or private submitted question content',()=>{
  const signal=sql.split('CREATE OR REPLACE FUNCTION public.signal_unipathway_classroom_update')[1];
  expect(signal).not.toContain('NEW.body');
  expect(signal).not.toContain('NEW.student_id');
  expect(signal).toContain("IF TG_ARGV[0]='hand' AND NEW.status='raised' THEN RETURN NEW");
  expect(signal).toContain("IF TG_ARGV[0]='question' AND NEW.status='submitted' THEN RETURN NEW");
  expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.live_class_published_answers');
 });
 it('keeps student Q&A private until explicitly published by a lecturer',()=>{
  expect(sql).toContain("(student_id=auth.uid() AND public.can_join_unipathway_class(session_id))");
  expect(sql).toContain('IF p_publish THEN');
  expect(sql).toContain('live_class_published_answers');
  expect(sql).toContain('Question rate limit reached');
  expect(sql).toContain('session_id,student_id');
 });
 it('gates lecture messages and module material routes by roles and enrolment',()=>{
  expect(app).toContain('<ClassroomBoardR><LectureDiscussion /></ClassroomBoardR>');
  expect(classes).toContain("to={'/classroom/discussion/'+s.id}");
  expect(materials).toContain("db.from('student_enrolments')");
  expect(materials).toContain(".eq('status','active')");
 });
});
