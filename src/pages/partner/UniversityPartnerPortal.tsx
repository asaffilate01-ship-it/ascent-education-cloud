import {Link,useLocation} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {Building2,ShieldCheck,ClipboardList,GraduationCap,FileCheck} from 'lucide-react';

/**
 * No verified university-user membership or institution-scoped referral view is
 * deployed/confirmed. A university_partner role alone cannot identify the
 * institution entitled to any applicant, invoice, commission or offer.
 *
 * This portal intentionally performs NO private record queries or stage writes.
 * Replace it only after approved partner membership, consent, JWT/RLS testing
 * and genuine admission/commission state transitions are independently proven.
 */
const areas={
 '/partner':{title:'University partner',purpose:'Institution access and verified partnership status'},
 '/partner/referrals':{title:'Referrals',purpose:'Student-consented referrals for your verified institution'},
 '/partner/applications':{title:'Applications',purpose:'Applications explicitly addressed to your institution'},
 '/partner/offers':{title:'Offers',purpose:'Authorised academic offers and verified decisions'},
 '/partner/commissions':{title:'Commissions',purpose:'Signed agreements and independently reconciled commission evidence'},
};
export default function UniversityPartnerPortal(){
 const {user}=useAuth();const {pathname}=useLocation();
 const area=areas[pathname as keyof typeof areas]||areas['/partner'];
 const verifiedRole=!!user&&user.role==='university_partner'&&Array.isArray(user.roles)&&user.roles.includes('university_partner');
 return <DashboardLayout title={area.title} subtitle={area.purpose}>
  {!verifiedRole?<p role="alert">This university partner workspace requires an active verified university partner role.</p>:<>
   <section aria-labelledby="partner-access-status" className="rounded-xl border bg-card p-5 space-y-3">
    <h2 id="partner-access-status" className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5"/>Institution-level access not yet verified</h2>
    <p className="text-sm text-muted-foreground">Your role does not by itself identify which university or organisation owns a referral. UniPathway is not displaying student applications, private assessment records, financial transactions or applicant contact details until that relationship is verified and permissioned server-side.</p>
    <p className="text-sm">No student applications, offers, fee payments or commissions have been changed by opening this page.</p>
   </section>
   <section aria-labelledby="partner-activation" className="mt-5 rounded-xl border bg-card p-5">
    <h2 id="partner-activation" className="font-semibold">What must be verified before partner access</h2>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
     {([
      [Building2,'Institution and account','An approved university–user membership tied to the correct centre and verified institution.'],
      [FileCheck,'Signed agreement','Active institution agreement, contract authority and any applicable recruitment/commission terms.'],
      [GraduationCap,'Individual student consent','An explicit opt-in to disclose each referral/application to that verified institution.'],
      [ClipboardList,'Isolated workflow','JWT-backed RLS for institution-only applications and offers, plus an auditable commission ledger.'],
     ] as const).map(([Icon,title,description])=><article className="rounded-lg border bg-secondary/20 p-4" key={title}>
      <h3 className="flex items-center gap-2 text-sm font-semibold"><Icon className="size-4"/>{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
     </article>)}
    </div>
   </section>
   <nav aria-label="University partner areas" className="mt-5 flex flex-wrap gap-2">
    {Object.entries(areas).map(([path,value])=><Link key={path} to={path} aria-current={pathname===path?'page':undefined}
     className={'inline-flex min-h-11 items-center rounded-lg border px-3 py-2 text-sm font-medium '+(pathname===path?'bg-primary text-primary-foreground':'bg-card hover:bg-accent')}>
      {value.title}
    </Link>)}
   </nav>
   <p className="mt-4 text-sm text-muted-foreground">Your UniPathway centre administrator can review the required institutional verification. Published information about potential study pathways is available in the <Link className="underline" to="/university-progression">public progression directory</Link>; it does not establish a partnership.</p>
  </>}
 </DashboardLayout>;
}
