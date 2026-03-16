import DashboardLayout from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, AlertTriangle, Plus, Users, BookOpen, Monitor, Download, Filter } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { Badge } from '@/components/ui/badge';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = Array.from({ length: 12 }, (_, i) => {
  const h = 8 + i;
  return `${h.toString().padStart(2, '0')}:00`;
});

interface TimetableSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  module: string;
  moduleCode: string;
  lecturer: string;
  room: string;
  students: number;
  programme: string;
}

interface Conflict {
  type: 'room' | 'lecturer' | 'student_overlap';
  severity: 'high' | 'medium' | 'low';
  description: string;
  slots: string[];
}

// Demo timetable data
const DEMO_SLOTS: TimetableSlot[] = [
  { id: '1', day: 'Monday', startTime: '09:00', endTime: '10:30', module: 'Strategic Management', moduleCode: 'SM401', lecturer: 'Dr. Ahmad Khan', room: 'Virtual A', students: 28, programme: 'MBA' },
  { id: '2', day: 'Monday', startTime: '09:00', endTime: '10:30', module: 'Business Law', moduleCode: 'BL301', lecturer: 'Prof. Sarah Ali', room: 'Virtual B', students: 22, programme: 'BA Business' },
  { id: '3', day: 'Monday', startTime: '11:00', endTime: '12:30', module: 'Research Methods', moduleCode: 'RM501', lecturer: 'Dr. James Wilson', room: 'Virtual C', students: 18, programme: 'MBA' },
  { id: '4', day: 'Monday', startTime: '14:00', endTime: '15:30', module: 'Marketing Strategy', moduleCode: 'MS402', lecturer: 'Dr. Ahmad Khan', room: 'Virtual A', students: 30, programme: 'MBA' },
  { id: '5', day: 'Tuesday', startTime: '09:00', endTime: '10:30', module: 'Organisational Behaviour', moduleCode: 'OB301', lecturer: 'Dr. Fatima Noor', room: 'Virtual A', students: 26, programme: 'BA Business' },
  { id: '6', day: 'Tuesday', startTime: '11:00', endTime: '12:30', module: 'Financial Management', moduleCode: 'FM401', lecturer: 'Prof. Sarah Ali', room: 'Virtual B', students: 24, programme: 'MBA' },
  { id: '7', day: 'Tuesday', startTime: '14:00', endTime: '15:30', module: 'HRM', moduleCode: 'HR301', lecturer: 'Dr. Fatima Noor', room: 'Virtual C', students: 20, programme: 'BA Business' },
  { id: '8', day: 'Wednesday', startTime: '09:00', endTime: '10:30', module: 'Strategic Management', moduleCode: 'SM401', lecturer: 'Dr. Ahmad Khan', room: 'Virtual A', students: 28, programme: 'MBA' },
  { id: '9', day: 'Wednesday', startTime: '09:00', endTime: '10:30', module: 'Organisational Behaviour', moduleCode: 'OB301', lecturer: 'Dr. Fatima Noor', room: 'Virtual A', students: 26, programme: 'BA Business' },
  { id: '10', day: 'Wednesday', startTime: '11:00', endTime: '12:30', module: 'Business Environment', moduleCode: 'BE201', lecturer: 'Dr. James Wilson', room: 'Virtual B', students: 32, programme: 'BA Business' },
  { id: '11', day: 'Thursday', startTime: '09:00', endTime: '10:30', module: 'Business Law', moduleCode: 'BL301', lecturer: 'Prof. Sarah Ali', room: 'Virtual B', students: 22, programme: 'BA Business' },
  { id: '12', day: 'Thursday', startTime: '14:00', endTime: '15:30', module: 'Business Environment', moduleCode: 'BE201', lecturer: 'Dr. James Wilson', room: 'Virtual B', students: 32, programme: 'MBA' },
  { id: '13', day: 'Friday', startTime: '09:00', endTime: '10:30', module: 'Research Methods', moduleCode: 'RM501', lecturer: 'Dr. James Wilson', room: 'Virtual A', students: 18, programme: 'MBA' },
  { id: '14', day: 'Friday', startTime: '11:00', endTime: '12:30', module: 'Financial Management', moduleCode: 'FM401', lecturer: 'Prof. Sarah Ali', room: 'Virtual C', students: 24, programme: 'MBA' },
];

