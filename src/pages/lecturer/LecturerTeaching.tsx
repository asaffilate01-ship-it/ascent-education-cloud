import DashboardLayout from '@/components/layout/DashboardLayout';
import { BookOpen, Users, Calendar, Clock, ChevronRight, Upload, Zap, AlertTriangle, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useScheduledLectures, DAY_NAMES, TIME_SLOTS, type LectureWithModule } from '@/hooks/useScheduledLectures';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const MODULE_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];

export default function LecturerTeaching() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [autoScheduling, setAutoScheduling] = useState(false);

  const { data: modules, loading: mLoading } = useSupabaseQuery('modules', {
    orderBy: { column: 'title', ascending: true },
  });
  const { data: programmes } = useSupabaseQuery('programmes');
  const { data: assignments } = useSupabaseQuery('assignments');
  const { data: submissions } = useSupabaseQuery('submissions');

  const { myLectures, timetable, conflicts, loading: sLoading, autoSchedule } = useScheduledLectures();

  const loading = mLoading || sLoading;

  const myModules = useMemo(() => {
    const assigned = modules.filter(m => m.lecturer_id === user?.id);
    return assigned.length > 0 ? assigned : modules.slice(0, 6);
  }, [modules, user]);

  const progMap = useMemo(() => {
    const map: Record<string, string> = {};
    (programmes || []).forEach(p => { map[p.id] = p.title; });
    return map;
  }, [programmes]);

  const moduleStats = useMemo(() => {
    const stats: Record<string, { assignmentCount: number; submissionCount: number }> = {};
    (assignments || []).forEach(a => {
      if (a.module_id) {
        if (!stats[a.module_id]) stats[a.module_id] = { assignmentCount: 0, submissionCount: 0 };
        stats[a.module_id].assignmentCount++;
      }
    });
    (submissions || []).forEach(s => {
      const asn = (assignments || []).find(a => a.id === s.assignment_id);
      if (asn?.module_id && stats[asn.module_id]) {
        stats[asn.module_id].submissionCount++;
      }
    });
    return stats;
  }, [assignments, submissions]);

  // Count scheduled hours per module
  const moduleHours = useMemo(() => {
    const map: Record<string, number> = {};
    myLectures.forEach(l => {
      map[l.module_id] = (map[l.module_id] || 0) + 1.5;
    });
    return map;
  }, [myLectures]);

  // Lectures grouped by module for color mapping
  const moduleColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    myModules.forEach((m, i) => { map[m.id] = MODULE_COLORS[i % MODULE_COLORS.length]; });
    return map;
  }, [myModules]);

  const handleAutoScheduleAll = async () => {
    if (!user) return;
    setAutoScheduling(true);
    const unscheduled = myModules.filter(m => !moduleHours[m.id] || moduleHours[m.id] < 12);
    if (unscheduled.length === 0) {
      toast.info('All modules already have 12 hours/week scheduled');
      setAutoScheduling(false);
      return;
    }
    for (const mod of unscheduled) {
      await autoSchedule(mod.id, user.id, mod.tenant_id, moduleColorMap[mod.id]);
    }
    setAutoScheduling(false);
  };

  // Current PKT time info
  const nowPKT = useMemo(() => {
    const now = new Date();
    const pkt = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
    return { day: pkt.getDay(), hours: pkt.getHours(), minutes: pkt.getMinutes() };
  }, []);

  // Next upcoming lecture
  const nextLecture = useMemo(() => {
    const pktDay = nowPKT.day; // 0=Sun, 1=Mon
    const pktMinutes = nowPKT.hours * 60 + nowPKT.minutes;

    for (let offset = 0; offset < 7; offset++) {
      const checkDay = ((pktDay - 1 + offset) % 7) + 1; // Convert to 1=Mon
      if (checkDay > 5) continue; // Skip weekends

      const dayLectures = myLectures.filter(l => l.day_of_week === checkDay);
      for (const l of dayLectures.sort((a, b) => a.start_time.localeCompare(b.start_time))) {
        const [h, m] = l.start_time.split(':').map(Number);
        const lectureMin = h * 60 + m;
        if (offset === 0 && lectureMin <= pktMinutes) continue;
        return { ...l, daysAway: offset };
      }
    }
    return null;
  }, [myLectures, nowPKT]);

  if (loading) return <DashboardSkeleton />;

  return (
    <DashboardLayout
      title="Teaching"
      subtitle="Your modules, timetable, and live schedule (PKT)"
      actions={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleAutoScheduleAll} disabled={autoScheduling}>
            <Zap className="w-3.5 h-3.5 mr-1.5" />{autoScheduling ? 'Scheduling…' : 'Auto-Schedule All'}
          </Button>
          <Button size="sm"><Upload className="w-3.5 h-3.5 mr-1.5" />Upload Material</Button>
        </div>
      }
    >
      {/* Conflicts Warning */}
      {conflicts.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">{conflicts.length} scheduling conflict(s) detected</p>
            <p className="text-xs text-muted-foreground">Multiple lectures overlap in the same time slot. Please resolve these.</p>
          </div>
        </div>
      )}

      {/* Next Up Card */}
      {nextLecture && (
        <div className="surface-card p-4 mb-4 border-l-4" style={{ borderLeftColor: nextLecture.color }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Next Lecture</p>
              <h4 className="text-sm font-semibold">{nextLecture.module_title}</h4>
              <p className="text-xs text-muted-foreground">
                {DAY_NAMES[nextLecture.day_of_week - 1]} · {nextLecture.start_time.slice(0, 5)}–{nextLecture.end_time.slice(0, 5)} PKT · {nextLecture.room}
                {nextLecture.daysAway === 0 && ' · Today'}
                {nextLecture.daysAway === 1 && ' · Tomorrow'}
                {nextLecture.daysAway! > 1 && ` · In ${nextLecture.daysAway} days`}
              </p>
            </div>
            <Button size="sm" onClick={() => navigate('/lecturer/classroom')}>
              <Video className="w-3.5 h-3.5 mr-1.5" />Start Class
            </Button>
          </div>
        </div>
      )}

      {/* Modules Grid */}
      <h3 className="text-base font-semibold mb-3">My Modules ({myModules.length})</h3>
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {myModules.map((mod) => {
          const stats = moduleStats[mod.id];
          const hours = moduleHours[mod.id] || 0;
          const color = moduleColorMap[mod.id];
          return (
            <div key={mod.id} className="surface-card p-5 hover:shadow-lg transition-default cursor-pointer group border-t-2" style={{ borderTopColor: color }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {mod.status}
                </span>
                <span className="text-[10px] text-muted-foreground">{mod.code || ''}</span>
              </div>
              <h4 className="text-sm font-semibold group-hover:text-primary transition-default">{mod.title}</h4>
              <p className="text-[10px] text-muted-foreground mt-1">{progMap[mod.programme_id] || ''}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {mod.credits || 0} cr</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {hours}/12 hrs</span>
                {stats && <span>📝 {stats.assignmentCount} tasks</span>}
              </div>
              {hours < 12 && (
                <Badge variant="secondary" className="mt-2 text-[10px] bg-amber-500/10 text-amber-600">
                  Needs scheduling ({12 - hours}h remaining)
                </Badge>
              )}
              <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between">
                <span className="text-xs text-primary font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" /> View module
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
          );
        })}
        {myModules.length === 0 && (
          <div className="surface-card p-12 text-center text-muted-foreground text-sm col-span-3">No modules assigned yet</div>
        )}
      </div>

      {/* Weekly Timetable - Live from DB */}
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" /> Weekly Timetable (PKT)
      </h3>
      <div className="surface-card overflow-hidden mb-6">
        {/* Time slot headers */}
        <div className="hidden md:flex border-b border-border/50">
          <div className="w-28 shrink-0 p-2 bg-secondary/30" />
          {TIME_SLOTS.map(slot => (
            <div key={slot.start} className="flex-1 text-center p-1.5 border-l border-border/30 bg-secondary/20">
              <span className="text-[10px] font-semibold">{slot.label}</span>
            </div>
          ))}
        </div>

        {timetable.map(({ day, dayIndex, lectures: dayLectures }) => (
          <div key={day} className="border-b border-border/50 last:border-0">
            {/* Desktop grid view */}
            <div className="hidden md:flex">
              <div className="w-28 shrink-0 p-3 bg-secondary/50 flex items-center">
                <span className="text-xs font-semibold">{day}</span>
              </div>
              {TIME_SLOTS.map(slot => {
                const lecture = dayLectures.find(l => l.start_time.slice(0, 5) === slot.start);
                return (
                  <div key={slot.start} className="flex-1 border-l border-border/30 p-1 min-h-[56px] relative">
                    {lecture ? (
                      <div
                        className="rounded p-1.5 text-primary-foreground text-[10px] h-full flex flex-col justify-between cursor-pointer hover:opacity-90 transition-default"
                        style={{ backgroundColor: lecture.color || '#3b82f6' }}
                        title={`${lecture.module_title}\n${lecture.room}\n${lecture.start_time}–${lecture.end_time}`}
                      >
                        <span className="font-semibold truncate">{lecture.module_title}</span>
                        <span className="opacity-80">{lecture.room}</span>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground/40">Free</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile list view */}
            <div className="md:hidden">
              <div className="p-2 bg-secondary/50">
                <span className="text-xs font-semibold">{day}</span>
              </div>
              {dayLectures.length > 0 ? dayLectures.map(l => (
                <div key={l.id} className="flex items-center gap-3 p-2 border-t border-border/30">
                  <div className="w-2 h-8 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{l.module_title}</p>
                    <p className="text-[10px] text-muted-foreground">{l.start_time.slice(0, 5)}–{l.end_time.slice(0, 5)} · {l.room}</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => navigate('/lecturer/classroom')}>
                    Start
                  </Button>
                </div>
              )) : (
                <div className="p-3 text-center text-[10px] text-muted-foreground">No lectures</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Weekly Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="surface-card p-3 text-center">
          <p className="text-2xl font-bold text-primary">{myLectures.length}</p>
          <p className="text-[10px] text-muted-foreground">Lectures/Week</p>
        </div>
        <div className="surface-card p-3 text-center">
          <p className="text-2xl font-bold text-primary">{(myLectures.length * 1.5).toFixed(1)}h</p>
          <p className="text-[10px] text-muted-foreground">Teaching Hours</p>
        </div>
        <div className="surface-card p-3 text-center">
          <p className="text-2xl font-bold text-primary">{new Set(myLectures.map(l => l.module_id)).size}</p>
          <p className="text-[10px] text-muted-foreground">Active Modules</p>
        </div>
        <div className="surface-card p-3 text-center">
          <p className="text-2xl font-bold" style={{ color: conflicts.length > 0 ? 'var(--destructive)' : 'var(--primary)' }}>
            {conflicts.length}
          </p>
          <p className="text-[10px] text-muted-foreground">Conflicts</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
