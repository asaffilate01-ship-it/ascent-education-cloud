import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatCard from '@/components/ui/StatCard';
import {
  Mail, Send, Users, Calendar, Plus, Loader2, Clock,
  BarChart3, CheckCircle2, XCircle, MessageSquare, Sparkles, Brain
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import EmptyState from '@/components/ui/EmptyState';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: 'draft' | 'scheduled' | 'sent' | 'active';
  audience: string;
  sentCount: number;
  openRate: number;
  clickRate: number;
  scheduledAt?: string;
  createdAt: string;
}

// Demo campaigns (will be replaced with DB data when email infra is set up)
const DEMO_CAMPAIGNS: Campaign[] = [
  { id: '1', name: 'Welcome Series - New Students', subject: 'Welcome to UniPathway! Here\'s what to expect', status: 'active', audience: 'New Students', sentCount: 245, openRate: 68, clickRate: 24, createdAt: '2026-03-01' },
  { id: '2', name: 'Fee Reminder - Instalment Due', subject: 'Your instalment payment is due in 3 days', status: 'scheduled', audience: 'Students with pending fees', sentCount: 0, openRate: 0, clickRate: 0, scheduledAt: '2026-03-20', createdAt: '2026-03-15' },
  { id: '3', name: 'Re-Engagement - Inactive Students', subject: 'We miss you! Your course progress is waiting', status: 'draft', audience: 'Students inactive > 14 days', sentCount: 0, openRate: 0, clickRate: 0, createdAt: '2026-03-10' },
  { id: '4', name: 'Intake Announcement - Sept 2026', subject: 'New intake now open - Level 4 & 5 programmes', status: 'sent', audience: 'All leads', sentCount: 1240, openRate: 42, clickRate: 12, createdAt: '2026-02-15' },
];

export default function EmailCampaigns() {
  const [campaigns] = useState<Campaign[]>(DEMO_CAMPAIGNS);
  const [tab, setTab] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newAudience, setNewAudience] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');

  const filtered = useMemo(() => {
    if (tab === 'all') return campaigns;
    return campaigns.filter(c => c.status === tab);
  }, [campaigns, tab]);

  const totalSent = campaigns.reduce((s, c) => s + c.sentCount, 0);
  const avgOpen = campaigns.filter(c => c.sentCount > 0).reduce((s, c) => s + c.openRate, 0) / Math.max(1, campaigns.filter(c => c.sentCount > 0).length);

  const generateEmailContent = async () => {
    if (!newSubject.trim()) { toast.error('Enter a subject first'); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-course-builder', {
        body: {
          action: 'lesson_plan', // Reuse the edge function
          moduleName: newSubject,
          topics: `Generate a professional marketing email for a UK higher education college. Subject: ${newSubject}. Audience: ${newAudience || 'All students'}. Keep it concise, engaging, and include a clear CTA.`,
          learningOutcomes: 'N/A',
        },
      });
      if (data?.result) {
        setGeneratedContent(typeof data.result === 'string' ? data.result : JSON.stringify(data.result, null, 2));
      }
    } catch {
      toast.error('AI generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <DashboardLayout
      title="Email Campaigns"
      subtitle="Automated drip sequences, enrolment reminders & re-engagement"
      actions={
        <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> New Campaign
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Campaigns" value={String(campaigns.length)} icon={Mail} />
        <StatCard label="Emails Sent" value={totalSent.toLocaleString()} icon={Send} />
        <StatCard label="Avg Open Rate" value={`${Math.round(avgOpen)}%`} icon={BarChart3} change="Industry avg: 35%" changeType="positive" />
        <StatCard label="Active Sequences" value={String(campaigns.filter(c => c.status === 'active').length)} icon={Clock} />
      </div>

      {showCreate && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Create Campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Campaign Name</label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Welcome Series" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Audience</label>
                <Select value={newAudience} onValueChange={setNewAudience}>
                  <SelectTrigger><SelectValue placeholder="Select audience" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_students">All Students</SelectItem>
                    <SelectItem value="new_students">New Students</SelectItem>
                    <SelectItem value="leads">All Leads</SelectItem>
                    <SelectItem value="inactive">Inactive Students</SelectItem>
                    <SelectItem value="fee_pending">Students with Pending Fees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject Line</label>
              <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="e.g. Welcome to UniPathway!" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={generateEmailContent} disabled={generating} className="gap-1.5 text-xs">
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                AI Generate Content
              </Button>
              <Button size="sm" onClick={() => { toast.success('Campaign saved as draft'); setShowCreate(false); }} className="text-xs">
                Save Draft
              </Button>
            </div>
            {generatedContent && (
              <div className="p-3 rounded-lg bg-accent/50 border border-border text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                {generatedContent}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
          <TabsTrigger value="scheduled" className="text-xs">Scheduled</TabsTrigger>
          <TabsTrigger value="draft" className="text-xs">Drafts</TabsTrigger>
          <TabsTrigger value="sent" className="text-xs">Sent</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {filtered.length === 0 ? (
            <EmptyState icon={Mail} title="No campaigns yet" description="Create your first email campaign" />
          ) : (
            <div className="space-y-3">
              {filtered.map(c => (
                <Card key={c.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      c.status === 'active' ? 'bg-green-500/10' : c.status === 'sent' ? 'bg-primary/10' : c.status === 'scheduled' ? 'bg-blue-500/10' : 'bg-muted'
                    }`}>
                      {c.status === 'active' ? <Send className="w-5 h-5 text-green-600" /> :
                       c.status === 'sent' ? <CheckCircle2 className="w-5 h-5 text-primary" /> :
                       c.status === 'scheduled' ? <Clock className="w-5 h-5 text-blue-600" /> :
                       <Mail className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.subject}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {c.audience} · {c.scheduledAt ? `Scheduled: ${new Date(c.scheduledAt).toLocaleDateString()}` : new Date(c.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {c.sentCount > 0 && (
                      <div className="hidden sm:flex gap-4 text-center">
                        <div>
                          <p className="text-xs font-bold">{c.sentCount}</p>
                          <p className="text-[10px] text-muted-foreground">Sent</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-green-600">{c.openRate}%</p>
                          <p className="text-[10px] text-muted-foreground">Opens</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-primary">{c.clickRate}%</p>
                          <p className="text-[10px] text-muted-foreground">Clicks</p>
                        </div>
                      </div>
                    )}
                    <Button size="sm" variant="ghost" className="text-xs h-8">
                      {c.status === 'draft' ? 'Edit' : 'View'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
