import type {ReactNode} from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter,useLocation,useNavigate} from 'react-router-dom';
import LessonWorkspace from '@/pages/learning/LessonWorkspace';
import type {Lesson,LessonProgress} from '@/lib/structuredLessons';
import type {LessonPack} from '@/lib/learning/offlineLessons';

type Response={data:unknown;error:unknown};
const mock=vi.hoisted(()=>({user:{id:'student',tenantId:'centre',role:'student',roles:['student']},loading:false,lessons:[] as Lesson[],progress:[] as LessonProgress[],packs:[] as LessonPack[],fail:'',read:vi.fn(),persist:vi.fn(),pack:vi.fn(),queue:vi.fn(),savePack:vi.fn(),reconcile:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mock.user,loading:mock.loading})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:ReactNode})=><main>{children}</main>}));
vi.mock('@/components/assessment/ModuleJourney',()=>({default:()=>null}));
vi.mock('@/lib/db',()=>({db:{from:(table:string)=>{const q={select:()=>q,eq:()=>q,in:()=>q,order:()=>q,then:(resolve:(response:Response)=>unknown,reject:(reason:unknown)=>unknown)=>Promise.resolve(mock.read(table)).then(resolve,reject)};return q;}}}));
vi.mock('@/lib/learning/lessonProgress',()=>({persistLessonProgress:(...args:unknown[])=>mock.persist(...args)}));
vi.mock('@/lib/learning/offlineLessons',()=>({listLessonPacks:async()=>mock.packs,getLessonPack:(...args:unknown[])=>mock.pack(...args),reconcileLessonPack:(...args:unknown[])=>mock.reconcile(...args),mergeLessonProgress:(rows:LessonProgress[])=>rows,acknowledgeProgress:vi.fn(),queueLessonProgress:(...args:unknown[])=>mock.queue(...args),removeLessonPack:vi.fn(),saveLessonPack:(...args:unknown[])=>mock.savePack(...args)}));
const lesson=(id:string,position:number):Lesson=>({id,tenant_id:'centre',module_id:'module',title:`Lesson ${position}`,body:`Published instructions for lesson ${position}.`,position,revision:2,status:'published',video_url:null,resource_url:null,transcript:''});
function Location(){const location=useLocation(),navigate=useNavigate();return <><output aria-label="Current location">{location.pathname}{location.search}</output><button onClick={()=>navigate('/student/lessons?module=other&lesson=other-lesson')}>Change module</button></>;}
let client:QueryClient;
function tree(url='/student/lessons?module=module&lesson=second'){return <QueryClientProvider client={client}><MemoryRouter initialEntries={[url]}><LessonWorkspace/><Location/></MemoryRouter></QueryClientProvider>;}
beforeEach(()=>{
 vi.clearAllMocks();mock.user={id:'student',tenantId:'centre',role:'student',roles:['student']};mock.loading=false;mock.fail='';mock.lessons=[lesson('first',1),lesson('second',2)];mock.progress=[];mock.packs=[];mock.pack.mockResolvedValue(null);mock.persist.mockResolvedValue(undefined);mock.reconcile.mockResolvedValue(0);
 mock.read.mockImplementation((table:string)=>({data:mock.fail===table?null:table==='unipathway_lessons'?mock.lessons:mock.progress,error:mock.fail===table?{code:'42501'}:null}));
 vi.spyOn(navigator,'onLine','get').mockReturnValue(true);client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
});
afterEach(()=>{cleanup();client.clear();vi.restoreAllMocks();});

