import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter} from 'react-router-dom';
import {mergeLessonProgress} from '@/lib/learning/offlineLessons';
import {persistLessonProgress} from '@/lib/learning/lessonProgress';
import LessonBuilder from '@/pages/learning/LessonBuilder';
const mock=vi.hoisted(()=>({calls:[] as any[],read:vi.fn(),write:vi.fn()}));
const lesson={id:'lesson',module_id:'module',tenant_id:'centre',title:'Current lesson',body:'Current instructions for this learning activity.',position:1,video_url:null,resource_url:null,transcript:'',status:'published',revision:3};
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'teacher',tenantId:'centre'}})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:any)=><main>{children}</main>}));
vi.mock('@/components/assessment/ModuleJourney',()=>({default:()=>null}));
vi.mock('@/lib/db',()=>({db:{from:(table:string)=>{
 let values:any=null,writing=false;
 const q:any={select:()=>q,eq:()=>q,ilike:()=>q,order:()=>q,limit:()=>q,
 insert:(v:any)=>{writing=true;values=v;mock.calls.push({table,kind:'insert',values:v});return q;},
 update:(v:any)=>{writing=true;values=v;mock.calls.push({table,kind:'update',values:v});return q;},
 maybeSingle:()=>mock.read(),single:async()=>({data:{...lesson,...values,revision:4},error:null}),
 then:(resolve:any)=>Promise.resolve(table==='unipathway_lesson_progress'?mock.write():{data:table==='unipathway_lessons'?[lesson]:[{revision:1,snapshot:{...lesson,title:'Earlier lesson',body:'The earlier instructions for this learning activity.',revision:1},created_at:'2026-10-25T12:00:00Z'}],error:null}).then(resolve)};
 return q;
}}}));
beforeEach(()=>{vi.clearAllMocks();mock.calls=[];vi.spyOn(window,'confirm').mockReturnValue(true);});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
function renderBuilder(){return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter initialEntries={['/lecturer/lessons?module=module']}><LessonBuilder/></MemoryRouter></QueryClientProvider>);}
describe('progress reconciliation',()=>{
 const row={lesson_id:'lesson',revision:1,position_seconds:80,completed:true,updated_at:'2026-10-26T12:00:00Z'};
 it('keeps newer remote position and completed state',()=>{
  expect(mergeLessonProgress([row],[{...row,position_seconds:10,completed:false,updated_at:'2026-10-25T12:00:00Z'}])).toEqual([row]);
 });
 it('does not carry completion into a different lesson revision',()=>{
  expect(mergeLessonProgress([row],[{...row,revision:2,completed:false}])).toHaveLength(2);
 });
 it('re-reads after a concurrent writer and preserves newer progress',async()=>{
  mock.read.mockResolvedValueOnce({data:row}).mockResolvedValue({data:{...row,position_seconds:120,updated_at:'2026-10-27T12:00:00Z'}});
  mock.write.mockResolvedValueOnce({data:[]}).mockResolvedValue({data:[{lesson_id:'lesson'}]});
  await persistLessonProgress('student',{...row,position_seconds:100,completed:false,updated_at:'2026-10-26T13:00:00Z'});
  expect(mock.read).toHaveBeenCalledTimes(2);expect(mock.calls[1].values).toMatchObject({position_seconds:120,completed:true});
 });
 it('does not treat permission failure as success',async()=>{
  mock.read.mockResolvedValue({data:null,error:{code:'42501'}});
  await expect(persistLessonProgress('student',row)).rejects.toEqual({code:'42501'});expect(mock.calls).toHaveLength(0);
 });
});
describe('lesson authoring',()=>{
 it('loads old content for review without publishing or overwriting history',async()=>{
  renderBuilder();fireEvent.click(await screen.findByText('1. Current lesson'));
  fireEvent.click(await screen.findByText('Load version 1 for review'));
  expect(await screen.findByText('Version 1 loaded for review. Nothing has been published.')).toBeInTheDocument();expect(mock.calls).toHaveLength(0);
  fireEvent.click(screen.getByText('Save as draft'));
  await waitFor(()=>expect(mock.calls[0]).toMatchObject({table:'unipathway_lessons',kind:'update',values:{title:'Earlier lesson',status:'draft'}}));
 });
 it('copies accessible content as a new draft rather than changing its source',async()=>{
  renderBuilder();fireEvent.change(screen.getByLabelText('Find a lesson'),{target:{value:'Current'}});
  fireEvent.click(await screen.findByText('Use as new draft'));expect(mock.calls).toHaveLength(0);
  fireEvent.click(screen.getByText('Save as draft'));
  await waitFor(()=>expect(mock.calls[0]).toMatchObject({table:'unipathway_lessons',kind:'insert',values:{module_id:'module',tenant_id:'centre',title:'Current lesson',status:'draft',position:2}}));
  expect(mock.calls[0].values).not.toHaveProperty('id');
 });
});
