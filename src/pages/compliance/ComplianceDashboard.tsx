import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Download, Shield, FileCheck, AlertTriangle, CheckCircle2, Clock, Upload, BookOpen, Users, Building, FileText, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChecklistItem {
  id: string;
  awarding_body: string;
  category: string;
  item_title: string;
  item_description: string | null;
  is_completed: boolean;
  evidence_url: string | null;
  evidence_notes: string | null;
  due_date: string | null;
  priority: string;
  completed_at: string | null;
}

const AWARDING_BODIES = ['OTHM', 'QUALIFI', 'IAB'];

const CATEGORIES = [
  { key: 'centre_approval', label: 'Centre Approval', icon: Building },
  { key: 'ongoing_quality', label: 'Ongoing Quality', icon: Shield },
  { key: 'assessment', label: 'Assessment', icon: FileCheck },
  { key: 'iqa', label: 'Internal Quality Assurance', icon: CheckCircle2 },
  { key: 'eqa', label: 'External Quality Assurance', icon: Users },
  { key: 'safeguarding', label: 'Safeguarding', icon: Shield },
  { key: 'policies', label: 'Policies & Procedures', icon: FileText },
];

const PRIORITY_COLOURS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-blue-100 text-blue-800',
};

// Default compliance requirements per awarding body
const DEFAULT_ITEMS: Record<string, { category: string; title: string; description: string; priority: string }[]> = {
  OTHM: [
    { category: 'centre_approval', title: 'Centre Recognition Application', description: 'Submit completed OTHM centre recognition form with all supporting documents', priority: 'critical' },
    { category: 'centre_approval', title: 'Premises Inspection Report', description: 'Provide evidence of suitable premises including health & safety certificates', priority: 'critical' },
    { category: 'centre_approval', title: 'Staff CVs & Qualifications', description: 'CVs for all teaching and assessment staff with verified qualifications', priority: 'high' },
    { category: 'centre_approval', title: 'Resource Audit', description: 'Evidence of adequate learning resources, IT facilities, and library access', priority: 'high' },
    { category: 'ongoing_quality', title: 'Annual Monitoring Report', description: 'Submit OTHM annual monitoring report by deadline', priority: 'high' },
    { category: 'ongoing_quality', title: 'Student Feedback Analysis', description: 'Collate and analyse student satisfaction surveys each semester', priority: 'medium' },
    { category: 'assessment', title: 'Assessment Strategy Document', description: 'Documented assessment strategy aligned to OTHM unit specifications', priority: 'critical' },
    { category: 'assessment', title: 'Assignment Briefs (IV Signed)', description: 'All assignment briefs internally verified before distribution', priority: 'high' },
    { category: 'assessment', title: 'Grading Criteria Published', description: 'Clear grading criteria shared with students at the start of each unit', priority: 'medium' },
    { category: 'iqa', title: 'IQA Strategy & Schedule', description: 'Documented IQA strategy with sampling plan for all assessors', priority: 'critical' },
    { category: 'iqa', title: 'IQA Observation Records', description: 'Records of assessor observations with development actions', priority: 'high' },
    { category: 'iqa', title: 'Standardisation Meeting Minutes', description: 'Minutes from standardisation meetings held at least once per semester', priority: 'medium' },
    { category: 'eqa', title: 'EQA Visit Preparation Pack', description: 'Prepare documentation pack for OTHM External Quality Assurance visits', priority: 'critical' },
    { category: 'eqa', title: 'Previous EQA Action Plan', description: 'Evidence of completion of actions from last EQA visit', priority: 'high' },
    { category: 'safeguarding', title: 'Safeguarding Policy', description: 'Up-to-date safeguarding and prevent duty policy', priority: 'critical' },
    { category: 'safeguarding', title: 'DBS/Background Checks', description: 'All staff DBS checked (or local equivalent) and recorded', priority: 'critical' },
    { category: 'safeguarding', title: 'Safeguarding Training Records', description: 'Evidence all staff completed safeguarding training annually', priority: 'high' },
    { category: 'policies', title: 'Academic Misconduct Policy', description: 'Policy covering plagiarism, collusion, and exam malpractice', priority: 'high' },
    { category: 'policies', title: 'Appeals & Complaints Policy', description: 'Documented student appeals and complaints procedure', priority: 'high' },
    { category: 'policies', title: 'Data Protection Policy', description: 'GDPR-compliant data protection and privacy policy', priority: 'medium' },
    { category: 'policies', title: 'Equality & Diversity Policy', description: 'Evidence of equality, diversity, and inclusion commitment', priority: 'medium' },
  ],
  QUALIFI: [
    { category: 'centre_approval', title: 'QUALIFI Centre Approval Application', description: 'Complete centre approval form with business plan and financial forecasts', priority: 'critical' },
    { category: 'centre_approval', title: 'Management Structure Chart', description: 'Organisational chart showing quality assurance reporting lines', priority: 'high' },
    { category: 'centre_approval', title: 'Premises & Facilities Evidence', description: 'Photos and documentation of learning environments and facilities', priority: 'high' },
    { category: 'ongoing_quality', title: 'Centre Performance Review', description: 'Annual self-assessment and quality improvement plan', priority: 'high' },
    { category: 'ongoing_quality', title: 'Learner Achievement Data', description: 'Track and report achievement, retention, and pass rates', priority: 'high' },
    { category: 'assessment', title: 'Assessment Plan per Programme', description: 'Comprehensive assessment plan for each QUALIFI programme', priority: 'critical' },
    { category: 'assessment', title: 'Internal Verification of Assignments', description: 'IV records for all assignments before learner distribution', priority: 'high' },
    { category: 'iqa', title: 'Lead IQA Appointment', description: 'Named Lead IQA with relevant qualifications and experience', priority: 'critical' },
    { category: 'iqa', title: 'IQA Sampling Records', description: 'Evidence of systematic sampling across assessors, units, and learners', priority: 'high' },
    { category: 'eqa', title: 'EQA Readiness Checklist', description: 'Pre-visit checklist completed before QUALIFI EQA visits', priority: 'high' },
    { category: 'safeguarding', title: 'Prevent Duty Statement', description: 'Statement on compliance with prevent duty requirements', priority: 'critical' },
    { category: 'safeguarding', title: 'Student Welfare Procedures', description: 'Documented procedures for student welfare and support', priority: 'high' },
    { category: 'policies', title: 'RPL/APEL Policy', description: 'Recognition of Prior Learning policy and procedures', priority: 'medium' },
    { category: 'policies', title: 'Reasonable Adjustments Policy', description: 'Policy for special considerations and reasonable adjustments', priority: 'medium' },
  ],
  IAB: [
    { category: 'centre_approval', title: 'IAB Centre Registration', description: 'Complete IAB centre registration with evidence of accounting expertise', priority: 'critical' },
    { category: 'centre_approval', title: 'Assessor Qualifications', description: 'Evidence assessors hold relevant accounting qualifications', priority: 'critical' },
    { category: 'ongoing_quality', title: 'IAB Annual Return', description: 'Submit annual return with learner data and centre updates', priority: 'high' },
    { category: 'assessment', title: 'IAB Exam Administration', description: 'Procedures for secure exam paper handling and administration', priority: 'critical' },
    { category: 'assessment', title: 'Coursework Moderation', description: 'Evidence of internal moderation for coursework components', priority: 'high' },
    { category: 'iqa', title: 'Quality Assurance Coordinator', description: 'Named QA coordinator for IAB programmes', priority: 'high' },
    { category: 'safeguarding', title: 'Health & Safety Risk Assessment', description: 'Current risk assessment for all learning and exam spaces', priority: 'high' },
    { category: 'policies', title: 'Malpractice & Maladministration Policy', description: 'Policy aligned to IAB requirements for exam integrity', priority: 'critical' },
  ],
};

