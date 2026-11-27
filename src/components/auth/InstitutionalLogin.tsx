import {useEffect,useRef,useState,type FormEvent} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {supabase} from '@/integrations/supabase/client';
import {ROLE_HOME,useAuth} from '@/contexts/AuthContext';
import {institutionalEmail} from '@/lib/institutionalAuth';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Eye,EyeOff,ShieldCheck} from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';

type Factor={id:string;friendly_name?:string;status:string;factor_type:string};
type Setup={id:string;qr:string;secret:string};
export default function InstitutionalLogin(){
 const {user,session,loading:authLoading}=useAuth();
 const navigate=useNavigate();
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[show,setShow]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[factors,setFactors]=useState<Factor[]|null>(null);
 const [setup,setSetup]=useState<Setup|null>(null),[factorId,setFactorId]=useState(''),[code,setCode]=useState('');
 const [reload,setReload]=useState(0),[assured,setAssured]=useState(false);
 const lock=useRef(false),generation=useRef(0),alive=useRef(false);
 const principal=session?.user.id;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;generation.current++;};},[]);
 useEffect(()=>{if(user&&!authLoading)navigate(ROLE_HOME[user.role]||'/',{replace:true});},[user,authLoading,navigate]);
 useEffect(()=>{
  const token=++generation.current;
  setFactors(null);setSetup(null);setFactorId('');setCode('');setAssured(false);setError('');
  if(!principal)return;
  void (async()=>{
   try{
    const account=await supabase.auth.getUser();
    if(generation.current!==token)return;
    if(account.error||account.data.user?.id!==principal||!institutionalEmail(account.data.user.email)||!account.data.user.email_confirmed_at)throw Error();
    const assurance=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if(generation.current!==token)return;
    if(assurance.error)throw Error();
    if(assurance.data.currentLevel==='aal2'){setAssured(true);return;}
    const list=await supabase.auth.mfa.listFactors();
    if(generation.current!==token)return;
    if(list.error)throw Error();
    const totp=(list.data.all||[]).filter(f=>f.factor_type==='totp'&&f.status==='verified');
    setFactors(totp);setFactorId(totp[0]?.id||'');
   }catch{if(generation.current===token)setError('Your institutional account or verification methods could not be confirmed. Retry or contact the authorised administrator.');}
  })();
  return()=>{generation.current++;};
 },[principal,reload]);
 async function run(action:()=>Promise<void>){
  if(lock.current)return;
  lock.current=true;setBusy(true);setError('');
  try{await action();}catch{if(alive.current)setError('The security step could not be confirmed. Check your details and try again, or contact the authorised administrator.');}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 function signIn(e:FormEvent){e.preventDefault();const address=institutionalEmail(email);
  if(!address){setError('Use your assigned @unipathway.pk email address.');return;}
  if(!password){setError('Enter your password.');return;}
  void run(async()=>{
   const result=await supabase.auth.signInWithPassword({email:address,password});
   if(result.error||!result.data.session)throw Error();
   setPassword('');
  });
 }
 function enrol(){void run(async()=>{
  if(!principal||!factors||factors.length||setup)return;
  const token=generation.current;
  const result=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:'UniPathway authenticator',issuer:'UniPathway'});
  if(result.error||result.data.type!=='totp')throw Error();
  if(!alive.current||generation.current!==token)return;
  const {id,totp}=result.data;
  if(typeof totp.qr_code!=='string'||!totp.qr_code.startsWith('data:image/svg+xml')||!totp.secret)throw Error();
  setSetup({id,qr:totp.qr_code,secret:totp.secret});setFactorId(id);
 });}
 function verify(e:FormEvent){e.preventDefault();
  if(!factorId||!/^\d{6}$/.test(code)){setError('Enter the six-digit code from your authenticator.');return;}
  void run(async()=>{
   const result=await supabase.auth.mfa.challengeAndVerify({factorId,code});
   if(result.error)throw Error();
   setCode('');setSetup(null);setAssured(true);
  });
 }
 const signOut=()=>void run(async()=>{const r=await supabase.auth.signOut({scope:'local'});if(r.error)throw Error();setPassword('');});
 return <div className="min-h-dvh bg-background flex flex-col lg:flex-row">
  <aside className="hidden lg:flex lg:w-5/12 gradient-primary flex-col justify-between p-12 text-gradient-foreground">
   <div><span className="inline-flex rounded-xl bg-white p-3"><BrandLogo className="h-11"/></span><h1 className="mt-12 text-4xl font-bold">Your secure learning workspace.</h1><p className="mt-4 max-w-md leading-relaxed">Assigned institutional accounts, centre-specific permissions and authenticator verification protect our learners and staff.</p></div><p className="text-sm">UniPathway Education · Pakistan</p>
  </aside>
  <main className="flex min-w-0 flex-1 items-center justify-center px-4 py-10 sm:px-8">
   <section className="w-full max-w-md space-y-5">
    <div className="lg:hidden"><BrandLogo className="h-10"/></div>
    <div><p className="flex items-center gap-2 text-sm font-semibold text-primary"><ShieldCheck aria-hidden="true" className="size-5"/> Institutional access</p><h2 className="mt-2 text-2xl font-bold sm:text-3xl">{principal?'Verify your sign-in':'Sign in to UniPathway'}</h2><p className="mt-2 text-sm text-muted-foreground">Only approved UniPathway email accounts with assigned permissions can enter the platform.</p></div>
    {error&&<p role="alert" className="rounded-lg border p-3 text-sm text-destructive">{error}</p>}
    {!principal?<form onSubmit={signIn} className="space-y-4">
     <label className="block text-sm font-medium">Institutional email<Input required type="email" autoComplete="username" className="mt-1 min-h-12" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your.name@unipathway.pk" disabled={busy}/></label>
     <div><label htmlFor="institutional-password" className="text-sm font-medium">Password</label><div className="relative mt-1"><Input id="institutional-password" required className="min-h-12 pr-14" type={show?'text':'password'} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/><button type="button" className="absolute right-1 top-1 grid size-10 place-items-center" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(v=>!v)}>{show?<EyeOff className="size-4"/>:<Eye className="size-4"/>}</button></div></div>
     <Button type="submit" className="min-h-12 w-full" disabled={busy}>{busy?'Checking credentials…':'Sign in'}</Button><Link to="/forgot-password" className="inline-flex min-h-11 items-center text-sm font-medium underline">Forgot your password?</Link>
    </form>:assured?<div className="space-y-3"><p role="status" className="text-sm">{authLoading?'Verifying assigned access…':user?'Opening your workspace…':'Verification completed; assigned access is not confirmed. Contact the authorised administrator.'}</p><Button type="button" variant="outline" disabled={busy} onClick={signOut}>Sign out</Button></div>:<>
     {!factors&&!error&&<p role="status" className="text-sm">Checking your verification methods…</p>}
     {factors&&factors.length===0&&!setup&&<div className="space-y-3 rounded-xl border p-4"><h3 className="font-semibold">Set up your authenticator</h3><p className="text-sm text-muted-foreground">Use a trusted authenticator app. Keep the setup secret private. Your dashboard stays locked until verification is complete.</p><Button type="button" disabled={busy} onClick={enrol}>Set up authenticator app</Button></div>}
     {setup&&<div className="space-y-2 rounded-xl border p-4"><p className="font-medium">Scan with your authenticator app</p><img src={setup.qr} alt="Authenticator setup QR code" className="mx-auto h-auto w-full max-w-48 bg-white p-2"/><details><summary className="cursor-pointer text-sm">Enter setup key manually</summary><p className="mt-2 break-all font-mono text-sm">{setup.secret}</p></details><p className="text-xs text-muted-foreground">Do not share this QR code or setup key. Enter your app's current six-digit code below.</p></div>}
     {(setup||!!factors?.length)&&<form className="space-y-3" onSubmit={verify}>
      {!setup&&factors&&factors.length>1&&<label className="block text-sm font-medium">Authenticator<select className="mt-1 block min-h-11 w-full rounded-lg border bg-background px-3" value={factorId} onChange={e=>setFactorId(e.target.value)}>{factors.map((f,i)=><option key={f.id} value={f.id}>{f.friendly_name||'Authenticator '+(i+1)}</option>)}</select></label>}
      <label className="block text-sm font-medium">Authenticator code<Input required inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} className="mt-1 min-h-12 tracking-widest" disabled={busy}/></label><Button type="submit" className="min-h-12 w-full" disabled={busy||code.length!==6}>Verify and continue</Button>
     </form>}
     <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={busy} onClick={signOut}>Sign out</Button>{!factors&&error&&<Button type="button" variant="outline" disabled={busy} onClick={()=>setReload(n=>n+1)}>Retry verification setup</Button>}</div>
    </>}
    <p className="text-sm text-muted-foreground">Need an account or help recovering access? <Link to="/contact" className="font-medium underline">Contact UniPathway</Link>. Do not send passwords or verification codes.</p><Link to="/" className="inline-flex min-h-11 items-center text-sm underline">Back to UniPathway</Link>
   </section>
  </main>
 </div>;
}
