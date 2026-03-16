import DashboardLayout from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, BookOpen, GraduationCap, Building2, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface TimelineEvent {
  id: string;
  title: string;
  category: 'module' | 'assignment' | 'exam' | 'residential' | 'deadline' | 'milestone';
  startDate: Date;
  endDate: Date;
  colour: string;
  details?: string;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getAcademicYear() {
  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return { start: new Date(year, 8, 1), end: new Date(year + 1, 7, 31), label: `${year}/${year + 1}` };
}

function generateDemoEvents(): TimelineEvent[] {
  const ay = getAcademicYear();
  const y = ay.start.getFullYear();
  return [
    // Semester 1 modules
    { id: 'm1', title: 'Strategic Management', category: 'module', startDate: new Date(y, 8, 15), endDate: new Date(y, 11, 20), colour: 'bg-blue-500' },
    { id: 'm2', title: 'Organisational Behaviour', category: 'module', startDate: new Date(y, 8, 15), endDate: new Date(y, 11, 20), colour: 'bg-emerald-500' },
    { id: 'm3', title: 'Business Environment', category: 'module', startDate: new Date(y, 8, 15), endDate: new Date(y, 11, 20), colour: 'bg-purple-500' },
    // Semester 2 modules
    { id: 'm4', title: 'Financial Management', category: 'module', startDate: new Date(y + 1, 0, 10), endDate: new Date(y + 1, 3, 30), colour: 'bg-amber-500' },
    { id: 'm5', title: 'Research Methods', category: 'module', startDate: new Date(y + 1, 0, 10), endDate: new Date(y + 1, 3, 30), colour: 'bg-rose-500' },
    { id: 'm6', title: 'Marketing Strategy', category: 'module', startDate: new Date(y + 1, 0, 10), endDate: new Date(y + 1, 3, 30), colour: 'bg-cyan-500' },
    // Assignments
    { id: 'a1', title: 'SM Assignment 1', category: 'assignment', startDate: new Date(y, 9, 15), endDate: new Date(y, 10, 15), colour: 'bg-blue-400', details: 'Strategic Management — 3000 words' },
    { id: 'a2', title: 'OB Case Study', category: 'assignment', startDate: new Date(y, 10, 1), endDate: new Date(y, 11, 1), colour: 'bg-emerald-400', details: 'Organisational Behaviour — Group work' },
    { id: 'a3', title: 'FM Report', category: 'assignment', startDate: new Date(y + 1, 1, 1), endDate: new Date(y + 1, 2, 1), colour: 'bg-amber-400', details: 'Financial Management — 4000 words' },
    { id: 'a4', title: 'Research Proposal', category: 'assignment', startDate: new Date(y + 1, 2, 1), endDate: new Date(y + 1, 3, 15), colour: 'bg-rose-400', details: 'Research Methods — 5000 words' },
    // Exams
    { id: 'e1', title: 'Semester 1 Exams', category: 'exam', startDate: new Date(y, 11, 10), endDate: new Date(y, 11, 20), colour: 'bg-red-600' },
    { id: 'e2', title: 'Semester 2 Exams', category: 'exam', startDate: new Date(y + 1, 4, 1), endDate: new Date(y + 1, 4, 15), colour: 'bg-red-600' },
    // Residential weeks
    { id: 'r1', title: 'Residential Week 1', category: 'residential', startDate: new Date(y, 9, 21), endDate: new Date(y, 9, 25), colour: 'bg-indigo-500', details: 'On-centre week — Workshops & Networking' },
    { id: 'r2', title: 'Residential Week 2', category: 'residential', startDate: new Date(y + 1, 1, 17), endDate: new Date(y + 1, 1, 21), colour: 'bg-indigo-500', details: 'On-centre week — Presentations & Labs' },
    // Milestones
    { id: 'ms1', title: 'Enrolment Deadline', category: 'milestone', startDate: new Date(y, 8, 1), endDate: new Date(y, 8, 1), colour: 'bg-yellow-500' },
    { id: 'ms2', title: 'Results Published', category: 'milestone', startDate: new Date(y + 1, 5, 15), endDate: new Date(y + 1, 5, 15), colour: 'bg-green-600' },
    { id: 'ms3', title: 'Graduation', category: 'milestone', startDate: new Date(y + 1, 6, 15), endDate: new Date(y + 1, 6, 15), colour: 'bg-yellow-600' },
  ];
}

const CATEGORY_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  module: { label: 'Modules', icon: BookOpen },
  assignment: { label: 'Assignments', icon: FileText },
  exam: { label: 'Exams', icon: Clock },
  residential: { label: 'Residential', icon: Building2 },
  milestone: { label: 'Milestones', icon: GraduationCap },
  deadline: { label: 'Deadlines', icon: Calendar },
};

