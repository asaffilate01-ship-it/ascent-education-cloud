import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable from '@/components/ui/DataTable';
import { GraduationCap, Users, CreditCard, FileText, Award, Globe, Building2, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

/*
  University Partner Portal
  ─────────────────────────
  Flow: Our platform refers graduating/progressing students TO partner universities
        for top-up degrees. We earn commission from universities per enrolment.
  
  University partner users see:
  - Students referred to their institution
  - Ability to review & issue offers
  - Their programme listings on our platform
  - Commission payments they owe us
*/

interface ReferredStudent {
  id: string;
  student_name: string;
  email: string;
  programme_name: string | null;
  level: string | null;
  stage: string;
  source: string | null;
  created_at: string;
  updated_at: string;
}

const stageConfig = (stage: string) => {
  const map: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'danger' | 'neutral' }> = {
    applied: { label: 'Application Received', variant: 'info' },
    under_review: { label: 'Under Review', variant: 'warning' },
    conditional_offer: { label: 'Conditional Offer', variant: 'info' },
    unconditional_offer: { label: 'Unconditional Offer', variant: 'success' },
    deposit_paid: { label: 'Deposit Paid', variant: 'success' },
    enrolled: { label: 'Enrolled', variant: 'success' },
    lost: { label: 'Withdrawn', variant: 'danger' },
    deferred: { label: 'Deferred', variant: 'neutral' },
  };
  return map[stage] || { label: stage.replace(/_/g, ' '), variant: 'neutral' as const };
};

