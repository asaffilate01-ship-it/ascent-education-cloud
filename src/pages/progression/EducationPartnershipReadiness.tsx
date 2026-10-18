import {useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import PartnerApplicationsTracker from '@/components/progression/PartnerApplicationsTracker';
import StaffCredentialTracker from '@/components/progression/StaffCredentialTracker';

export default function EducationPartnershipReadiness(){
 const {user}=useAuth();const tenant=user?.tenantId;
 const manager=user?.roles.some(r=>['centre_director','superadmin'].includes(r))??false;
 const access=user?.roles.some(r=>['centre_director','superadmin','admissions_admin'].includes(r))??false;
 const [tab,setTab]=useState<'applications'|'staff'>('applications');
 return <DashboardLayout title="International Education Partner Readiness" subtitle="Manual partner approvals, IELTS registration and staff development">
  {!tenant||!access?<p role="alert">Centre assignment and management/admissions role required.</p>:
   <div className="space-y-5">
    <section className="surface-card p-5 space-y-2">
     <h2 className="font-semibold">Track approvals without claiming accreditation</h2>
     <p className="text-sm text-muted-foreground">British Council IELTS registration partner approval is separate from becoming an official test venue. A counsellor training certificate is a staff qualification, not an agency-wide endorsement. University recruitment agreements and OTHM/Qualifi progression evidence also require separate verification.</p>
     <div className="text-sm flex gap-3 flex-wrap">
      <a className="underline text-primary" href="https://agentsandcounsellors.britishcouncil.org/" target="_blank" rel="noopener noreferrer">UK agent/counsellor training</a>
      <a className="underline text-primary" href="https://ieltsb2bportal.britishcouncil.org/agent-application" target="_blank" rel="noopener noreferrer">IELTS partnership enquiry</a>
     </div>
    </section>
    <div className="flex gap-2 flex-wrap">
     <Button variant={tab==='applications'?'default':'outline'} onClick={()=>setTab('applications')}>Agency & university applications</Button>
     <Button variant={tab==='staff'?'default':'outline'} onClick={()=>setTab('staff')}>Staff qualifications</Button>
    </div>
    <div className="surface-card p-5">
     {tab==='applications'?<PartnerApplicationsTracker tenant={tenant} manager={manager}/>:
       <StaffCredentialTracker tenant={tenant} manager={manager}/>}
    </div>
   </div>}
 </DashboardLayout>;
}
