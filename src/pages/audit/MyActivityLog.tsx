import DashboardLayout from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Video, LogIn, LogOut, Eye, Clock, Calendar, BookOpen, ClipboardList, FileText } from 'lucide-react';
import { DashboardSkeleton } from '@/components/ui/Skeletons';

interface ActivityEntry {
  id: string;
  type: 'login' | 'logout' | 'live_class' | 'video_view' | 'attendance' | 'submission' | 'grade' | 'assignment' | 'general';
  title: string;
  description: string;
  timestamp: string;
  duration?: number;
  metadata?: Record<string, any>;
}

const ACTIVITY_ICONS: Record<string, typeof Activity> = {
  login: LogIn,
  logout: LogOut,
  live_class: Video,
  video_view: Eye,
  attendance: Calendar,
  submission: ClipboardList,
  grade: BookOpen,
  assignment: FileText,
  general: Activity,
};

const ACTIVITY_COLOURS: Record<string, string> = {
  login: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  logout: 'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400',
  live_class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  video_view: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  attendance: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  submission: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  grade: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  assignment: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
  general: 'bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400',
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export default function MyActivityLog() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [period, setPeriod] = useState<string>('30');

  const isStudent = user?.roles?.includes('student');
  const isLecturer = user?.roles?.includes('lecturer') || user?.roles?.includes('programme_leader');

  useEffect(() => {
    if (user) fetchActivities();
  }, [user, period]);

  const fetchActivities = async () => {
    if (!user) return;
    setLoading(true);
    const allActivities: ActivityEntry[] = [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(period));
    const cutoffStr = cutoff.toISOString();

    // 1. Audit log entries for this user
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', cutoffStr)
      .order('created_at', { ascending: false })
      .limit(200);

    if (auditLogs) {
      for (const log of auditLogs) {
        const details = (log.details || {}) as Record<string, any>;
        allActivities.push({
          id: log.id,
          type: log.action === 'login' ? 'login' : log.action === 'logout' ? 'logout' : 'general',
          title: `${log.action} — ${log.entity_type}`,
          description: details?.description || JSON.stringify(details).slice(0, 120),
          timestamp: log.created_at,
          metadata: details,
        });
      }
    }

    // 2. Live classroom sessions (student or lecturer)
    const { data: sessions } = await supabase
      .from('classroom_sessions')
      .select('*')
      .or(`host_id.eq.${user.id}`)
      .gte('created_at', cutoffStr)
      .order('created_at', { ascending: false })
      .limit(100);

    if (sessions) {
      for (const s of sessions) {
        const duration = s.ended_at
          ? Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000)
          : undefined;
        allActivities.push({
          id: `session-${s.id}`,
          type: 'live_class',
          title: `Live Class: ${s.display_name}`,
          description: `Room: ${s.room_name} · ${s.participant_count} participants · Status: ${s.status}`,
          timestamp: s.started_at,
          duration,
        });
      }
    }

    // 3. Video / resource view logs (students)
    if (isStudent) {
      const { data: viewLogs } = await supabase
        .from('resource_view_logs' as any)
        .select('*')
        .eq('student_id', user.id)
        .gte('created_at', cutoffStr)
        .order('created_at', { ascending: false })
        .limit(200);

      if (viewLogs) {
        for (const v of viewLogs as any[]) {
          allActivities.push({
            id: `view-${v.id}`,
            type: 'video_view',
            title: `Viewed: ${v.resource_title || 'Resource'}`,
            description: v.completed ? 'Completed viewing' : 'Partial viewing',
            timestamp: v.created_at,
            duration: v.duration_seconds || 0,
          });
        }
      }

      // 4. Attendance records (students)
      const { data: attendance } = await supabase
        .from('attendance_records')
        .select('*, modules(title)')
        .eq('student_id', user.id)
        .gte('created_at', cutoffStr)
        .order('created_at', { ascending: false })
        .limit(200);

      if (attendance) {
        for (const a of attendance) {
          const mod = (a as any).modules;
          allActivities.push({
            id: `att-${a.id}`,
            type: 'attendance',
            title: `Attendance: ${mod?.title || 'Session'}`,
            description: `Status: ${a.status} · Method: ${a.method || 'manual'}`,
            timestamp: a.created_at,
          });
        }
      }

      // 5. Submissions (students)
      const { data: submissions } = await supabase
        .from('submissions')
        .select('*, assignments(title)')
        .eq('student_id', user.id)
        .gte('created_at', cutoffStr)
        .order('created_at', { ascending: false })
        .limit(100);

      if (submissions) {
        for (const s of submissions) {
          const assignmentTitle = (s as any).assignments?.title || 'Assignment';
          allActivities.push({
            id: `sub-${s.id}`,
            type: 'submission',
            title: `Submitted: ${assignmentTitle}`,
            description: s.grade ? `Graded: ${s.grade}%` : `Status: ${s.status}`,
            timestamp: s.submitted_at || s.created_at,
          });
        }
      }
    }

    // 6. Lecturer-specific: marking, attendance taken
    if (isLecturer) {
      const { data: graded } = await supabase
        .from('submissions')
        .select('*')
        .eq('graded_by', user.id)
        .gte('created_at', cutoffStr)
        .order('graded_at', { ascending: false })
        .limit(100);

      if (graded) {
        for (const g of graded) {
          allActivities.push({
            id: `grade-${g.id}`,
            type: 'grade',
            title: `Graded: ${g.title}`,
            description: `Score: ${g.grade}% · Student submission`,
            timestamp: g.graded_at || g.created_at,
          });
        }
      }
    }

    // Sort all by timestamp descending
    allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setActivities(allActivities);
    setLoading(false);
  };

  const filtered = activities.filter(a => filter === 'all' || a.type === filter);

  const activityTypes = [...new Set(activities.map(a => a.type))];

  // Stats
  const totalClasses = activities.filter(a => a.type === 'live_class').length;
  const totalVideoTime = activities
    .filter(a => a.type === 'video_view')
    .reduce((sum, a) => sum + (a.duration || 0), 0);
  const totalLogins = activities.filter(a => a.type === 'login').length;
  const attendanceCount = activities.filter(a => a.type === 'attendance').length;

  if (loading) return <DashboardLayout title="My Activity"><DashboardSkeleton /></DashboardLayout>;

  return (
    <DashboardLayout title="My Activity">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Activity Log</h1>
          <p className="text-muted-foreground">Your personal activity trail across the platform</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <LogIn className="h-4 w-4 text-emerald-600" />
                <span className="text-xs text-muted-foreground">Logins</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totalLogins}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-muted-foreground">Live Classes</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totalClasses}</p>
            </CardContent>
          </Card>
          {isStudent && (
            <>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-purple-600" />
                    <span className="text-xs text-muted-foreground">Video Time</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{formatDuration(totalVideoTime)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-amber-600" />
                    <span className="text-xs text-muted-foreground">Attendance</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{attendanceCount}</p>
                </CardContent>
              </Card>
            </>
          )}
          {!isStudent && (
            <>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs text-muted-foreground">Actions</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{activities.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-rose-600" />
                    <span className="text-xs text-muted-foreground">Period</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{period}d</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Activity type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              {activityTypes.map(t => (
                <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Activity Timeline */}
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-1">
              {filtered.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No activities found for this period</p>
              ) : filtered.map(entry => {
                const Icon = ACTIVITY_ICONS[entry.type] || Activity;
                const colour = ACTIVITY_COLOURS[entry.type] || ACTIVITY_COLOURS.general;
                return (
                  <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border-b last:border-0">
                    <div className="p-1.5 rounded bg-muted"><Icon className="h-4 w-4 text-muted-foreground" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{entry.title}</span>
                        <Badge className={`text-[10px] ${colour}`}>{entry.type.replace(/_/g, ' ')}</Badge>
                        {entry.duration !== undefined && entry.duration > 0 && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {formatDuration(entry.duration)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.description}</p>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(entry.timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
