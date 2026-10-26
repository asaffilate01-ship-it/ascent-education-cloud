import {MemoryRouter} from 'react-router-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {cleanup,render,screen,fireEvent} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import ParentWeeklyOverview from '@/components/guardian/ParentWeeklyOverview';
import {guardianWeek,inGuardianWeek} from '@/lib/guardianWeek';
const {rpc}=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/db',()=>({db:{rpc}}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'parent',tenantId:'centre'}})}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
const child=(id:string,name:string)=>({id,student_name:name,attendance_shared:false,schedule_shared:false,communication_shared:false,attendance:[],schedule:[]});
function show(){render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter initialEntries={['/parent?learner=b']}><ParentWeeklyOverview/></MemoryRouter></QueryClientProvider>);}
it('retains the selected child in next actions and does not invent unshared attendance',async()=>{rpc.mockResolvedValue({data:[child('a','Ayesha'),child('b','Bilal')],error:null});show();await screen.findByRole('combobox');expect(screen.getByRole('combobox')).toHaveValue('b');expect(screen.getByRole('link',{name:'Open learning plan'})).toHaveAttribute('href','/parent/learning?learner=b');expect(screen.getByText('Attendance sharing is not enabled.')).toBeInTheDocument();fireEvent.change(screen.getByRole('combobox'),{target:{value:'a'}});expect(screen.getByRole('link',{name:'Open learning plan'})).toHaveAttribute('href','/parent/learning?learner=a');});
it('withdraws previously shared child records when revalidation fails',async()=>{let failed=false;rpc.mockImplementation(name=>Promise.resolve(failed?{error:{message:'revoked'}}:name==='get_unipathway_guardian_activity'?{data:[child('b','Bilal')]}:{data:[]}));show();await screen.findByRole('combobox');failed=true;fireEvent.click(screen.getByText('Refresh week'));await screen.findByText('Attendance and class updates could not be verified. Refresh to retry.');expect(screen.queryByRole('combobox')).toBeNull();expect(screen.queryByText(/0 recorded marks/)).toBeNull();});
it('uses Monday midnight in Pakistan for the weekly boundary',()=>{const w=guardianWeek(new Date('2026-10-25T20:00:00Z'));expect(w).toEqual({from:'2026-10-26',until:'2026-11-02'});expect(inGuardianWeek('2026-10-25T19:00:00Z',w)).toBe(true);expect(inGuardianWeek('2026-11-01T19:00:00Z',w)).toBe(false);});
