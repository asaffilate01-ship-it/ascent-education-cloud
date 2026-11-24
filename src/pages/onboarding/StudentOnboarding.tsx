import CentreCardWorkspace from '@/components/admissions/CentreCardWorkspace';
import ApplicationDraft from '@/components/admissions/ApplicationDraft';
import IdentityConnectionStatus from '@/components/IdentityConnectionStatus';
import OnboardingEvidence from '@/components/admissions/OnboardingEvidence';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {studentEvidence} from '@/lib/onboardingEvidence';
export default function StudentOnboarding(){
 const {user,loading}=useAuth();
 const allowed=!loading&&!!user?.tenantId&&user.role==='student'&&user.roles?.includes('student')===true;
 return <DashboardLayout title="Student onboarding" subtitle="Your application, identity and qualification evidence">
  {loading?<p role="status">Checking your account…</p>:!allowed?<p role="alert">A verified student account with an assigned centre is required. Contact admissions if your account is not ready.</p>:<>
  <IdentityConnectionStatus key={user.id+':'+user.tenantId}/><ApplicationDraft kind="student"/><OnboardingEvidence kind="student" requirements={studentEvidence}/><CentreCardWorkspace/>
  </>}
 </DashboardLayout>;
}
