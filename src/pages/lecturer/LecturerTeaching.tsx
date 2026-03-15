import DashboardLayout from '@/components/layout/DashboardLayout';
import { BookOpen, Users, Calendar, Video, Clock, ChevronRight, FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MY_MODULES = [
  {
    id: '1', name: 'Strategic Management', level: 'Level 5', code: 'SM501',
    students: 28, lectures: 12, completed: 8, nextClass: 'Today 09:00',
    resources: 24, assignments: 3
  },
  {
    id: '2', name: 'Business Environment', level: 'Level 4', code: 'BE401',
    students: 32, lectures: 12, completed: 10, nextClass: 'Today 14:00',
    resources: 18, assignments: 4
  },
  {
    id: '3', name: 'Organisational Behaviour', level: 'Level 4', code: 'OB402',
    students: 26, lectures: 10, completed: 6, nextClass: 'Tomorrow 11:00',
    resources: 15, assignments: 2
  },
];

const WEEKLY_SCHEDULE = [
  { day: 'Monday', classes: [{ time: '09:00-10:30', module: 'Strategic Management', room: 'Virtual A', students: 28 }] },
  { day: 'Tuesday', classes: [{ time: '11:00-12:30', module: 'Organisational Behaviour', room: 'Virtual C', students: 26 }] },
  { day: 'Wednesday', classes: [{ time: '09:00-10:30', module: 'Strategic Management', room: 'Virtual A', students: 28 }, { time: '14:00-15:30', module: 'Business Environment', room: 'Virtual B', students: 32 }] },
  { day: 'Thursday', classes: [{ time: '14:00-15:30', module: 'Business Environment', room: 'Virtual B', students: 32 }] },
  { day: 'Friday', classes: [{ time: '11:00-12:30', module: 'Organisational Behaviour', room: 'Virtual C', students: 26 }] },
];

export default function LecturerTeaching() {
  return (
    <DashboardLayout
      title="Teaching"
      subtitle="Your modules, timetable, and resources"
      actions={<Button size="sm"><Upload className="w-3.5 h-3.5 mr-1.5" />Upload Material</Button>}
    >
      {/* My Modules */}
      <h3 className="text-base font-semibold mb-3">My Modules</h3>
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {MY_MODULES.map((mod) => (
          <div key={mod.id} className="surface-card p-5 hover:shadow-lg transition-default cursor-pointer group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">{mod.level}</span>
              <span className="text-[10px] text-muted-foreground">{mod.code}</span>
            </div>
            <h4 className="text-sm font-semibold group-hover:text-primary transition-default">{mod.name}</h4>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {mod.students}</span>
              <span className="flex items-center gap-1"><Video className="w-3 h-3" /> {mod.completed}/{mod.lectures}</span>
              <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {mod.resources}</span>
            </div>
            {/* Progress */}
            <div className="mt-3">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-muted-foreground">Lecture progress</span>
                <span className="font-medium">{Math.round((mod.completed / mod.lectures) * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full">
                <div className="h-full bg-primary rounded-full" style={{ width: `${(mod.completed / mod.lectures) * 100}%` }} />
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between">
              <span className="text-xs text-primary font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" /> {mod.nextClass}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>
        ))}
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
