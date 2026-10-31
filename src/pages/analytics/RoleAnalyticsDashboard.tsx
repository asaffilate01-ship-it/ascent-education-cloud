import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {Link} from 'react-router-dom';
import {useAuth} from '@/contexts/AuthContext';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
import {BookOpen,Calendar,ClipboardList,CreditCard,GraduationCap,ShieldCheck,Users} from 'lucide-react';
import type {UserRole} from '@/types/platform';

type ReportRole='centre_director'|'superadmin'|'admissions_admin'|'finance_officer'|
 'marketing_officer'|'programme_leader'|'lecturer';
type ReportCard={label:string;value:string;explanation:string;href:string;icon:typeof BookOpen};
const REPORT_ROLES:readonly ReportRole[]=[
 'centre_director','superadmin','admissions_admin','finance_officer',
 'marketing_officer','programme_leader','lecturer',
];
const reportTitle:Record<ReportRole,string>={
 centre_director:'Centre performance',superadmin:'Selected centre performance',
 admissions_admin:'Admissions reports',finance_officer:'Finance reports',
 marketing_officer:'Marketing reports',programme_leader:'Programme reports',
 lecturer:'My teaching reports',
};
/**
 * Shared reporting route with role-specific data sources. An assigned role alone
 * is never cross-centre authorisation. Backend RLS is still authoritative.
 *
 * No provisional submissions, private grades, universal finance and partner
 * commission data is queried by a lecturer, marketer or external partner.
 */
