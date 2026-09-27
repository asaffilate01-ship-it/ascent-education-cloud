import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { BookOpen, FileCheck, Users, ShieldCheck } from 'lucide-react';
export default function AwardingBodyDashboard(){
 const {data:programmes}=useSupabaseQuery('programmes'); const {data:modules}=useSupabaseQuery('modules');
 const {data:submissions}=useSupabaseQuery('submissions'); const {data:profiles}=useSupabaseQuery('profiles');
 return <DashboardLayout title="External Quality Evidence" subtitle="Read-only centre, qualification and assessment evidence">
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
   <StatCard label="Programmes" value={programmes.length} icon={BookOpen}/><StatCard label="Modules" value={modules.length} icon={FileCheck}/>
   <StatCard label="Learner/Staff Profiles" value={profiles.length} icon={Users}/><StatCard label="Assessment Evidence" value={submissions.length} icon={ShieldCheck}/>
  </div>
  <Card><CardHeader><CardTitle className="text-sm">Evidence Portal</CardTitle></CardHeader><CardContent>
   <p className="text-sm text-muted-foreground">This portal is intentionally read-only. Evidence access will be scoped by centre, approved qualification and requested sample through database RLS.</p>
  </CardContent></Card>
 </DashboardLayout>
}