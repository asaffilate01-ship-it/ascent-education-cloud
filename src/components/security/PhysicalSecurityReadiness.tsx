
import {Link} from 'react-router-dom';
import {PHYSICAL_SECURITY_ENABLED,physicalSecurityScope} from '@/lib/physicalSecurity';
import {useAuth} from '@/contexts/AuthContext';
export default function PhysicalSecurityReadiness(){
 const {user}=useAuth();
 const permitted=!!physicalSecurityScope(user);
 return !permitted?<p role="alert" className="rounded-xl border p-5">A verified, active Security Officer or Centre Director membership and centre assignment are required. A global platform role alone does not open private centre records.</p>:
 !PHYSICAL_SECURITY_ENABLED?<section role="status" className="rounded-xl border bg-card p-5">
  <h2 className="font-semibold">Centre security backend not activated</h2>
  <p className="mt-2 text-sm text-muted-foreground">The physical-centre data service is switched off until the correct UniPathway database, role/tenant RLS, visitor RPCs and emergency processes are validated in staging. No occupancy, visitor or CCTV data has been requested.</p>
  <Link to="/security" className="mt-3 inline-block font-medium underline">Existing CCTV readiness workspace</Link>
 </section>:null;
}
