import DashboardLayout from '@/components/layout/DashboardLayout';
import SiteOperations from '@/components/security/SiteOperations';
import {Link} from 'react-router-dom';
import {useState} from 'react';
import SecurityCentrePicker,{useSecurityPrincipal,securityLink} from '@/components/security/SecurityCentrePicker';
export default function CentreFacilities(){
 const {user}=useSecurityPrincipal();
 const [tab,setTab]=useState<'facilities'|'cards'|'audit'|'visitor_signatures'|'cctv_audit'>('facilities');
 return <DashboardLayout title="Facilities and physical security" subtitle="Surveyed safety assets, card access records and centre audit history">
  <SecurityCentrePicker/>
  <nav className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-label="Security workspaces">{[['/security','CCTV · Hikvision gateway'],['/security/operations','Security command'],['/security/centre','Gate activity'],['/security/visitors','Visitor and guest reception'],['/security/muster','Emergency muster']].map(([to,label])=><Link key={to} to={securityLink(to,user?.tenantId,user?.role)} className="flex min-h-11 items-center rounded-lg border bg-card px-3 py-2 text-sm font-medium hover:bg-accent">{label}</Link>)}</nav>
  <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Facilities and access sections">{([['facilities','Fire safety & facilities'],['cards','Student & staff access cards'],['audit','Entry / exit audit'],['visitor_signatures','Visitor signatures'],['cctv_audit','CCTV viewing audit']] as const).map(([value,label])=><button type="button" key={value} aria-pressed={tab===value} onClick={()=>setTab(value)} className={'min-h-11 rounded-lg border px-3 py-2 text-sm font-medium '+(tab===value?'bg-primary text-primary-foreground':'bg-card')}>{label}</button>)}</div>
  <SiteOperations kind={tab}/>
 </DashboardLayout>;
}