export default function RoleAnalyticsDashboard(){
 const {user}=useAuth();
 return <Reports key={[user?.id,user?.tenantId,user?.role].join(':')}/>;
}
function Reports(){
 const {user}=useAuth();
 const role=user?.role as UserRole|undefined;
 const known=!!role&&REPORT_ROLES.some(r=>r===role);
 const allowed=!!user&&known&&Array.isArray(user.roles)&&user.roles.includes(user.role)&&!!user.tenantId;
 const director=role==='centre_director'||role==='superadmin';
 const admissions=director||role==='admissions_admin'||role==='marketing_officer';
 const finance=director||role==='finance_officer';
 const academic=director||role==='programme_leader';
 const teaching=academic||role==='lecturer';
 const programmesAllowed=academic||role==='admissions_admin';
 const scope=[{column:'tenant_id',operator:'eq' as const,value:user?.tenantId||''}];
 const applications=useSupabaseQuery('applications',{enabled:allowed&&admissions,filters:scope});
 const invoices=useSupabaseQuery('invoices',{enabled:allowed&&finance,filters:scope});
 const attendance=useSupabaseQuery('attendance_records',{enabled:allowed&&academic,filters:scope});
 const programmes=useSupabaseQuery('programmes',{enabled:allowed&&programmesAllowed,filters:scope});
 const modules=useSupabaseQuery('modules',{
  enabled:allowed&&teaching,
  filters:[...scope,...(role==='lecturer'?[{column:'lecturer_id',operator:'eq' as const,value:user?.id||''}]:[])],
 });
 const sources=[
  [applications,admissions],[invoices,finance],[attendance,academic],
  [programmes,programmesAllowed],[modules,teaching]
 ] as const;
 const enabledSources=sources.filter(([,enabled])=>allowed&&enabled).map(([source])=>source);
 const loading=enabledSources.some(s=>s.loading);
 const error=enabledSources.some(s=>!!s.error);
 const title=role&&known?reportTitle[role as ReportRole]:'Reports';
 if(!allowed)return <DashboardLayout title={title}>
  <p role="alert">A verified reporting role and a selected centre are required. No institution-wide academic, financial or learner data has been requested.</p>
 </DashboardLayout>;
 if(loading)return <DashboardLayout title={title}><p role="status">Verifying centre-scoped reports…</p></DashboardLayout>;
 if(error)return <DashboardLayout title={title}>
  <div role="alert" className="space-y-3 rounded-xl border border-destructive p-5">
   <p>One or more authorised report sources could not be verified. No partial statistics are displayed.</p>
   <Button variant="outline" onClick={()=>enabledSources.forEach(s=>{void s.refetch();})}>Retry my reports</Button>
  </div>
 </DashboardLayout>;

 const cards:ReportCard[]=[];
 if(admissions){
  const all=applications.data.filter(x=>x.tenant_id===user.tenantId);
  const enrolled=all.filter(x=>x.stage==='enrolled').length;
  cards.push({label:'Recorded applications',value:String(all.length),explanation:'Only applications visible to your role at this centre',icon:ClipboardList,href:role==='marketing_officer'?'/marketing':'/admissions/applications'});
  cards.push({label:'Admissions at enrolled stage',value:String(enrolled),explanation:'CRM stage only — not a certified qualification or enrolment guarantee',icon:GraduationCap,href:role==='marketing_officer'?'/marketing':'/admissions/applications'});
 }
 if(finance){
  const own=invoices.data.filter(x=>x.tenant_id===user.tenantId);
  cards.push({label:'Recorded invoices',value:String(own.length),explanation:'Invoice records, not verified bank-settled revenue',icon:CreditCard,href:'/finance/invoices'});
  cards.push({label:'Unpaid invoice balances',value:String(own.filter(x=>Number(x.amount)>Number(x.paid)).length),explanation:'Accounts requiring reconciliation; sponsor agreements may affect liability',icon:CreditCard,href:'/finance/invoices'});
 }
 if(academic){
  const own=attendance.data.filter(x=>x.tenant_id===user.tenantId);
  const knownRows=own.filter(x=>['present','late','absent'].includes(x.status));
  const attended=knownRows.filter(x=>x.status==='present'||x.status==='late').length;
  cards.push({label:'Recorded attendance',value:knownRows.length?Math.round(attended/knownRows.length*100)+'%':'Not available',
   explanation:'Present and late ÷ present, late and absent; excused records excluded',icon:Calendar,href:role==='programme_leader'?'/programme/attendance':'/director/attendance'});
 }
 if(programmesAllowed){
  const own=programmes.data.filter(x=>x.tenant_id===user.tenantId);
  cards.push({label:'Centre programmes recorded',value:String(own.length),explanation:'Catalogue count; not evidence of awarding-body approval',icon:BookOpen,href:role==='admissions_admin'?'/admissions':'/programme/modules'});
 }
 if(teaching){
  const own=modules.data.filter(x=>x.tenant_id===user.tenantId&&(role!=='lecturer'||x.lecturer_id===user.id));
  cards.push({label:role==='lecturer'?'My assigned modules':'Modules recorded',value:String(own.length),
   explanation:role==='lecturer'?'Only modules explicitly assigned to your lecturer identity':'Centre module inventory; not released student grades',
   icon:Users,href:role==='lecturer'?'/lecturer/teaching':'/programme/modules'});
 }
 return <DashboardLayout title={title} subtitle="Verified records for your selected role and assigned centre">
  <section className="mb-5 rounded-xl border bg-card p-4">
   <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4"/>Role-scoped information</h2>
   <p className="mt-2 text-sm text-muted-foreground">Only authorised reporting sources are requested for this active role. This workspace does not expose provisional assessment marks, student health records or unverified university commission claims.</p>
  </section>
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
   {cards.map(card=><article className="rounded-xl border bg-card p-5" key={card.label}>
    <h2 className="flex items-center gap-2 text-sm font-semibold"><card.icon className="size-4 text-primary"/>{card.label}</h2>
    <p className="mt-3 text-2xl font-bold tabular-nums">{card.value}</p>
    <p className="mt-2 min-h-12 text-sm text-muted-foreground">{card.explanation}</p>
    <Link className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline" to={card.href}>Review authorised records</Link>
   </article>)}
  </div>
  <p className="mt-5 text-xs text-muted-foreground">Counts describe the accessible records in the selected centre. They do not represent externally verified grades, revenue settlement, safeguarding decisions or current university eligibility.</p>
 </DashboardLayout>;
}
