import {afterEach,it,expect,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import GuardianStaffDesk from '@/pages/parent/GuardianStaffDesk';
const mock=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/db',()=>({db:{rpc:mock.rpc}}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'staff',tenantId:'centre',roles:['lecturer']}})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/components/guardian/GuardianAccess',()=>({GuardianDiscussion:()=> <p>Selected private conversation</p>}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('recovers failed queue loads and removes a conversation when its authorisation disappears',async()=>{
 mock.rpc.mockResolvedValueOnce({error:{message:'unavailable'}}).mockResolvedValueOnce({data:[{id:'l',student_name:'Learner',parent_name:'Guardian',verified:true}]}).mockResolvedValueOnce({data:[]});
 render(<GuardianStaffDesk/>);await screen.findByRole('alert');fireEvent.click(screen.getByText('Refresh guardian links'));await screen.findByRole('option',{name:/Learner · Guardian/});expect(screen.queryByRole('alert')).toBeNull();
 fireEvent.change(screen.getByLabelText('Authorised learner / guardian'),{target:{value:'l'}});await screen.findByText('Selected private conversation');
 fireEvent.click(screen.getByText('Refresh guardian links'));await screen.findByText('No guardian conversations are currently authorised for your account.');expect(screen.queryByText('Selected private conversation')).toBeNull();
});
