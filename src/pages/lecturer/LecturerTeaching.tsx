import DashboardLayout from '@/components/layout/DashboardLayout';
import { BookOpen, Users, Calendar, Video, Clock, ChevronRight, FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DashboardSkeleton } from '@/components/ui/Skeletons';

const WEEKLY_SCHEDULE = [
  { day: 'Monday', classes: [{ time: '09:00-10:30', module: 'Strategic Management', room: 'Virtual A', students: 28 }] },
  { day: 'Tuesday', classes: [{ time: '11:00-12:30', module: 'Organisational Behaviour', room: 'Virtual C', students: 26 }] },
  { day: 'Wednesday', classes: [{ time: '09:00-10:30', module: 'Strategic Management', room: 'Virtual A', students: 28 }, { time: '14:00-15:30', module: 'Business Environment', room: 'Virtual B', students: 32 }] },
  { day: 'Thursday', classes: [{ time: '14:00-15:30', module: 'Business Environment', room: 'Virtual B', students: 32 }] },
  { day: 'Friday', classes: [{ time: '11:00-12:30', module: 'Organisational Behaviour', room: 'Virtual C', students: 26 }] },
];

export default function LecturerTeaching() {
  const { data: modules, loading } = useSupabaseQuery('modules', {
    orderBy: { column: 'title', ascending: true },
  });

  if (loading) return <DashboardSkeleton />;

  // Show first 6 modules as "my modules" for now
  const myModules = modules.slice(0, 6);

  return (
    <DashboardLayout
      title="Teaching"
      subtitle="Your modules, timetable, and resources"
      actions={<Button size="sm"><Upload className="w-3.5 h-3.5 mr-1.5" />Upload Material</Button>}
    >
      <h3 className="text-base font-semibold mb-3">My Modules</h3>
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {myModules.map((mod) => (
          <div key={mod.id} className="surface-card p-5 hover:shadow-lg transition-default cursor-pointer group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">
                {mod.status}
              </span>
              <span className="text-[10px] text-muted-foreground">{mod.code || ''}</span>
            </div>
            <h4 className="text-sm font-semibold group-hover:text-primary transition-default">{mod.title}</h4>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {mod.credits || 0} credits</span>
            </div>
            <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between">
              <span className="text-xs text-primary font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" /> View module
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>
        ))}
        {myModules.length === 0 && (
          <div className="surface-card p-12 text-center text-muted-foreground text-sm col-span-3">No modules assigned</div>
        )}
      </div>

      {/* Weekly Timetable */}
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" /> Weekly Timetable
      </h3>
      <div className="surface-card overflow-hidden">
        {WEEKLY_SCHEDULE.map((day) => (
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
                      <Users className="w-3 h-3" /> {cls.students}
                    </span>
                    <Button variant="outline" size="sm" className="text-xs h-7">Start</Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
