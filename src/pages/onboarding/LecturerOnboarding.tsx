import ApplicationDraft from '@/components/admissions/ApplicationDraft';
import OnboardingEvidence from '@/components/admissions/OnboardingEvidence';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {lecturerEvidence} from '@/lib/onboardingEvidence';
export default function LecturerOnboarding(){
 const {user,loading}=useAuth();
 const allowed=!loading&&!!user?.tenantId&&user.role==='lecturer'&&user.roles?.includes('lecturer')===true;
 return <DashboardLayout title="Part-time tutor & lecturer onboarding" subtitle="Classroom, remote or hybrid teaching applications and evidence">
  {loading?<p role="status">Checking your account…</p>:!allowed?<p role="alert">A verified lecturer account with an assigned centre is required. Managers can review applicants from their own centre workspace.</p>:<>
  <ApplicationDraft kind="lecturer"/><OnboardingEvidence kind="lecturer" requirements={lecturerEvidence}/>
  </>}
 </DashboardLayout>;
}
