import DashboardLayout from '@/components/layout/DashboardLayout';
import MicrosoftAccountReadiness from '@/components/classroom/MicrosoftAccountReadiness';
export default function MicrosoftOnboarding(){
 return <DashboardLayout title="Microsoft 365 setup" subtitle="Verified account status and administrator-led activation"><div className="mx-auto max-w-4xl"><MicrosoftAccountReadiness/></div></DashboardLayout>;
}
