import {act,render,screen,waitFor,cleanup} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {AuthProvider,useAuth} from '@/contexts/AuthContext';
const mock=vi.hoisted(()=>({listener:null as any,profile:vi.fn(),account:vi.fn(),clear:vi.fn()}));
vi.mock('@/lib/nativePush',()=>({disableNativePush:async()=>{}}));
vi.mock('@/lib/learning/offlineLessons',()=>({setLearningAccount:async(a:any)=>mock.account(a),clearCourseworkResumeHints:()=>mock.clear()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:async()=>({}),auth:{onAuthStateChange:(callback:any)=>{mock.listener=callback;return {data:{subscription:{unsubscribe:()=>{}}}};},getSession:async()=>({data:{session:null}})},from:()=>{
 const q:any={select:()=>q,eq:()=>q,single:()=>mock.profile(),then:(resolve:any)=>Promise.resolve({data:[{role:'student'}]}).then(resolve)};return q;
}}}));
function Probe(){const {user,loading}=useAuth();return <p>{loading?'Loading':user?.email||'Signed out'}</p>;}
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('does not restore a delayed previous user after sign-out',async()=>{
 let resolve!:(v:any)=>void;mock.profile.mockReturnValue(new Promise(r=>resolve=r));
 render(<AuthProvider><Probe/></AuthProvider>);await screen.findByText('Signed out');
 act(()=>mock.listener('SIGNED_IN',{user:{id:'previous',email:'previous@unipathway.pk'}}));
 await waitFor(()=>expect(mock.profile).toHaveBeenCalled());
 act(()=>mock.listener('SIGNED_OUT',null));await waitFor(()=>expect(mock.clear).toHaveBeenCalledTimes(2));
 await act(async()=>resolve({data:{full_name:'Previous',tenant_id:'centre'}}));
 expect(screen.getByText('Signed out')).toBeInTheDocument();expect(mock.account).not.toHaveBeenCalledWith({id:'previous',tenantId:'centre'});
});
