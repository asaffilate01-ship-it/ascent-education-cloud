import {useState} from 'react';
import {Link,useLocation,useSearchParams} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useAuth} from '@/contexts/AuthContext';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
import AdmissionsJourney from '@/components/admissions/AdmissionsJourney';
const content={
 documents:{title:'Document and identity verification',description:'Inspect matching KYC document statuses and signed records. Verification must be performed by an authorised officer, not inferred from an upload.'},
 eligibility:{title:'Programme and entry eligibility',description:'Verify the exact programme, admission requirements, awarding-body scope and recorded evidence before an unconditional offer.'},
 offers:{title:'Offers, acceptance and finance',description:'Track offers and student acceptance. An application pipeline stage or invoice balance is not legal acceptance or a funding decision.'},
 allocations:{title:'Enrolment, modules and scheduling',description:'Check the confirmed handover, programme-linked modules, lecturer allocations, schedules and learner ID-card requirements.'},
} as const;
export default function AdmissionsReviewDesk(){
 const {user}=useAuth(),location=useLocation();
 const [params,setParams]=useSearchParams(),[search,setSearch]=useState('');
 const kind=location.pathname.endsWith('/documents')?'documents':location.pathname.endsWith('/eligibility')?'eligibility':location.pathname.endsWith('/offers')?'offers':'allocations';
 const spec=content[kind];
 const authorised=!!user?.id&&!!user.tenantId&&['admissions_admin','centre_director'].includes(user.role)&&user.roles?.includes(user.role);
 const scoped=useSupabaseQuery('applications',{
  enabled:authorised,filters:user?.tenantId?[{column:'tenant_id',operator:'eq',value:user.tenantId}]:[],
  orderBy:{column:'updated_at',ascending:false},
 });
 const apps=scoped.data.filter(a=>a.tenant_id===user?.tenantId);
 const term=search.trim().toLowerCase();
 const filtered=apps.filter(a=>!term||[a.student_name,a.email,a.programme_name||'',a.stage].some(v=>v.toLowerCase().includes(term)));
 const selected=apps.find(a=>a.id===params.get('application'));
 return <DashboardLayout title={spec.title} subtitle={spec.description}>
  <div className="space-y-5">
   {!authorised?<p role="alert" className="rounded-xl border p-5">A verified Admissions Admin or Centre Director role and a centre assignment are required.</p>:<>
    <section className="rounded-xl border bg-card p-5 space-y-3">
     <h2 className="font-semibold">One application, eight independently verified steps</h2>
     <p className="text-sm text-muted-foreground">These workflows show actual recorded source evidence, not automatically awarded qualifications, reviewed finance, payment settlement or issued ID cards. The final enrolment action must be confirmed by the authorised server transaction.</p>
     <div className="flex flex-wrap gap-2">{Object.entries(content).map(([key,x])=><Link key={key} className="inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-medium hover:bg-accent" to={'/admissions/'+key}>{x.title}</Link>)}</div>
    </section>
    {scoped.loading&&<p role="status">Verifying assigned-centre applications…</p>}
    {scoped.error&&<p role="alert">Applications could not be loaded. No source decisions are available. <Button variant="outline" onClick={()=>void scoped.refetch()}>Retry</Button></p>}
    {!scoped.loading&&!scoped.error&&<section className="rounded-xl border bg-card p-5 space-y-3">
     <h2 className="font-semibold">Select a verified application</h2>
     <label className="block max-w-md text-sm">Find student, programme or current stage
      <Input value={search} onChange={e=>setSearch(e.target.value)} className="mt-1" maxLength={120}/>
     </label>
     <p role="status" className="text-xs text-muted-foreground">{filtered.length} of {apps.length} centre applications</p>
     <div className="grid gap-2 lg:grid-cols-2 max-h-80 overflow-y-auto">
      {filtered.map(a=><Button key={a.id} variant={selected?.id===a.id?'default':'outline'} className="h-auto min-h-11 flex-col items-start whitespace-normal py-3 text-left"
       onClick={()=>setParams({application:a.id},{replace:true})}>
       <span className="font-semibold">{a.student_name}</span><span className="text-xs">{a.programme_name||'Programme not verified'} · {a.stage.replace(/_/g,' ')}</span>
      </Button>)}
      {!filtered.length&&<p className="text-sm text-muted-foreground">No matching applications. Confirm that your account has the correct centre membership.</p>}
     </div>
    </section>}
    {selected&&<AdmissionsJourney key={[user?.id,user?.role,user?.tenantId,selected.id].join(':')} application={selected as any}/>}
    {!selected&&!scoped.loading&&!scoped.error&&<p role="status">Choose an applicant above to inspect identity, funding, offer, enrolment and allocation evidence.</p>}
   </>}
  </div>
 </DashboardLayout>;
}
