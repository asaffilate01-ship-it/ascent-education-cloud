import DashboardLayout from '@/components/layout/DashboardLayout';
import IELTSMockRehearsals from '@/components/ielts/IELTSMockRehearsals';
import {useAuth} from '@/contexts/AuthContext';

export default function IELTSMockOpsPage(){
 const {user}=useAuth();
 return <DashboardLayout title="IELTS Practice Exam Operations" subtitle="Supervised preparation sessions — not an official IELTS test centre">
  {!user?.tenantId?<p role="alert" className="surface-card p-5">Assign an educational centre before accessing student exam rehearsals.</p>:
    <IELTSMockRehearsals />}
 </DashboardLayout>;
}
