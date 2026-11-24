import DashboardLayout from '@/components/layout/DashboardLayout';
import MicrosoftAccountReadiness from '@/components/classroom/MicrosoftAccountReadiness';
export default function MicrosoftAccountCentre(){
 return <DashboardLayout title="My Microsoft account" subtitle="Institutional Microsoft 365 and Teams identity"><div className="mx-auto max-w-4xl"><MicrosoftAccountReadiness/></div></DashboardLayout>;
}