export default function ComplianceDashboard() {
  const { user, role } = useAuth();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBody, setActiveBody] = useState('OTHM');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data } = await supabase
      .from('compliance_checklists')
      .select('*')
      .order('priority', { ascending: true });
    setItems((data || []) as ChecklistItem[]);
    setLoading(false);
  };

  const toggleItem = async (item: ChecklistItem) => {
    const { error } = await supabase
      .from('compliance_checklists')
      .update({
        is_completed: !item.is_completed,
        completed_by: !item.is_completed ? user?.id : null,
        completed_at: !item.is_completed ? new Date().toISOString() : null,
      })
      .eq('id', item.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(item.is_completed ? 'Marked as incomplete' : 'Marked as complete');
      fetchItems();
    }
  };

  const bodyItems = items.filter(i => i.awarding_body === activeBody);
  const completedCount = bodyItems.filter(i => i.is_completed).length;
  const totalCount = bodyItems.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Group by category
  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: bodyItems.filter(i => i.category === cat.key),
  })).filter(g => g.items.length > 0);

  // If no items in DB, show defaults
  const defaultItems = DEFAULT_ITEMS[activeBody] || [];
  const showDefaults = bodyItems.length === 0 && !loading;

  const handleExportPack = () => {
    const data = showDefaults
      ? defaultItems.map(d => ({ ...d, awarding_body: activeBody, status: 'Not Started' }))
      : bodyItems.map(i => ({ ...i, status: i.is_completed ? 'Complete' : 'Pending' }));

    const csv = [
      'Awarding Body,Category,Item,Description,Priority,Status,Evidence Notes',
      ...data.map((d: any) =>
        `"${activeBody}","${d.category}","${d.item_title || d.title}","${d.item_description || d.description || ''}","${d.priority}","${d.status}","${d.evidence_notes || ''}"`
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeBody}-compliance-pack-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success(`${activeBody} compliance pack exported`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Compliance & Awarding Body Packs</h1>
            <p className="text-muted-foreground">Centre approval, ongoing quality, and audit requirements</p>
          </div>
          <Button onClick={handleExportPack} className="gap-2">
            <Download className="h-4 w-4" />Export {activeBody} Pack
          </Button>
        </div>

        {/* Awarding Body Tabs */}
        <Tabs value={activeBody} onValueChange={setActiveBody}>
          <TabsList className="grid grid-cols-3 w-full max-w-sm">
            {AWARDING_BODIES.map(ab => (
              <TabsTrigger key={ab} value={ab}>{ab}</TabsTrigger>
            ))}
          </TabsList>

          {AWARDING_BODIES.map(ab => (
            <TabsContent key={ab} value={ab} className="space-y-4">
              {/* Progress */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{ab} Compliance Progress</span>
                    <span className="text-sm text-muted-foreground">{showDefaults ? '0' : completedCount}/{showDefaults ? defaultItems.length : totalCount}</span>
                  </div>
                  <Progress value={showDefaults ? 0 : progress} className="h-3" />
                </CardContent>
              </Card>

              {/* Checklist Items */}
              {showDefaults ? (
                CATEGORIES.map(cat => {
                  const catItems = defaultItems.filter(d => d.category === cat.key);
                  if (catItems.length === 0) return null;
                  const Icon = cat.icon;
                  return (
                    <Card key={cat.key}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary" />{cat.label}
                          <Badge variant="outline" className="ml-auto">{catItems.length} items</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {catItems.map((d, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                            <div className="mt-0.5"><Clock className="h-4 w-4 text-muted-foreground" /></div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{d.title}</span>
                                <Badge className={`text-[10px] ${PRIORITY_COLOURS[d.priority]}`}>{d.priority}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                grouped.map(group => {
                  const Icon = group.icon;
                  const catCompleted = group.items.filter(i => i.is_completed).length;
                  return (
                    <Card key={group.key}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary" />{group.label}
                          <Badge variant="outline" className="ml-auto">{catCompleted}/{group.items.length}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {group.items.map(item => (
                          <div key={item.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${item.is_completed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-background'}`}>
                            <Checkbox
                              checked={item.is_completed}
                              onCheckedChange={() => toggleItem(item)}
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium text-sm ${item.is_completed ? 'line-through text-muted-foreground' : ''}`}>{item.item_title}</span>
                                <Badge className={`text-[10px] ${PRIORITY_COLOURS[item.priority]}`}>{item.priority}</Badge>
                              </div>
                              {item.item_description && <p className="text-xs text-muted-foreground mt-0.5">{item.item_description}</p>}
                              {item.evidence_notes && <p className="text-xs text-emerald-600 mt-1">📎 {item.evidence_notes}</p>}
                            </div>
                            {item.completed_at && (
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {new Date(item.completed_at).toLocaleDateString('en-GB')}
                              </span>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
