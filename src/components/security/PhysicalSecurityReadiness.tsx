
import {Link} from 'react-router-dom';
import {PHYSICAL_SECURITY_ENABLED,physicalSecurityScope} from '@/lib/physicalSecurity';
import {useSecurityPrincipal,securityLink} from '@/components/security/SecurityCentrePicker';
export default function PhysicalSecurityReadiness(){
 const {user}=useSecurityPrincipal();
 const permitted=!!physicalSecurityScope(user);
 return !permitted?<p role="alert" className="rounded-xl border p-5">A verified Security Officer, Centre Director or Superadmin with an assigned centre is required. A global role without a centre does not open private security records.</p>:
 !PHYSICAL_SECURITY_ENABLED?<section role="status" className="rounded-xl border bg-card p-5">
  <h2 className="font-semibold">Centre security backend not activated</h2>
  <p className="mt-2 text-sm text-muted-foreground">Centre occupancy and visitor tools are not switched on yet. No physical operations records have been opened.</p>
  <Link to={securityLink("/security",user?.tenantId,user?.role)} className="mt-3 inline-block font-medium underline">Existing CCTV readiness workspace</Link>
 </section>:null;
}