export default function AcademicTimeline() {
  const { user } = useAuth();
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set(['module', 'assignment', 'exam', 'residential', 'milestone']));
  const events = useMemo(() => generateDemoEvents(), []);
  const ay = getAcademicYear();

  const toggleCategory = (cat: string) => {
    setActiveCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const filtered = events.filter(e => activeCategories.has(e.category));

  // Calculate months for Gantt
  const months: { label: string; date: Date }[] = [];
  const cur = new Date(ay.start);
  while (cur <= ay.end) {
    months.push({ label: `${MONTH_NAMES[cur.getMonth()]} ${cur.getFullYear().toString().slice(-2)}`, date: new Date(cur) });
    cur.setMonth(cur.getMonth() + 1);
  }

  const totalDays = (ay.end.getTime() - ay.start.getTime()) / (1000 * 60 * 60 * 24);

  const getPosition = (date: Date) => {
    const days = Math.max(0, (date.getTime() - ay.start.getTime()) / (1000 * 60 * 60 * 24));
    return (days / totalDays) * 100;
  };

  const isLecturer = user?.role === 'lecturer';
  const title = isLecturer ? 'Teaching Timeline' : 'Academic Timeline';
  const subtitle = isLecturer ? 'Your teaching schedule, deadlines, and key dates' : 'Your modules, assignments, exams, and key milestones';

  return (
    <DashboardLayout title={title} subtitle={subtitle}>
      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(CATEGORY_LABELS).map(([key, { label, icon: Icon }]) => (
          <button
            key={key}
            onClick={() => toggleCategory(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-default ${
              activeCategories.has(key)
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-secondary/50 border-border text-muted-foreground'
            }`}
          >
            <Icon className="w-3 h-3" /> {label}
          </button>
        ))}
      </div>

      {/* Academic Year Label */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Academic Year {ay.label}</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {filtered.length} events</span>
        </div>
      </div>

      {/* ====== GANTT CHART ====== */}
      <div className="surface-card overflow-x-auto mb-6">
        <div className="min-w-[900px]">
          {/* Month headers */}
          <div className="flex border-b border-border/50">
            <div className="w-48 shrink-0 p-2 bg-secondary/30">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Event</span>
            </div>
            <div className="flex-1 flex">
              {months.map((m, i) => (
                <div
                  key={i}
                  className="flex-1 text-center p-1.5 border-l border-border/30 bg-secondary/20"
                >
                  <span className="text-[10px] font-semibold">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Today marker info */}
          <div className="relative">
            {/* Event rows */}
            {filtered.map(event => {
              const left = getPosition(event.startDate);
              const right = getPosition(event.endDate);
              const width = Math.max(right - left, 0.5);
              const isMilestone = event.category === 'milestone';

              return (
                <div key={event.id} className="flex border-b border-border/30 hover:bg-secondary/20 transition-default">
                  <div className="w-48 shrink-0 p-2 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${event.colour} shrink-0`} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{event.title}</p>
                      <p className="text-[10px] text-muted-foreground">{CATEGORY_LABELS[event.category]?.label}</p>
                    </div>
                  </div>
                  <div className="flex-1 relative h-10">
                    {/* Month grid lines */}
                    {months.map((_, i) => (
                      <div key={i} className="absolute top-0 bottom-0 border-l border-border/20" style={{ left: `${(i / months.length) * 100}%` }} />
                    ))}
                    {/* Today line */}
                    <div className="absolute top-0 bottom-0 w-px bg-destructive/60 z-10" style={{ left: `${getPosition(new Date())}%` }} />
                    {/* Bar */}
                    {isMilestone ? (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 z-20"
                        style={{ left: `${left}%` }}
                      >
                        <div className={`w-3 h-3 rotate-45 ${event.colour}`} />
                      </div>
                    ) : (
                      <div
                        className={`absolute top-1.5 bottom-1.5 rounded-md ${event.colour}/80 z-20 group cursor-pointer hover:shadow-lg transition-default`}
                        style={{ left: `${left}%`, width: `${width}%`, minWidth: '4px' }}
                        title={`${event.title}\n${event.startDate.toLocaleDateString()} – ${event.endDate.toLocaleDateString()}${event.details ? '\n' + event.details : ''}`}
                      >
                        <span className="text-[9px] text-white font-medium px-1 truncate block leading-7">{event.title}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming Events List */}
      <h3 className="text-sm font-semibold mb-2">Upcoming Events</h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered
          .filter(e => e.endDate >= new Date())
          .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
          .slice(0, 6)
          .map(event => {
            const Icon = CATEGORY_LABELS[event.category]?.icon || Calendar;
            const daysUntil = Math.ceil((event.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return (
              <div key={event.id} className="surface-card p-4 hover:shadow-lg transition-default cursor-pointer group">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="text-[10px]">
                    <Icon className="w-3 h-3 mr-1" /> {CATEGORY_LABELS[event.category]?.label}
                  </Badge>
                  {daysUntil > 0 ? (
                    <span className="text-[10px] text-muted-foreground">in {daysUntil} days</span>
                  ) : daysUntil === 0 ? (
                    <Badge className="text-[10px] bg-primary">Today</Badge>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">In progress</span>
                  )}
                </div>
                <h4 className="text-sm font-semibold group-hover:text-primary transition-default">{event.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {event.startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  {event.startDate.getTime() !== event.endDate.getTime() && (
                    <> – {event.endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</>
                  )}
                </p>
                {event.details && <p className="text-[10px] text-muted-foreground mt-1">{event.details}</p>}
              </div>
            );
          })}
      </div>
    </DashboardLayout>
  );
}