export default function UniversityPartnerPortal() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('students');

  const { data: applications, loading: aLoading, refetch } = useSupabaseQuery('applications', {
    orderBy: { column: 'updated_at', ascending: false },
  });

  const { data: universities, loading: uLoading } = useSupabaseQuery('partner_universities' as any, {
    orderBy: { column: 'name', ascending: true },
  });

  const { data: programmes, loading: pLoading } = useSupabaseQuery('programmes');

  const loading = aLoading || uLoading || pLoading;
  if (loading) return <DashboardSkeleton />;

  const unis = (universities || []) as any[];

  // Students referred by our platform to universities (progression-stage apps)
  const referredStudents = applications.filter(a =>
    ['applied', 'under_review', 'conditional_offer', 'unconditional_offer', 'deposit_paid', 'enrolled', 'deferred'].includes(a.stage)
  );

  const pendingReview = referredStudents.filter(a => ['applied', 'under_review'].includes(a.stage)).length;
  const offersIssued = referredStudents.filter(a => ['conditional_offer', 'unconditional_offer'].includes(a.stage)).length;
  const enrolledCount = referredStudents.filter(a => a.stage === 'enrolled').length;
  const depositPaid = referredStudents.filter(a => a.stage === 'deposit_paid').length;

  const handleUpdateStage = async (appId: string, newStage: string) => {
    const { error } = await supabase
      .from('applications')
      .update({ stage: newStage as any })
      .eq('id', appId);

    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`Student status updated to ${newStage.replace(/_/g, ' ')}`);
      refetch();
    }
  };

  const studentColumns = [
    { key: 'student_name', label: 'Student', render: (s: any) => (
      <div>
        <p className="text-sm font-medium">{s.student_name}</p>
        <p className="text-[10px] text-muted-foreground">{s.email}</p>
      </div>
    )},
    { key: 'programme_name', label: 'Applied Programme', render: (s: any) => (
      <span className="text-xs">{s.programme_name || 'N/A'}</span>
    )},
    { key: 'level', label: 'Level', render: (s: any) => (
      <span className="text-xs">{s.level || 'N/A'}</span>
    )},
    { key: 'stage', label: 'Status', render: (s: any) => {
      const cfg = stageConfig(s.stage);
      return <StatusBadge status={cfg.label} variant={cfg.variant} />;
    }},
    { key: 'updated_at', label: 'Last Updated', render: (s: any) => (
      <span className="text-xs text-muted-foreground">
        {new Date(s.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
      </span>
    )},
    { key: 'actions', label: '', render: (s: any) => (
      <div className="flex gap-1">
        {s.stage === 'applied' && (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleUpdateStage(s.id, 'under_review')}>
            Start Review
          </Button>
        )}
        {s.stage === 'under_review' && (
          <>
            <Button size="sm" className="h-7 text-xs" onClick={() => handleUpdateStage(s.id, 'conditional_offer')}>
              Conditional Offer
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleUpdateStage(s.id, 'unconditional_offer')}>
              Unconditional
            </Button>
          </>
        )}
        {s.stage === 'conditional_offer' && (
          <Button size="sm" className="h-7 text-xs" onClick={() => handleUpdateStage(s.id, 'unconditional_offer')}>
            Convert to Unconditional
          </Button>
        )}
        {s.stage === 'unconditional_offer' && (
          <Button size="sm" className="h-7 text-xs" onClick={() => handleUpdateStage(s.id, 'deposit_paid')}>
            Confirm Deposit
          </Button>
        )}
        {s.stage === 'deposit_paid' && (
          <Button size="sm" className="h-7 text-xs" onClick={() => handleUpdateStage(s.id, 'enrolled')}>
            Confirm Enrolment
          </Button>
        )}
      </div>
    )},
  ];

  return (
    <DashboardLayout
      title="University Partner Portal"
      subtitle="Review students referred by our platform and manage your programme listings"
      actions={<Button size="sm"><FileText className="w-3.5 h-3.5 mr-1.5" />Export Report</Button>}
    >
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Referred to You" value={referredStudents.length} change="Total referrals" icon={Users} />
        <StatCard label="Pending Review" value={pendingReview} change="Awaiting decision" changeType={pendingReview > 0 ? 'negative' : 'positive'} icon={Clock} />
        <StatCard label="Offers Issued" value={offersIssued} change="Active offers" changeType="positive" icon={Award} />
        <StatCard label="Enrolled" value={enrolledCount} change="Confirmed students" changeType="positive" icon={GraduationCap} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="students">Referred Students ({referredStudents.length})</TabsTrigger>
          <TabsTrigger value="programmes">Your Programmes ({unis.length})</TabsTrigger>
          <TabsTrigger value="overview">Partnership Overview</TabsTrigger>
        </TabsList>

        {/* ── Referred Students Tab ── */}
        <TabsContent value="students">
          <DataTable columns={studentColumns} data={referredStudents} />
        </TabsContent>

        {/* ── University Programmes Listed on Our Platform ── */}
        <TabsContent value="programmes">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unis.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-full text-center py-8">No programmes listed yet</p>
            ) : unis.map((u: any) => (
              <Card key={u.id}>
                <CardContent className="pt-5">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{u.flag}</span>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold">{u.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{u.programme}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge variant="outline" className="text-[10px]">{u.country}</Badge>
                        {u.fee && <Badge variant="secondary" className="text-[10px]">{u.fee}</Badge>}
                        {u.ielts && <Badge variant="secondary" className="text-[10px]">IELTS {u.ielts}</Badge>}
                        {u.intake && <Badge variant="secondary" className="text-[10px]">{u.intake}</Badge>}
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <StatusBadge status={u.status === 'active' ? 'Active' : 'Inactive'} variant={u.status === 'active' ? 'success' : 'neutral'} />
                        {u.commission && (
                          <span className="text-[10px] text-muted-foreground">Commission: {u.commission}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Partnership Overview ── */}
        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">1</div>
                  <div>
                    <p className="text-sm font-medium">We Identify Eligible Students</p>
                    <p className="text-xs text-muted-foreground">Students completing Level 4/5 qualifications with us are guided towards top-up degree progression</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</div>
                  <div>
                    <p className="text-sm font-medium">We Refer Students to You</p>
                    <p className="text-xs text-muted-foreground">Qualified students are referred to your institution with complete academic records and transcripts</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">3</div>
                  <div>
                    <p className="text-sm font-medium">You Review & Issue Offers</p>
                    <p className="text-xs text-muted-foreground">Review applications through this portal and issue conditional/unconditional offers directly</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">4</div>
                  <div>
                    <p className="text-sm font-medium">Commission on Enrolment</p>
                    <p className="text-xs text-muted-foreground">Agreed commission is paid to our platform upon confirmed student enrolment at your university</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Referral Pipeline Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: 'Pending Review', count: pendingReview, colour: 'bg-amber-500' },
                    { label: 'Offers Issued', count: offersIssued, colour: 'bg-blue-500' },
                    { label: 'Deposit Paid', count: depositPaid, colour: 'bg-emerald-500' },
                    { label: 'Enrolled', count: enrolledCount, colour: 'bg-primary' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${item.colour}`} />
                      <span className="text-sm flex-1">{item.label}</span>
                      <span className="text-sm font-bold">{item.count}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Conversion Rate</p>
                  <p className="text-2xl font-bold text-primary">
                    {referredStudents.length > 0
                      ? `${Math.round((enrolledCount / referredStudents.length) * 100)}%`
                      : '—'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Referred → Enrolled</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