describe('student lesson handoff',()=>{
 it('opens the exact requested lesson instead of the first one',async()=>{
  render(tree());expect(await screen.findByRole('heading',{name:'Lesson 2'})).toBeInTheDocument();expect(screen.queryByText('Published instructions for lesson 1.')).toBeNull();
  expect(screen.getByLabelText('Current location')).toHaveTextContent('/student/lessons?module=module&lesson=second');
 });
 it.each(['removed',''])('keeps an unavailable explicit lesson=%s until the student chooses recovery',async target=>{
  render(tree(`/student/lessons?module=module&lesson=${target}&from=agenda`));
  expect(await screen.findByRole('heading',{name:'Lesson unavailable'})).toBeInTheDocument();expect(screen.queryByRole('heading',{name:'Lesson 1'})).toBeNull();
  expect(screen.getByLabelText('Current location')).toHaveTextContent(`lesson=${target}&from=agenda`);
  expect(screen.getByRole('link',{name:'Open module overview'})).toHaveAttribute('href','/student/module?module=module');
  fireEvent.click(screen.getByRole('button',{name:'Choose an available lesson'}));await screen.findByRole('heading',{name:'Lesson 1'});
  expect(screen.getByLabelText('Current location')).toHaveTextContent('module=module&from=agenda&lesson=first');
 });
 it('resumes the next lesson only when no explicit lesson was requested',async()=>{
  mock.progress=[{lesson_id:'first',revision:2,position_seconds:50,completed:true,updated_at:'2026-11-01T10:00:00Z'}];
  render(tree('/student/lessons?module=module&from=agenda'));await screen.findByRole('heading',{name:'Lesson 2'});
  expect(screen.getByLabelText('Current location')).toHaveTextContent('module=module&from=agenda&lesson=second');
  fireEvent.change(screen.getByLabelText('Choose lesson'),{target:{value:'first'}});await screen.findByRole('heading',{name:'Lesson 1'});
  expect(screen.getByLabelText('Current location')).toHaveTextContent('module=module&from=agenda&lesson=first');
 });
 it('does not expose draft, foreign-centre or other-module lessons returned by a read',async()=>{
  mock.lessons=[{...lesson('draft',3),status:'draft'},{...lesson('foreign',4),tenant_id:'another-centre'},{...lesson('other',5),module_id:'another-module'},lesson('first',1)];
  render(tree('/student/lessons?module=module&lesson=foreign'));await screen.findByRole('heading',{name:'Lesson unavailable'});
  fireEvent.click(screen.getByRole('button',{name:'Choose an available lesson'}));await screen.findByRole('heading',{name:'Lesson 1'});
  expect(screen.getAllByRole('option')).toHaveLength(1);expect(screen.queryByText('Published instructions for lesson 4.')).toBeNull();
 });
 it.each(['unipathway_lessons','unipathway_lesson_progress'])('separates a failed %s read from empty lessons and recovers on retry',async table=>{
  mock.fail=table;render(tree());await screen.findByRole('button',{name:'Retry lessons'});
  expect(screen.queryByRole('heading',{name:'No published lessons available'})).toBeNull();expect(screen.queryByRole('heading',{name:'Lesson unavailable'})).toBeNull();expect(screen.queryByRole('button',{name:'Mark as completed'})).toBeNull();
  mock.fail='';fireEvent.click(screen.getByRole('button',{name:'Retry lessons'}));await screen.findByRole('heading',{name:'Lesson 2'});
 });
 it('offers module recovery when a verified read is empty, without claiming a failed read',async()=>{
  mock.lessons=[];render(tree('/student/lessons?module=module'));await screen.findByRole('heading',{name:'No published lessons available'});
  expect(screen.getByRole('link',{name:'Open module overview'})).toHaveAttribute('href','/student/module?module=module');expect(screen.queryByRole('alert')).toBeNull();
 });
 it('keeps an explicitly missing saved lesson unavailable offline',async()=>{
  vi.spyOn(navigator,'onLine','get').mockReturnValue(false);mock.pack.mockResolvedValue({lessons:mock.lessons,progress:[],pending:[]});render(tree('/student/lessons?module=module&lesson=removed'));
  await screen.findByRole('heading',{name:'Lesson unavailable'});expect(mock.read).not.toHaveBeenCalled();expect(screen.getByLabelText('Current location')).toHaveTextContent('lesson=removed');
 });
});

describe('lesson access and late progress replies',()=>{
 it.each(['membership','role','verifying'])('does not read lesson data while %s access is unavailable',async reason=>{
  if(reason==='membership')mock.user.roles=[];if(reason==='role')mock.user={...mock.user,role:'lecturer',roles:['student','lecturer']};if(reason==='verifying')mock.loading=true;
  render(tree());expect(await screen.findByText(reason==='verifying'?'Checking your student access…':'An active, verified Student role and assigned centre are required to open lessons.')).toBeInTheDocument();expect(mock.read).not.toHaveBeenCalled();
 });
 it.each(['module','account','membership'])('does not apply old progress feedback after %s changes',async reason=>{
  let finish!:()=>void;mock.persist.mockReturnValue(new Promise<void>(resolve=>{finish=resolve;}));const view=render(tree());
  const complete=await screen.findByRole('button',{name:'Mark as completed'});await waitFor(()=>expect(complete).toBeEnabled());fireEvent.click(complete);expect(mock.persist).toHaveBeenCalledTimes(1);
  if(reason==='module')fireEvent.click(screen.getByRole('button',{name:'Change module'}));
  else{mock.user=reason==='account'?{...mock.user,id:'other-student',tenantId:'other-centre'}:{...mock.user,roles:[]};view.rerender(tree());}
  await act(async()=>finish());expect(screen.queryByText('Progress saved')).toBeNull();expect(screen.queryByText('Published instructions for lesson 2.')).toBeNull();
 });
 it('does not begin a remote progress write when the local queue finishes after access is revoked',async()=>{
  mock.packs=[{key:'centre:student:module',owner:'centre:student',module:'module',savedAt:Date.now(),expiresAt:Date.now()+86400000,lessons:mock.lessons,progress:[],pending:[],bytes:100}];
  let finish!:(value:{mutation:string})=>void;mock.queue.mockReturnValue(new Promise(resolve=>{finish=resolve;}));const view=render(tree());
  const complete=await screen.findByRole('button',{name:'Mark as completed'});await waitFor(()=>expect(complete).toBeEnabled());fireEvent.click(complete);expect(mock.queue).toHaveBeenCalledTimes(1);
  mock.user={...mock.user,roles:[]};view.rerender(tree());await act(async()=>finish({mutation:'queued-progress'}));
  expect(mock.persist).not.toHaveBeenCalled();expect(screen.queryByText('Progress saved')).toBeNull();
 });
 it('does not save or reconcile a pack when its refresh finishes after access is revoked',async()=>{
  const view=render(tree());await screen.findByRole('heading',{name:'Lesson 2'});fireEvent.click(screen.getByText('Study without internet · 0 saved modules'));
  const save=screen.getByRole('button',{name:'Save text pack on this device'});await waitFor(()=>expect(save).toBeEnabled());
  let finish!:(response:Response)=>void;mock.read.mockReturnValue(new Promise<Response>(resolve=>{finish=resolve;}));const reads=mock.read.mock.calls.length,reconciles=mock.reconcile.mock.calls.length;
  fireEvent.click(save);await waitFor(()=>expect(mock.read.mock.calls.length).toBeGreaterThan(reads));
  mock.user={...mock.user,roles:[]};view.rerender(tree());await act(async()=>finish({data:mock.lessons,error:null}));
  expect(mock.savePack).not.toHaveBeenCalled();expect(mock.reconcile).toHaveBeenCalledTimes(reconciles);
 });
});
