import {useMemo,useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogTrigger} from '@/components/ui/dialog';
import {Calendar,CheckCircle,Clock,XCircle,Plus,ShieldCheck} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {supabase} from '@/integrations/supabase/client';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
import type {Tables} from '@/integrations/supabase/types';
import {toast} from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';
import StatCard from '@/components/ui/StatCard';

const LEAVE_TYPES=['annual','sick','personal','maternity','paternity','study','other'] as const;
const STAFF_ROLES=['superadmin','centre_director','admissions_admin','lecturer','assessor',
 'programme_leader','iqa_officer','welfare_officer','security_officer',
 'exams_officer','finance_officer','marketing_officer'] as const;
type Leave=Tables<'leave_requests'>;
type Filter='all'|'pending'|'approved'|'rejected';
function inclusiveDays(start:string,end:string):number|null{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end))return null;
 const from=new Date(start+'T00:00:00Z'),to=new Date(end+'T00:00:00Z');
 if(!Number.isFinite(from.getTime())||!Number.isFinite(to.getTime())||
  from.toISOString().slice(0,10)!==start||to.toISOString().slice(0,10)!==end)return null;
 const days=Math.round((to.getTime()-from.getTime())/86400000)+1;
 return days>0&&days<=366?days:null;
}
export default function LeaveManagement(){
 const {user}=useAuth();
 return <LeaveWorkspace key={[user?.id,user?.tenantId,user?.role].join(':')}/>;
}
function LeaveWorkspace(){
 const {user}=useAuth();
 const allowed=!!user&&STAFF_ROLES.some(role=>role===user.role)&&!!user.tenantId;
 const manager=allowed&&['superadmin','centre_director'].includes(user!.role);
 const [filter,setFilter]=useState<Filter>('all'),[page,setPage]=useState(0);
 const [showForm,setShowForm]=useState(false),[busy,setBusy]=useState(false);
 const [form,setForm]=useState({leave_type:'annual',start_date:'',end_date:'',reason:''});
 const scope=[
  {column:'tenant_id',operator:'eq' as const,value:user?.tenantId||''},
  ...(!manager?[{column:'user_id',operator:'eq' as const,value:user?.id||''}]:[]),
 ];
 const records=useSupabaseQuery('leave_requests',{
  enabled:allowed,filters:scope,orderBy:{column:'created_at',ascending:false},
 });
 const scoped=records.data.filter(row=>row.tenant_id===user?.tenantId&&(manager||row.user_id===user?.id));
 const filtered=useMemo(()=>scoped.filter(row=>filter==='all'||row.status===filter)
  .sort((a,b)=>b.created_at.localeCompare(a.created_at)||a.id.localeCompare(b.id)),
  [scoped,filter]);
 const current=Math.min(page,Math.max(0,Math.ceil(filtered.length/20)-1));
 const stats={
  pending:scoped.filter(r=>r.status==='pending').length,
  approved:scoped.filter(r=>r.status==='approved').length,
  rejected:scoped.filter(r=>r.status==='rejected').length,
  days:scoped.filter(r=>r.status==='approved').reduce((sum,r)=>sum+(r.days_count||0),0),
 };
 async function submit(){
  const days=inclusiveDays(form.start_date,form.end_date);
  if(!allowed||!user?.tenantId||busy)return;
  if(!days){toast.error('Select valid start and end dates, up to 366 days.');return;}
  if(form.reason.length>2000){toast.error('Reason must be under 2,000 characters.');return;}
  setBusy(true);
  try{
   const result=await supabase.from('leave_requests').insert({
    tenant_id:user.tenantId,user_id:user.id,user_name:user.name||user.email||'Staff member',
    leave_type:form.leave_type,start_date:form.start_date,end_date:form.end_date,
    days_count:days,reason:form.reason.trim()||null,status:'pending',
   });
   if(result.error)throw result.error;
   toast.success('Leave request submitted for review.');
   setShowForm(false);setForm({leave_type:'annual',start_date:'',end_date:'',reason:''});
   void records.refetch();
  }catch{toast.error('Leave request could not be saved. Check your centre and permission, then retry.');}
  finally{setBusy(false);}
 }
 async function decision(record:Leave,action:'approved'|'rejected'){
  if(!allowed||!manager||!user?.tenantId||busy||record.tenant_id!==user.tenantId||
   record.user_id===user.id||record.status!=='pending')return;
  const reason=action==='rejected'?window.prompt('Give a reason for rejecting this leave request (at least 5 characters):'):null;
  if(action==='rejected'&&(reason===null||reason.trim().length<5)){if(reason!==null)toast.error('A rejection reason is required.');return;}
  if(action==='approved'&&!window.confirm('Approve this colleague’s leave request? This is a staff decision.'))return;
  setBusy(true);
  try{
   const response=await supabase.from('leave_requests').update({
    status:action,approved_by:user.id,approved_at:new Date().toISOString(),
    rejection_reason:action==='rejected'?reason!.trim():null,
   }).eq('id',record.id).eq('tenant_id',user.tenantId)
    .eq('status','pending').neq('user_id',user.id).select('id').maybeSingle();
   if(response.error||!response.data?.id)throw Error('No authorised update confirmed');
   toast.success(action==='approved'?'Leave approved.':'Leave rejected with recorded reason.');
   void records.refetch();
  }catch{toast.error('Decision not confirmed. This request may have changed or your permission may be insufficient. Refresh first.');}
  finally{setBusy(false);}
 }
 return <DashboardLayout title="Staff leave" subtitle={manager?'Private centre staff leave reviews':'Your own leave requests'}
  actions={allowed?<Dialog open={showForm} onOpenChange={open=>{if(!busy)setShowForm(open);}}>
   <DialogTrigger asChild><Button className="min-h-11"><Plus className="mr-2 size-4"/>Request leave</Button></DialogTrigger>
   <DialogContent><DialogHeader><DialogTitle>Request staff leave</DialogTitle></DialogHeader>
    <div className="space-y-4">
     <Label htmlFor="leave-type">Leave type</Label><Select value={form.leave_type} onValueChange={v=>setForm(prev=>({...prev,leave_type:v}))}>
      <SelectTrigger id="leave-type" aria-label="Leave type"><SelectValue/></SelectTrigger>
      <SelectContent>{LEAVE_TYPES.map(type=><SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select>
     <div className="grid gap-3 sm:grid-cols-2">
      <div><Label htmlFor="leave-start">Start date</Label><Input id="leave-start" type="date" value={form.start_date} onChange={e=>setForm(prev=>({...prev,start_date:e.target.value}))}/></div>
      <div><Label htmlFor="leave-end">End date</Label><Input id="leave-end" type="date" value={form.end_date} onChange={e=>setForm(prev=>({...prev,end_date:e.target.value}))}/></div>
     </div>
     <p className="text-sm text-muted-foreground">Duration: {inclusiveDays(form.start_date,form.end_date)??'Select valid dates'} days. Requests are subject to centre approval.</p>
     <div><Label htmlFor="leave-reason">Reason (private staff information)</Label>
      <Textarea id="leave-reason" maxLength={2000} rows={3} value={form.reason} onChange={e=>setForm(prev=>({...prev,reason:e.target.value}))}/></div>
     <Button className="min-h-11 w-full" disabled={busy||!inclusiveDays(form.start_date,form.end_date)} onClick={()=>void submit()}>{busy?'Submitting…':'Submit request'}</Button>
    </div>
   </DialogContent>
  </Dialog>:undefined}>
  {!allowed?<p role="alert">An assigned centre and an authorised staff role are required to view leave information.</p>:<>
   <section className="mb-5 rounded-xl border bg-card p-4">
    <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4"/>Private personnel information</h2>
    <p className="mt-2 text-sm text-muted-foreground">Staff see only their own leave. Centre directors can review authorised colleagues at their centre. Managers cannot approve their own leave. Database permissions remain authoritative.</p>
   </section>
   {records.loading?<p role="status">Verifying your leave records…</p>:records.error?
    <div role="alert" className="space-y-2 rounded-lg border border-destructive p-4"><p>Staff leave records could not be verified. No partial list is shown.</p>
     <Button variant="outline" onClick={()=>void records.refetch()}>Retry staff leave</Button></div>:
    <>
     <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Pending" value={stats.pending} icon={Clock}/><StatCard label="Approved" value={stats.approved} icon={CheckCircle}/>
      <StatCard label="Rejected" value={stats.rejected} icon={XCircle}/><StatCard label="Approved days" value={stats.days} icon={Calendar}/>
     </div>
     <div className="mb-4 flex flex-wrap items-center gap-3"><label className="text-sm font-medium">Show
      <Select value={filter} onValueChange={v=>{setFilter(v as Filter);setPage(0);}}>
       <SelectTrigger aria-label="Filter staff leave by status" className="mt-1 min-h-11 w-48"><SelectValue/></SelectTrigger>
       <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="pending">Pending</SelectItem>
        <SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent>
      </Select></label>
      <Button variant="outline" className="min-h-11" disabled={busy} onClick={()=>void records.refetch()}>Refresh leave</Button>
     </div>
     <p role="status" className="mb-3 text-sm text-muted-foreground">{filtered.length} of {scoped.length} authorised requests match.</p>
     <div className="space-y-3">{filtered.slice(current*20,current*20+20).map(row=><article key={row.id} className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{row.user_name}</h3>
       <StatusBadge status={row.status} variant={row.status==='approved'?'success':row.status==='rejected'?'danger':'warning'}/></div>
      <p className="mt-2 text-sm">{row.leave_type} · {row.start_date} to {row.end_date} · {row.days_count} recorded days</p>
      {row.reason&&<p className="mt-2 break-words text-sm text-muted-foreground">Reason: {row.reason}</p>}
      {row.rejection_reason&&<p className="mt-2 break-words text-sm text-muted-foreground">Review reason: {row.rejection_reason}</p>}
      {manager&&row.status==='pending'&&<div className="mt-3 flex flex-wrap gap-2">
       {row.user_id===user!.id?<p className="text-xs text-muted-foreground">Your own request requires a different authorised reviewer.</p>:<>
        <Button variant="outline" className="min-h-11" disabled={busy} onClick={()=>void decision(row,'approved')}>Approve {row.user_name}</Button>
        <Button variant="outline" className="min-h-11" disabled={busy} onClick={()=>void decision(row,'rejected')}>Reject {row.user_name}</Button>
       </>}
      </div>}
     </article>)}</div>
     {!filtered.length&&<p className="rounded-lg border p-5 text-sm text-muted-foreground">No authorised leave requests match this view.</p>}
     {filtered.length>20&&<nav aria-label="Leave request pages" className="mt-4 flex flex-wrap items-center gap-3">
      <Button variant="outline" disabled={current===0} onClick={()=>setPage(current-1)}>Previous requests</Button>
      <span>Page {current+1} of {Math.ceil(filtered.length/20)}</span>
      <Button variant="outline" disabled={(current+1)*20>=filtered.length} onClick={()=>setPage(current+1)}>Next requests</Button></nav>}
    </>
   }
  </>}
 </DashboardLayout>;
}