function detectConflicts(slots: TimetableSlot[]): Conflict[] {
  const conflicts: Conflict[] = [];
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i], b = slots[j];
      if (a.day !== b.day) continue;
      const aStart = a.startTime, aEnd = a.endTime, bStart = b.startTime, bEnd = b.endTime;
      const overlaps = aStart < bEnd && bStart < aEnd;
      if (!overlaps) continue;

      if (a.room === b.room) {
        conflicts.push({
          type: 'room',
          severity: 'high',
          description: `Room conflict: "${a.module}" and "${b.module}" both in ${a.room} on ${a.day} at ${a.startTime}`,
          slots: [a.id, b.id],
        });
      }
      if (a.lecturer === b.lecturer) {
        conflicts.push({
          type: 'lecturer',
          severity: 'high',
          description: `Lecturer conflict: ${a.lecturer} scheduled for "${a.module}" and "${b.module}" on ${a.day} at ${a.startTime}`,
          slots: [a.id, b.id],
        });
      }
      if (a.programme === b.programme) {
        conflicts.push({
          type: 'student_overlap',
          severity: 'medium',
          description: `Student overlap: ${a.programme} students have "${a.module}" and "${b.module}" on ${a.day} at ${a.startTime}`,
          slots: [a.id, b.id],
        });
      }
    }
  }
  return conflicts;
}

