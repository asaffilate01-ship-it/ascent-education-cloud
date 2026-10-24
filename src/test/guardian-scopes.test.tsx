import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {GuardianActivity,GuardianScopeSharing} from '@/components/guardian/GuardianAccess';
const mock=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/db',()=>({db:{rpc:mock.rpc}}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'learner',tenantId:'centre'}})}));
afterEach(cleanup);beforeEach(()=>{mock.rpc.mockReset();});
it('changes only the selected consent and does not pretend a failed save succeeded',async()=>{
 mock.rpc.mockResolvedValueOnce({data:[{id:'link',parent_name:'Guardian',verified:true,scopes:['schedule']}]}).mockResolvedValueOnce({error:{message:'denied'}});
 render(<GuardianScopeSharing/>);fireEvent.click(await screen.findByText('Share attendance'));
 await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('not saved'));expect(mock.rpc).toHaveBeenCalledWith('set_unipathway_guardian_scope',{p_link:'link',p_scope:'attendance',p_share:true});expect(screen.getByText('Stop sharing schedule')).toBeInTheDocument();
});
it('clears previously shared activity after revocation on refresh',async()=>{
 mock.rpc.mockResolvedValueOnce({data:[{id:'l',student_name:'Learner',attendance_shared:true,schedule_shared:false,communication_shared:false,attendance:[{date:'2026-10-24',status:'present',module:'Maths'}],schedule:[]}]}).mockResolvedValueOnce({data:[{id:'l',student_name:null,attendance_shared:false,schedule_shared:false,communication_shared:false,attendance:[],schedule:[]}]});
 render(<GuardianActivity/>);await screen.findByText(/2026-10-24 · Maths/);fireEvent.click(screen.getByText('Refresh shared activity'));await screen.findByText('Attendance permission has not been granted.');expect(screen.queryByText(/2026-10-24 · Maths/)).toBeNull();
});
it('reports activity failure rather than showing empty attendance as absence',async()=>{mock.rpc.mockRejectedValue(new Error('offline'));render(<GuardianActivity/>);expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');});
