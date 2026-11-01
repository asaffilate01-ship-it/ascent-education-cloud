import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {ShieldCheck,FileCheck2,Building2,ClipboardCheck} from 'lucide-react';

/**
 * External EQA access is intentionally unavailable until the database can
 * prove an approved external reviewer -> awarding body -> centre -> named
 * qualification -> consented evidence-sample relationship for every read.
 * An app role alone must never expose submissions, learner profiles or PII.
 */
const requirements=[
 {icon:Building2,title:'Awarding-body membership',details:'Verified active reviewer identity, institution, permitted centre and qualification scope.'},
 {icon:FileCheck2,title:'Approved evidence sample',details:'A named, time-limited sample approved by the centre with a legitimate assessment purpose.'},
 {icon:ShieldCheck,title:'Independent database isolation',details:'Real JWT-backed RLS denying unrelated students, centres, results and other awarding bodies.'},
 {icon:ClipboardCheck,title:'Audit and expiry',details:'Evidence views must be logged and expire when the review or reviewer assignment ends.'},
] as const;
export default function AwardingBodyDashboard(){
 const {user}=useAuth();
 const verified=!!user&&user.role==='awarding_body_eqa'&&user.roles?.includes('awarding_body_eqa');
 return <DashboardLayout title="External quality assurance" subtitle="Evidence access requires approved awarding-body scope">
  {!verified?<p role="alert" className="rounded-lg border p-5">An active, verified External Quality Assurer role is required. Switching to a different dashboard role does not grant an external review assignment.</p>:<>
   <section className="rounded-xl border bg-card p-5 space-y-3" role="status">
    <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5"/>Restricted evidence workspace</h2>
    <p className="text-sm text-muted-foreground">Your UniPathway role alone is not proof that a specific awarding body authorised you to view a centre or student's work. The external EQA evidence service is not yet independently confirmed; no learner profiles, submissions, marks, ID documents or staff records are loaded here.</p>
    <p className="text-sm">No qualification approval, moderation decision or certificate has been changed.</p>
   </section>
   <section className="mt-5 grid gap-3 md:grid-cols-2" aria-label="External evidence activation requirements">
    {requirements.map(({icon:Icon,title,details})=><article key={title} className="rounded-xl border bg-card p-4">
     <h3 className="flex items-center gap-2 font-semibold text-sm"><Icon className="size-4"/>{title}</h3>
     <p className="mt-2 text-sm text-muted-foreground">{details}</p>
    </article>)}
   </section>
  </>}
 </DashboardLayout>;
}
