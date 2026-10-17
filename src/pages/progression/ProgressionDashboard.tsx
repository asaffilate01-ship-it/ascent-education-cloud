import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import { Award, CheckCircle2, FileText, Globe2, GraduationCap, ShieldCheck } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PartnerWorkflow from '@/components/progression/PartnerWorkflow';
import AcademicEvidenceDirectory from '@/components/progression/AcademicEvidenceDirectory';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const db:SupabaseClient=supabase;
const STAFF_ROLES=['centre_director','superadmin','admissions_admin','programme_leader'];
const DESTINATIONS=['All','UK','USA','Canada','Australia','Germany','Pakistan'];
type Route={
 id:string;destination_country:string;destination_institution:string;destination_programme:string;
 route_name:string;qualification_name:string|null;qualification_level:string|null;entry_stage:string|null;
};
type Application={id:string;student_id:string;programme:string;destination_country:string;status:string;intake:string|null};
function statusName(x:string){return x.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}

export default function ProgressionDashboard(){
 const {user}=useAuth();
 const tenant=user?.tenantId;
 const isStaff=user?.roles.some(role=>STAFF_ROLES.includes(role))??false;
 const [routes,setRoutes]=useState<Route[]>([]);
 const [applications,setApplications]=useState<Application[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [country,setCountry]=useState('All');
 const request=useRef(0);
 const load=useCallback(async()=>{
   const version=++request.current;
   setRoutes([]);setApplications([]);setError('');
   if(!tenant||!user?.id){setLoading(false);return;}
   setLoading(true);
   try{
     const apps=db.from('international_university_applications')
       .select('id,student_id,programme,destination_country,status,intake').eq('tenant_id',tenant);
     if(!isStaff) apps.eq('student_id',user.id);
     const results=await Promise.all([
       db.from('international_pathway_routes')
        .select('id,route_name,qualification_name,qualification_level,destination_country,destination_institution,destination_programme,entry_stage')
        .eq('tenant_id',tenant).eq('review_status','verified').eq('student_visible',true)
        .order('destination_country').order('destination_institution').limit(200),
       apps.order('updated_at',{ascending:false}).limit(200),
     ]);
     if(request.current!==version)return;
     if(results.some(r=>r.error))throw new Error('The pathway or application records could not be loaded.');
     setRoutes((results[0].data||[]) as Route[]);
     setApplications((results[1].data||[]) as Application[]);
   }catch(e){
     if(request.current===version)setError(e instanceof Error?e.message:'Unable to load verified progression routes');
   }finally{
     if(request.current===version)setLoading(false);
   }
 },[tenant,user?.id,isStaff]);
 useEffect(()=>{void load();return()=>{request.current++;};},[load]);
 const displayed=useMemo(()=>routes.filter(route=>
   country==='All'||route.destination_country.toLowerCase()===country.toLowerCase()),[routes,country]);
 const offers=applications.filter(a=>a.status==='offer').length;
 const enrolled=applications.filter(a=>a.status==='enrolled').length;
 const partnersLink=user?.roles.includes('superadmin')?'/landlord/global-partners':
  user?.roles.includes('admissions_admin')?'/admissions/global-partners':'/director/global-partners';

 return <DashboardLayout title="University Progression" subtitle="Evidence-reviewed destinations and student applications">
   <section className="surface-card p-5 mb-5 space-y-3">
     <div className="flex gap-3 items-start"><ShieldCheck className="w-6 h-6 text-primary shrink-0"/><div className="space-y-1">
       <h2 className="font-semibold">University pathways with verified evidence</h2>
       <p className="text-sm text-muted-foreground">This directory displays only routes whose evidence has been reviewed and whose institutional agreement is recorded as current. Entry depends on the university’s own assessment of the learner and qualification; admission is never guaranteed. Unverified OTHM and Qualifi progression proposals are kept private from students.</p>
       <p className="text-xs text-muted-foreground">Referral commission is never presumed from a progression listing. Finance must use the actual signed agreement and settlement evidence.</p>
     </div></div>
     {isStaff&&<Button variant="outline" asChild><Link to={partnersLink}>Manage institutions, contracts and proposals</Link></Button>}
   </section>
   {!tenant?<p role="alert" className="surface-card p-5">A centre assignment is required to see student-specific pathways.</p>:
    loading?<div className="surface-card p-6" role="status">Loading verified pathways and applications…</div>:
    error?<div className="surface-card p-5 space-y-3"><p role="alert">{error}</p><Button onClick={()=>void load()}>Retry</Button></div>:
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {label:'Published contracted routes',value:routes.length,icon:Globe2},
          {label:isStaff?'Centre applications':'Your applications',value:applications.length,icon:FileText},
          {label:'Offers recorded',value:offers,icon:Award},
          {label:'Enrolments recorded',value:enrolled,icon:CheckCircle2}
        ].map(item=><div className="surface-card p-4 flex gap-3 items-center" key={item.label}><item.icon className="w-6 h-6 text-primary"/><div><p className="text-2xl font-bold">{item.value}</p><p className="text-xs text-muted-foreground">{item.label}</p></div></div>)}
      </div>
      <AcademicEvidenceDirectory tenant={tenant} student={!isStaff} manager={user?.roles.includes('superadmin')||user?.roles.includes('centre_director')||false}/>
      <section className="surface-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap"><div><h2 className="text-lg font-semibold">Contract-backed recruitment pathways</h2><p className="text-sm text-muted-foreground">These pathways require a current recruitment agreement. Academic recognition evidence is shown separately above and does not imply commission rights.</p></div>
          <select className="rounded-lg border bg-background px-3 py-2 text-sm" value={country} aria-label="Filter university routes by country" onChange={e=>setCountry(e.target.value)}>
           {DESTINATIONS.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {displayed.length?<div className="grid gap-3 md:grid-cols-2">
          {displayed.map(route=><article key={route.id} className="rounded-xl border p-4 space-y-2">
            <span className="inline-flex items-center gap-1 text-xs text-success"><ShieldCheck className="w-3.5 h-3.5"/> Verified and published</span>
            <h3 className="font-semibold">{route.destination_institution}</h3>
            <p className="text-sm">{route.destination_programme}</p>
            <p className="text-sm text-muted-foreground">{route.destination_country} · {route.qualification_name||'Qualification assessed individually'} {route.qualification_level||''}</p>
            <p className="text-xs text-muted-foreground">Expected entry stage: {route.entry_stage||'Institution to confirm'}</p>
          </article>)}
        </div>:<div className="rounded-xl bg-secondary/60 p-6 text-sm text-muted-foreground">
           There are currently no verified, published routes matching this destination in your centre. Prospective university listings must not be advertised as confirmed agreements.
        </div>}
        {routes.length===200&&<p className="text-xs text-muted-foreground">Showing the first 200 published routes; contact admissions for the full catalogue.</p>}
      </section>
      {!isStaff&&<PartnerWorkflow student/>}
      <section className="surface-card p-5 space-y-3">
        <h2 className="text-lg font-semibold">Application tracker</h2>
        {applications.length? <div className="space-y-2">{applications.map(app=><article key={app.id} className="rounded-lg border p-3 flex items-center justify-between gap-3 flex-wrap">
          <div><p className="text-sm font-semibold">{app.programme}</p><p className="text-xs text-muted-foreground">{app.destination_country} · {app.intake||'Intake to be confirmed'}</p></div>
          <span className="text-xs px-3 py-1.5 bg-secondary rounded-full">{statusName(app.status)}</span>
        </article>)}</div>:<p className="text-sm text-muted-foreground">No university application cases have been recorded yet.</p>}
        {!isStaff&&<Button variant="outline" asChild><Link to="/student/international-applications"><GraduationCap className="w-4 h-4 mr-2"/> University application support</Link></Button>}
        {applications.length===200&&<p className="text-xs text-muted-foreground">Showing the 200 most recent application cases.</p>}
      </section>
    </div>}
 </DashboardLayout>;
}
