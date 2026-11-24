import {useEffect,useState} from 'react';
import {Mail,ShieldCheck,Video,ExternalLink} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {Button} from '@/components/ui/button';
import {db} from '@/lib/db';
import {microsoftAccountFields,readOwnMicrosoftAccount,microsoftReadiness,type MicrosoftAccountRecord,type MicrosoftAccountRole} from '@/lib/microsoftAccountReadiness';

export default function MicrosoftAccountReadiness({compact=false}:{compact?:boolean}){
 const {user,loading}=useAuth();
 if(loading)return compact?null:<p role="status">Checking your account permissions…</p>;
 if(!user?.id||!user.tenantId||!user.roles?.includes(user.role)||(user.role!=='student'&&user.role!=='lecturer'))return compact?null:<p role="alert">A verified student or lecturer role and centre assignment are required.</p>;
 return <Account key={[user.id,user.tenantId,user.role,user.roles.join(',')].join(':')} uid={user.id} tenant={user.tenantId} role={user.role} compact={compact}/>;
}
function Account({uid,tenant,role,compact}:{uid:string;tenant:string;role:MicrosoftAccountRole;compact:boolean}){
 const [open,setOpen]=useState(!compact),[loading,setLoading]=useState(!compact),[account,setAccount]=useState<MicrosoftAccountRecord|null>(null),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{
  let active=true;setAccount(null);setError('');
  if(!open){setLoading(false);return()=>{active=false;};}
  setLoading(true);
  void(async()=>{
   try{
    const response=await db.from('microsoft_education_accounts').select(microsoftAccountFields).eq('tenant_id',tenant).eq('user_id',uid).limit(2);
    if(response.error)throw Error();
    const a=readOwnMicrosoftAccount(response.data,uid,tenant,role);
    if(active)setAccount(a);
   }catch{if(active)setError('Your Microsoft account mapping could not be verified. No account status or address is shown. Refresh or ask your centre for help.');}
   finally{if(active)setLoading(false);}
  })();
  return()=>{active=false;};
 },[uid,tenant,role,open,revision]);
 const readiness=microsoftReadiness(account);
 return <section aria-label="Institutional Microsoft account" className="min-w-0 space-y-4 rounded-xl border bg-card p-3 sm:p-5">
  <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><h2 className="flex items-center gap-2 text-lg font-semibold"><Mail className="size-5 shrink-0" aria-hidden="true"/>Institutional Microsoft account</h2><p className="mt-1 text-sm text-muted-foreground">Your saved institutional identity and Microsoft 365 setup status.</p></div>{compact&&<Button type="button" variant="outline" aria-expanded={open} onClick={()=>{setOpen(v=>!v);setAccount(null);setError('');setLoading(!open);}}>{open?'Hide Microsoft account':'Open Microsoft account'}</Button>}</div>
  {open&&<>
   <Button type="button" variant="outline" disabled={loading} onClick={()=>{setAccount(null);setError('');setLoading(true);setRevision(v=>v+1);}}>Refresh my account</Button>
   {loading?<p role="status">Verifying your centre account…</p>:error?<p role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">{error}</p>:<>
    <div className="space-y-2 rounded-lg border bg-background p-3 sm:p-4"><h3 className="font-semibold">{readiness.title}</h3><p className="text-sm leading-relaxed text-muted-foreground">{readiness.detail}</p>{account?.institutional_email&&<div><p className="text-xs text-muted-foreground">Recorded institutional address</p><p className="mt-1 break-all font-medium">{account.institutional_email}</p></div>}</div>
    <dl className="grid gap-2 sm:grid-cols-3">{[['Account creation',readiness.created?'Recorded':'Not confirmed'],['Licence allocation',readiness.licensed?'Recorded':'Not confirmed'],['Sign-in & Teams',readiness.recordedReady?'Recorded ready; live check required':readiness.state==='disabled'?'Disabled':'Not confirmed']].map(([label,value])=><div key={label} className="min-w-0 rounded-lg border p-3 [overflow-wrap:anywhere]"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>)}</dl>
    {readiness.recordedReady&&<nav aria-label="Microsoft services" className="grid gap-2 sm:grid-cols-2"><a href="https://www.microsoft365.com/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-primary">Open Microsoft 365<ExternalLink className="size-4 shrink-0" aria-hidden="true"/></a><a href="https://teams.microsoft.com/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-primary">Open Microsoft Teams<ExternalLink className="size-4 shrink-0" aria-hidden="true"/></a></nav>}
   </>}
   <div className="space-y-2 rounded-lg border p-3 text-sm"><h3 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4 shrink-0" aria-hidden="true"/>Set up your account securely</h3><p className="text-muted-foreground">Your centre must confirm account ownership, approved password or passwordless setup, MFA and activation in Microsoft. No password, licence key or personal verification data is collected by this panel.</p><p className="flex items-start gap-2 text-muted-foreground"><Video className="mt-0.5 size-4 shrink-0" aria-hidden="true"/>A recorded account does not confirm access to individual Teams classes or released recordings. Use your normal academic classroom workspace.</p></div>
  </>}
 </section>;
}