function getSlotColor(moduleCode: string) {
  const colors = [
    'bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-300',
    'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
    'bg-purple-500/15 border-purple-500/30 text-purple-700 dark:text-purple-300',
    'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300',
    'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300',
    'bg-cyan-500/15 border-cyan-500/30 text-cyan-700 dark:text-cyan-300',
  ];
  let hash = 0;
  for (const c of moduleCode) hash = ((hash << 5) - hash + c.charCodeAt(0)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

export default function ScheduleManager() {
  const [filterDay, setFilterDay] = useState<string>('all');
  const { data: modules, loading } = useSupabaseQuery('modules', { orderBy: { column: 'title', ascending: true } });

  const conflicts = useMemo(() => detectConflicts(DEMO_SLOTS), []);
  const conflictSlotIds = new Set(conflicts.flatMap(c => c.slots));

  const filteredSlots = filterDay === 'all' ? DEMO_SLOTS : DEMO_SLOTS.filter(s => s.day === filterDay);

  if (loading) return <DashboardSkeleton />;

  return (
    <DashboardLayout
      title="Schedule Manager"
      subtitle="Timetable planning, room allocation, and conflict detection"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="w-3.5 h-3.5 mr-1.5" />Export</Button>
          <Button size="sm"><Plus className="w-3.5 h-3.5 mr-1.5" />Add Session</Button>
        </div>
      }
    >
      {/* Conflict Banner */}
      {conflicts.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">{conflicts.length} Scheduling Conflict{conflicts.length > 1 ? 's' : ''} Detected</p>
            <p className="text-xs text-muted-foreground mt-0.5">Review the Conflicts tab below for full details and resolution suggestions.</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Weekly Sessions', value: DEMO_SLOTS.length, icon: Calendar },
          { label: 'Unique Modules', value: new Set(DEMO_SLOTS.map(s => s.moduleCode)).size, icon: BookOpen },
          { label: 'Lecturers', value: new Set(DEMO_SLOTS.map(s => s.lecturer)).size, icon: Users },
          { label: 'Conflicts', value: conflicts.length, icon: AlertTriangle, danger: conflicts.length > 0 },
        ].map(c => (
          <div key={c.label} className="surface-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <c.icon className={`w-4 h-4 ${c.danger ? 'text-destructive' : 'text-primary'}`} />
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </div>
            <p className={`text-xl font-bold ${c.danger ? 'text-destructive' : ''}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="grid">
        <TabsList>
          <TabsTrigger value="grid"><Calendar className="w-3.5 h-3.5 mr-1.5" />Grid View</TabsTrigger>
          <TabsTrigger value="list"><Clock className="w-3.5 h-3.5 mr-1.5" />List View</TabsTrigger>
          <TabsTrigger value="conflicts">
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
            Conflicts {conflicts.length > 0 && <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5 py-0">{conflicts.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="rooms"><Monitor className="w-3.5 h-3.5 mr-1.5" />Rooms</TabsTrigger>
        </TabsList>

        {/* ---- GRID VIEW ---- */}
        <TabsContent value="grid">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header row */}
              <div className="grid grid-cols-[80px_repeat(6,1fr)] gap-px bg-border/50 rounded-t-lg overflow-hidden">
                <div className="bg-secondary/50 p-2" />
                {DAYS.map(d => (
                  <div key={d} className="bg-secondary/50 p-2 text-center">
                    <span className="text-xs font-semibold">{d}</span>
                  </div>
                ))}
              </div>
              {/* Time rows */}
              {TIME_SLOTS.map(time => (
                <div key={time} className="grid grid-cols-[80px_repeat(6,1fr)] gap-px bg-border/30 min-h-[60px]">
                  <div className="bg-background p-2 flex items-start">
                    <span className="text-[10px] font-mono text-muted-foreground">{time}</span>
                  </div>
                  {DAYS.map(day => {
                    const slotsHere = DEMO_SLOTS.filter(s => s.day === day && s.startTime === time);
                    return (
                      <div key={day} className="bg-background p-1 min-h-[60px]">
                        {slotsHere.map(slot => (
                          <div
                            key={slot.id}
                            className={`rounded-md border p-1.5 mb-1 text-[10px] leading-tight cursor-pointer hover:shadow-md transition-default ${
                              getSlotColor(slot.moduleCode)
                            } ${conflictSlotIds.has(slot.id) ? 'ring-2 ring-destructive/50' : ''}`}
                          >
                            <p className="font-bold truncate">{slot.module}</p>
                            <p className="opacity-70">{slot.lecturer.split(' ').slice(-1)}</p>
                            <p className="opacity-50">{slot.room} · {slot.students} students</p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ---- LIST VIEW ---- */}
        <TabsContent value="list">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={filterDay}
              onChange={e => setFilterDay(e.target.value)}
              className="text-xs bg-secondary rounded-md px-2 py-1.5 outline-none"
            >
              <option value="all">All Days</option>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="surface-card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-secondary/50">
                  <th className="text-left p-2.5 font-semibold">Day</th>
                  <th className="text-left p-2.5 font-semibold">Time</th>
                  <th className="text-left p-2.5 font-semibold">Module</th>
                  <th className="text-left p-2.5 font-semibold">Lecturer</th>
                  <th className="text-left p-2.5 font-semibold">Room</th>
                  <th className="text-left p-2.5 font-semibold">Programme</th>
                  <th className="text-center p-2.5 font-semibold">Students</th>
                  <th className="text-center p-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSlots.map(slot => (
                  <tr key={slot.id} className={`border-t border-border/50 ${conflictSlotIds.has(slot.id) ? 'bg-destructive/5' : 'hover:bg-secondary/30'}`}>
                    <td className="p-2.5 font-medium">{slot.day}</td>
                    <td className="p-2.5 font-mono">{slot.startTime}–{slot.endTime}</td>
                    <td className="p-2.5">
                      <span className="font-medium">{slot.module}</span>
                      <span className="text-muted-foreground ml-1">({slot.moduleCode})</span>
                    </td>
                    <td className="p-2.5">{slot.lecturer}</td>
                    <td className="p-2.5">{slot.room}</td>
                    <td className="p-2.5">{slot.programme}</td>
                    <td className="p-2.5 text-center">{slot.students}</td>
                    <td className="p-2.5 text-center">
                      {conflictSlotIds.has(slot.id) ? (
                        <Badge variant="destructive" className="text-[10px]">Conflict</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">OK</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ---- CONFLICTS ---- */}
        <TabsContent value="conflicts">
          {conflicts.length === 0 ? (
            <div className="surface-card p-12 text-center text-muted-foreground text-sm">
              ✅ No scheduling conflicts detected
            </div>
          ) : (
            <div className="space-y-3">
              {conflicts.map((c, i) => (
                <div key={i} className={`surface-card p-4 border-l-4 ${
                  c.severity === 'high' ? 'border-l-destructive' : 'border-l-amber-500'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={c.severity === 'high' ? 'destructive' : 'secondary'} className="text-[10px]">
                          {c.type === 'room' ? '🏠 Room' : c.type === 'lecturer' ? '👨‍🏫 Lecturer' : '👥 Student'} Conflict
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{c.severity}</Badge>
                      </div>
                      <p className="text-sm">{c.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Suggestion: {c.type === 'room'
                          ? 'Move one session to a different room or time slot.'
                          : c.type === 'lecturer'
                          ? 'Reschedule one session or assign a substitute lecturer.'
                          : 'Check if students are shared across programmes; reschedule if needed.'}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs shrink-0">Resolve</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---- ROOMS ---- */}
        <TabsContent value="rooms">
          <div className="grid md:grid-cols-3 gap-4">
            {['Virtual A', 'Virtual B', 'Virtual C'].map(room => {
              const roomSlots = DEMO_SLOTS.filter(s => s.room === room);
              const totalHours = roomSlots.length * 1.5;
              const utilisation = Math.round((totalHours / (DAYS.length * 8)) * 100);
              return (
                <div key={room} className="surface-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-primary" /> {room}
                    </h4>
                    <Badge variant="secondary" className="text-[10px]">{utilisation}% used</Badge>
                  </div>
                  <div className="h-2 bg-secondary rounded-full mb-3 overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${utilisation}%` }} />
                  </div>
                  <div className="space-y-1.5">
                    {roomSlots.map(s => (
                      <div key={s.id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{s.day} {s.startTime}</span>
                        <span className="font-medium truncate mx-2">{s.module}</span>
                        <span className="text-muted-foreground">{s.students} 👤</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
