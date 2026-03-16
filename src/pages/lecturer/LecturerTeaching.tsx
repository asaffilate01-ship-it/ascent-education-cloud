import DashboardLayout from '@/components/layout/DashboardLayout';
import { BookOpen, Users, Calendar, Clock, ChevronRight, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function LecturerTeaching() {
  const { user } = useAuth();

  const { data: modules, loading: mLoading } = useSupabaseQuery('modules', {
    orderBy: { column: 'title', ascending: true },
  });
  const { data: programmes } = useSupabaseQuery('programmes');
  const { data: assignments, loading: aLoading } = useSupabaseQuery('assignments');
  const { data: submissions } = useSupabaseQuery('submissions');

  const loading = mLoading || aLoading;

  // Filter modules assigned to this lecturer (or show all if none assigned)
  const myModules = useMemo(() => {
    const assigned = modules.filter(m => m.lecturer_id === user?.id);
    return assigned.length > 0 ? assigned : modules.slice(0, 6);
  }, [modules, user]);

  const progMap = useMemo(() => {
    const map: Record<string, string> = {};
    (programmes || []).forEach(p => { map[p.id] = p.title; });
    return map;
  }, [programmes]);

  // Build timetable from modules — generate schedule per module
  const weeklySchedule = useMemo(() => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const schedule: { day: string; classes: { time: string; module: string; room: string; credits: number }[] }[] = [];

    myModules.forEach((mod, i) => {
      const dayIndex = i % days.length;
      const hour = 9 + (Math.floor(i / days.length) * 3);
      const timeStr = `${String(hour).padStart(2, '0')}:00-${String(hour + 1).padStart(2, '0')}:30`;

      let dayEntry = schedule.find(d => d.day === days[dayIndex]);
      if (!dayEntry) {
        dayEntry = { day: days[dayIndex], classes: [] };
        schedule.push(dayEntry);
      }
      dayEntry.classes.push({
        time: timeStr,
        module: mod.title,
        room: `Virtual ${String.fromCharCode(65 + (i % 5))}`,
        credits: mod.credits || 0,
      });
    });

    // Sort by day order
    return days.map(d => schedule.find(s => s.day === d)).filter(Boolean) as typeof schedule;
  }, [myModules]);

  // Stats per module
  const moduleStats = useMemo(() => {
    const stats: Record<string, { assignmentCount: number; submissionCount: number }> = {};
    (assignments || []).forEach(a => {
      if (a.module_id) {
        if (!stats[a.module_id]) stats[a.module_id] = { assignmentCount: 0, submissionCount: 0 };
        stats[a.module_id].assignmentCount++;
      }
    });
    (submissions || []).forEach(s => {
      // Find which module this submission's assignment belongs to
      const asn = (assignments || []).find(a => a.id === s.assignment_id);
      if (asn?.module_id && stats[asn.module_id]) {
        stats[asn.module_id].submissionCount++;
      }
    });
    return stats;
  }, [assignments, submissions]);

  if (loading) return <DashboardSkeleton />;

  return (
    <DashboardLayout
      title="Teaching"
      subtitle="Your modules, timetable, and resources"
      actions={<Button size="sm"><Upload className="w-3.5 h-3.5 mr-1.5" />Upload Material</Button>}
    >
      <h3 className="text-base font-semibold mb-3">My Modules ({myModules.length})</h3>
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {myModules.map((mod) => {
          const stats = moduleStats[mod.id];
          return (
            <div key={mod.id} className="surface-card p-5 hover:shadow-lg transition-default cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {mod.status}
                </span>
                <span className="text-[10px] text-muted-foreground">{mod.code || ''}</span>
              </div>
              <h4 className="text-sm font-semibold group-hover:text-primary transition-default">{mod.title}</h4>
              <p className="text-[10px] text-muted-foreground mt-1">{progMap[mod.programme_id] || ''}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {mod.credits || 0} credits</span>
                {stats && (
                  <span className="flex items-center gap-1">📝 {stats.assignmentCount} assignments</span>
                )}
              </div>
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

      {/* Weekly Timetable from live modules */}
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" /> Weekly Timetable
      </h3>
      <div className="surface-card overflow-hidden">
        {weeklySchedule.length > 0 ? weeklySchedule.map((day) => (
          <div key={day.day} className="border-b border-border/50 last:border-0">
            <div className="flex">
              <div className="w-28 shrink-0 p-3 bg-secondary/50 flex items-center">
                <span className="text-xs font-semibold">{day.day}</span>
              </div>
              <div className="flex-1 p-3 space-y-1.5">
                {day.classes.map((cls) => (
                  <div key={cls.time + cls.module} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-24">{cls.time}</span>
                    <span className="text-sm font-medium flex-1">{cls.module}</span>
                    <span className="text-xs text-muted-foreground">{cls.room}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> {cls.credits} cr
                    </span>
                    <Button variant="outline" size="sm" className="text-xs h-7">Start</Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )) : (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No modules to build timetable from. Modules will appear once assigned.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
