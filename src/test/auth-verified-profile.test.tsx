import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';

const auth=vi.hoisted(()=>({
 listener:null as null|((event:string,session:any)=>void),
 roles:[{role:'lecturer'},{role:'assessor'}] as {role:string}[],
 rolesError:false,profileError:false,reads:0
}));
vi.mock('@/lib/nativePush',()=>({disableNativePush:async()=>{}}));
vi.mock('@/lib/learning/offlineLessons',()=>({setLearningAccount:async()=>{},clearCourseworkResumeHints:()=>{}}));
vi.mock('@/integrations/supabase/client',()=>({
 supabase:{
  rpc:async()=>({error:null}),
  auth:{
   onAuthStateChange:(listener:any)=>{auth.listener=listener;return {data:{subscription:{unsubscribe:()=>{}}}};},
   getSession:async()=>({data:{session:null}}),
   signOut:async()=>({error:null})
  },
  from:(table:string)=>{
   const q:any={select:()=>q,eq:()=>q,
    single:async()=>auth.profileError?{data:null,error:{message:'denied'}}:{data:{full_name:'Lecturer One',tenant_id:'centre'},error:null},
    then:(resolve:any,reject:any)=>{auth.reads++;return Promise.resolve(auth.rolesError?{data:null,error:{message:'denied'}}:{data:auth.roles,error:null}).then(resolve,reject)}
   };return q;
  }
 }
}));
import {AuthProvider,useAuth} from '@/contexts/AuthContext';
function Account(){
 const {user,loading,setRole,refreshProfile}=useAuth();
 return <section><p>{loading?'Loading':user?user.role+' / '+user.roles.join(','):'No verified role'}</p>
  <button onClick={()=>setRole('assessor')}>Select assessor</button>
  <button onClick={()=>void refreshProfile()}>Verify access again</button>
 </section>;
}
const signIn=async()=>{
 act(()=>auth.listener?.('SIGNED_IN',{user:{id:'lecturer-1',email:'lecturer@example.test'}}));
 await screen.findByText(/lecturer \/ lecturer,assessor/);
};
beforeEach(()=>{auth.listener=null;auth.roles=[{role:'lecturer'},{role:'assessor'}];auth.rolesError=false;auth.profileError=false;auth.reads=0;});
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('keeps selected verified multi-role view after refreshing membership',async()=>{
 render(<AuthProvider><Account/></AuthProvider>);await screen.findByText('No verified role');await signIn();
 fireEvent.click(screen.getByRole('button',{name:'Select assessor'}));
 expect(screen.getByText('assessor / lecturer,assessor')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Verify access again'}));
 await waitFor(()=>expect(auth.reads).toBeGreaterThan(1));
 expect(screen.getByText('assessor / lecturer,assessor')).toBeInTheDocument();
});
it('withdraws revoked roles instead of retaining an old selected privilege',async()=>{
 render(<AuthProvider><Account/></AuthProvider>);await screen.findByText('No verified role');await signIn();
 fireEvent.click(screen.getByRole('button',{name:'Select assessor'}));
 auth.roles=[{role:'lecturer'}];
 fireEvent.click(screen.getByRole('button',{name:'Verify access again'}));
 await screen.findByText('lecturer / lecturer');
});
it('blocks an authenticated session when a roles query fails or returns no roles',async()=>{
 render(<AuthProvider><Account/></AuthProvider>);await screen.findByText('No verified role');await signIn();
 auth.rolesError=true;
 fireEvent.click(screen.getByRole('button',{name:'Verify access again'}));
 await screen.findByText('No verified role');
 auth.rolesError=false;auth.roles=[];
 act(()=>auth.listener?.('SIGNED_IN',{user:{id:'lecturer-1',email:'lecturer@example.test'}}));
 await waitFor(()=>expect(auth.reads).toBeGreaterThanOrEqual(3));
 expect(screen.getByText('No verified role')).toBeInTheDocument();
});
