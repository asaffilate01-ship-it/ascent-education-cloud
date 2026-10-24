import {useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {accountRoles,parseAccountCsv,type AccountRow} from '@/lib/accountImport';
export default function AccountOperations(){
 const {user}=useAuth();const [email,setEmail]=useState(''),[name,setName]=useState(''),[role,setRole]=useState('student'),[rows,setRows]=useState<AccountRow[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const allowed=user?.roles.some(r=>['centre_director','superadmin'].includes(r));
 async function process(batch:AccountRow[]){setBusy(true);setError('');const current=batch.map(r=>({...r}));setRows(current);
  try{for(let i=0;i<current.length;i++){if(['invited','access_assigned','already_assigned'].includes(current[i].status||''))continue;
   try{const result=await supabase.functions.invoke('invite-staff',{body:{email:current[i].email,fullName:current[i].fullName,role:current[i].role,tenantId:user?.tenantId}});if(result.error||result.data?.error||!result.data?.success)throw new Error(result.data?.error||'Request failed; check permissions and email configuration.');current[i]={...current[i],status:result.data.status,error:undefined};}
   catch(e){current[i]={...current[i],status:'failed',error:e instanceof Error?e.message:'Request failed.'};}setRows(current.map(r=>({...r})));
  }}finally{setBusy(false);}
 }
 if(!allowed)return <p>Contact your centre director to invite or import accounts.</p>;
 return <section className="space-y-5"><h3 className="text-lg font-bold">Account invitations and imports</h3><p className="text-sm">New accounts receive an invitation email. Existing accounts in this centre receive the selected access role. Accounts from other centres cannot be reassigned here. Imports do not enrol learners in courses.</p>
  <form className="space-y-3" onSubmit={e=>{e.preventDefault();void process([{email,fullName:name,role}]);}}><label className="block text-sm">Full name<Input required minLength={2} maxLength={120} value={name} disabled={busy} onChange={e=>setName(e.target.value)}/></label><label className="block text-sm">Email<Input required type="email" value={email} disabled={busy} onChange={e=>setEmail(e.target.value)}/></label><label className="block text-sm">Role<select className="block w-full rounded border bg-background p-2" disabled={busy} value={role} onChange={e=>setRole(e.target.value)}>{accountRoles.map(r=><option key={r}>{r}</option>)}</select></label><Button disabled={busy}>Assign access / invite account</Button></form>
  <div className="space-y-2 border-t pt-4"><h4 className="font-semibold">CSV import</h4><p className="text-sm">Headers: email,full_name,role. Up to 50 accounts; review the rows before sending invitations.</p><Input type="file" accept=".csv,text/csv" disabled={busy} aria-label="Account CSV" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;setError('');try{if(f.size>100000)throw new Error('CSV must be under 100 KB.');setRows(parseAccountCsv(await f.text()));}catch(e){setRows([]);setError(e instanceof Error?e.message:'Invalid CSV.');}}}/></div>
  {error&&<p role="alert">{error}</p>}{rows.length>0&&<><div className="overflow-auto"><table className="w-full text-sm"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Result</th></tr></thead><tbody>{rows.map(r=><tr key={r.email} className="border-t"><td>{r.fullName}</td><td>{r.email}</td><td>{r.role}</td><td>{r.error||r.status||'Ready for review'}</td></tr>)}</tbody></table></div><Button disabled={busy||rows.every(r=>['invited','access_assigned','already_assigned'].includes(r.status||''))} onClick={()=>void process(rows)}>{busy?'Processing accounts…':'Process pending / retry failed rows'}</Button><p className="text-xs">Only “invited” confirms an invitation email was issued. “access_assigned” and “already_assigned” do not send a new email.</p></>}
 </section>;
}
