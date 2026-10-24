import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
import {arrangeTeachingGroups,isTeamsMeetingUrl} from '@/lib/teamsTeaching';
import {TeachingDesk} from '@/pages/classroom/TeamsTeachingDesk';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn()}));
vi.mock('@/lib/db',()=>({db:mocks}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'student',tenantId:'centre',roles:['student']}})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=>children}));
vi.mock('@/components/classroom/LectureInteractions',()=>({default:()=>null}));
vi.mock('@/components/ielts/GuidedAudioLab',()=>({GuidedSession:()=>null}));
const roster=[{id:'a',name:'A'},{id:'b',name:'B'},{id:'c',name:'C'}];
const plan={can_manage:true,groups:[],roster,revision:0,instructions:'',duration_minutes:15};
beforeEach(()=>{vi.clearAllMocks();mocks.rpc.mockResolvedValue({data:plan});mocks.from.mockImplementation((table:string)=>{
 const result={data:table==='live_class_sessions'?{id:'class',title:'Physics',status:'scheduled',join_url:'https://teams.microsoft.com/l/meetup-join/abc',starts_at:new Date().toISOString(),ends_at:new Date(Date.now()+3600000).toISOString()}:[]};
 const q={select:()=>q,eq:()=>q,in:()=>q,order:()=>q,limit:()=>Promise.resolve(result),maybeSingle:()=>Promise.resolve(result)};return q;
});});
afterEach(cleanup);
const mount=()=>render(<MemoryRouter><TeachingDesk sessionId="class"/></MemoryRouter>);
it('arranges odd pair rosters without losing or duplicating learners',()=>{expect(arrangeTeachingGroups(roster,2).map(g=>g.members)).toEqual([['a','b'],['c']]);expect(()=>arrangeTeachingGroups(roster,0)).toThrow();expect(()=>arrangeTeachingGroups(Array.from({length:51},(_,i)=>({id:String(i),name:'A'})),1)).toThrow(/50 groups/);});
it('restricts links to Microsoft meeting hosts and meeting paths',()=>{
 expect(isTeamsMeetingUrl('https://teams.cloud.microsoft/meet/123456?p=a')).toBe(true);
 expect(isTeamsMeetingUrl('https://teams.microsoft.com/l/meetup-join/abc')).toBe(true);
 for(const url of ['https://teams.microsoft.com.evil.test/l/meetup-join/a','javascript:alert(1)','https://teams.microsoft.com/l/channel/a','https://u:p@teams.microsoft.com/meet/123'])expect(isTeamsMeetingUrl(url)).toBe(false);
});
it('saves pairs with revision check and explicitly leaves Teams assignment manual',async()=>{mount();fireEvent.click(await screen.findByText('Generate pairs'));mocks.rpc.mockResolvedValueOnce({data:1});fireEvent.click(screen.getByText('Save teaching plan'));await screen.findByText(/Apply the assignments in Teams Rooms/);expect(mocks.rpc).toHaveBeenLastCalledWith('save_unipathway_teams_plan',expect.objectContaining({p_revision:0,p_groups:expect.arrayContaining([expect.objectContaining({members:['a','b']})])}));});
it('keeps failed saves visible instead of reporting live room success',async()=>{mount();fireEvent.click(await screen.findByText('Generate pairs'));mocks.rpc.mockResolvedValueOnce({error:{message:'Plan changed. Refresh before saving.'}});fireEvent.click(screen.getByText('Save teaching plan'));await screen.findByRole('alert');expect(screen.getByText('Unsaved plan changes')).toBeInTheDocument();});
it('shows only learner instructions and no teacher controls',async()=>{mocks.rpc.mockResolvedValue({data:{...plan,can_manage:false,roster:[],groups:[{name:'Pair 1',task:'Discuss forces'}]}});mount();await screen.findByText('Discuss forces');expect(screen.queryByText('Save teaching plan')).toBeNull();expect(screen.queryByLabelText('Class instructions')).toBeNull();});
it('fails closed on denied plan access',async()=>{mocks.rpc.mockResolvedValue({error:{message:'Class access denied'}});mount();await screen.findByRole('alert');expect(screen.queryByText('Open Teams classroom')).toBeNull();});
it('does not restore a previous session after an async response arrives late',async()=>{let finish!:(v:unknown)=>void;mocks.rpc.mockReturnValueOnce(new Promise(r=>{finish=r;}));const view=mount();view.unmount();finish({data:plan});await waitFor(()=>expect(screen.queryByText('Physics')).toBeNull());});

it('retires the alternate provider token endpoint without signing caller moderator claims',async()=>{
 const {readFileSync}=await import('node:fs');
 const source=readFileSync('supabase/functions/jaas-token/index.ts','utf8');
 expect(source).toContain('status:410');expect(source).not.toContain('SignJWT');expect(source).not.toContain('JAAS_API_KEY');
});
