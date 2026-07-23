import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, BookOpen, GraduationCap, Building2, FileText, Video } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useScheduledLectures, DAY_NAMES } from '@/hooks/useScheduledLectures';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface TimelineEvent {
  id: string;
  title: string;
  category: 'lecture' | 'module' | 'assignment' | 'exam' | 'residential' | 'deadline' | 'milestone';
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

const CATEGORY_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  lecture: { label: 'Lectures', icon: Video },
  module: { label: 'Modules', icon: BookOpen },
  assignment: { label: 'Assignments', icon: FileText },
  exam: { label: 'Exams', icon: Clock },
  residential: { label: 'Residential', icon: Building2 },
  milestone: { label: 'Milestones', icon: GraduationCap },
  deadline: { label: 'Deadlines', icon: Calendar },
};

export default function AcademicTimeline() {
  const { user } = useAuth();
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set(['lecture', 'module', 'assignment', 'exam', 'residential', 'milestone'])
  );

  const { data: academicEvents, loading: evLoading } = useSupabaseQuery('academic_events');
  const { data: assignments, loading: asLoading } = useSupabaseQuery('assignments');
  const { myLectures, loading: slLoading } = useScheduledLectures();

  const loading = evLoading || asLoading || slLoading;
  const ay = getAcademicYear();

  const toggleCategory = (cat: string) => {
    setActiveCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  // Build events from real data
  const events = useMemo(() => {
    const result: TimelineEvent[] = [];

    // Lectures → weekly recurring bars (show as a span across the academic year)
    const lectureModules = new Map<string, { title: string; color: string; days: string[] }>();
    myLectures.forEach(l => {
      if (!lectureModules.has(l.module_id)) {
        lectureModules.set(l.module_id, { title: l.module_title, color: l.color, days: [] });
      }
      const entry = lectureModules.get(l.module_id)!;
      entry.days.push(`${DAY_NAMES[l.day_of_week - 1]} ${l.start_time.slice(0, 5)}`);
    });

    lectureModules.forEach((val, moduleId) => {
      result.push({
        id: `lec-${moduleId}`,
        title: val.title,
        category: 'lecture',
        startDate: ay.start,
        endDate: ay.end,
        colour: val.color,
        details: `${val.days.length} sessions/week: ${val.days.join(', ')}`,
      });
    });

    // Assignments from DB
    (assignments || []).forEach(a => {
      result.push({
        id: `asn-${a.id}`,
        title: a.title,
        category: 'assignment',
        startDate: new Date(a.created_at),
        endDate: new Date(a.deadline),
        colour: '#f59e0b',
        details: `${a.type} · ${a.word_count || ''} · Max ${a.max_marks} marks`,
      });
    });

    // Academic events from DB
    (academicEvents || []).forEach(e => {
      const cat = e.event_type === 'exam' ? 'exam'
        : e.event_type === 'residential' ? 'residential'
        : e.event_type === 'milestone' ? 'milestone'
        : 'module';
      result.push({
        id: `ev-${e.id}`,
        title: e.title,
        category: cat as any,
        startDate: new Date(e.start_date),
        endDate: e.end_date ? new Date(e.end_date) : new Date(e.start_date),
        colour: e.color || '#3b82f6',
        details: e.description || undefined,
      });
    });

    return result;
  }, [myLectures, assignments, academicEvents, ay]);

  const filtered = events.filter(e => activeCategories.has(e.category));

  // Gantt months
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

  const isLecturer = user?.roles?.includes('lecturer');
  const title = isLecturer ? 'Teaching Timeline' : 'Academic Timeline';
  const subtitle = isLecturer ? 'Your teaching schedule, deadlines, and key dates' : 'Modules, lectures, assignments, and milestones';

  if (loading) return <DashboardSkeleton />;

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
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="w-3 h-3" /> {filtered.length} events
        </span>
      </div>

      {/* Gantt Chart */}
      <div className="surface-card overflow-x-auto mb-6">
        <div className="min-w-[900px]">
          <div className="flex border-b border-border/50">
            <div className="w-48 shrink-0 p-2 bg-secondary/30">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Event</span>
            </div>
            <div className="flex-1 flex">
              {months.map((m, i) => (
                <div key={i} className="flex-1 text-center p-1.5 border-l border-border/30 bg-secondary/20">
                  <span className="text-[10px] font-semibold">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            {filtered.map(event => {
              const left = getPosition(event.startDate);
              const right = getPosition(event.endDate);
              const width = Math.max(right - left, 0.5);
              const isMilestone = event.category === 'milestone';

              return (
                <div key={event.id} className="flex border-b border-border/30 hover:bg-secondary/20 transition-default">
                  <div className="w-48 shrink-0 p-2 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0`} style={{ backgroundColor: event.colour }} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{event.title}</p>
                      <p className="text-[10px] text-muted-foreground">{CATEGORY_LABELS[event.category]?.label}</p>
                    </div>
                  </div>
                  <div className="flex-1 relative h-10">
                    {months.map((_, i) => (
                      <div key={i} className="absolute top-0 bottom-0 border-l border-border/20" style={{ left: `${(i / months.length) * 100}%` }} />
                    ))}
                    <div className="absolute top-0 bottom-0 w-px bg-destructive/60 z-10" style={{ left: `${getPosition(new Date())}%` }} />
                    {isMilestone ? (
                      <div className="absolute top-1/2 -translate-y-1/2 z-20" style={{ left: `${left}%` }}>
                        <div className="w-3 h-3 rotate-45" style={{ backgroundColor: event.colour }} />
                      </div>
                    ) : (
                      <div
                        className="absolute top-1.5 bottom-1.5 rounded-md z-20 cursor-pointer hover:shadow-lg transition-default"
                        style={{ left: `${left}%`, width: `${width}%`, minWidth: '4px', backgroundColor: `${event.colour}cc` }}
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
