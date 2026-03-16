import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { Calendar, AlertTriangle, UserCheck, Monitor, Plus, MapPin, FileText, CheckCircle, Clock } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type Tab = 'schedule' | 'seating' | 'incidents' | 'results';

export default function ExamsDashboard() {
  const [tab, setTab] = useState<Tab>('schedule');
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidents, setIncidents] = useState<Array<{ id: string; student: string; type: string; description: string; time: string; severity: string }>>([]);

  const { data: modules, loading: mLoading } = useSupabaseQuery('modules', {
    filters: [{ column: 'status', operator: 'eq', value: 'active' }],
    orderBy: { column: 'title', ascending: true },
  });
  const { data: programmes } = useSupabaseQuery('programmes');
  const { data: submissions } = useSupabaseQuery('submissions');

  const programmeMap = useMemo(() => {
    const map: Record<string, { level: string; enrolled: number }> = {};
    programmes.forEach((p) => { map[p.id] = { level: p.level, enrolled: p.enrolled || 0 }; });
    return map;
  }, [programmes]);



  const HALLS = ['Hall A', 'Hall B', 'Hall C'];

  const examSchedule = useMemo(() => {
    const today = new Date();
    return modules.slice(0, 8).map((mod, i) => {
      const examDate = new Date(today);
      examDate.setDate(today.getDate() + 5 + i * 3);
      const prog = programmeMap[mod.programme_id] || { level: '—', enrolled: 0 };
      return {
        id: mod.id,
        date: examDate,
        dateStr: examDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: i % 2 === 0 ? '09:00 – 12:00' : '14:00 – 17:00',
        module: mod.title,
        code: mod.code || `MOD-${i + 1}`,
        level: prog.level,
        room: HALLS[i % 3],
        students: prog.enrolled,
        invigilator: `Staff ${i + 1}`,
        status: i < 5 ? 'Scheduled' : i < 7 ? 'Pending Approval' : 'Completed',
      };
    });
  }, [modules, programmeMap]);

  const totalStudents = useMemo(() => examSchedule.reduce((s, e) => s + e.students, 0), [examSchedule]);

  const seatingData = useMemo(() => HALLS.map((hall) => {
    const examsInHall = examSchedule.filter(e => e.room === hall);
    const totalSeats = Math.max(examsInHall.reduce((s, e) => s + e.students, 0), 20);
    const rows = Math.ceil(totalSeats / 5);
    return { hall, exams: examsInHall, totalSeats, rows, cols: 5 };
  }), [examSchedule]);

  const gradedSubmissions = useMemo(() => submissions.filter(s => s.grade !== null), [submissions]);

  const resultsByModule = useMemo(() => {
    const map: Record<string, { module: string; total: number; graded: number; avg: number; distinction: number; merit: number; pass: number; fail: number }> = {};
    for (const sub of gradedSubmissions) {
      if (!map[sub.assignment_id]) {
        map[sub.assignment_id] = { module: 'Module', total: 0, graded: 0, avg: 0, distinction: 0, merit: 0, pass: 0, fail: 0 };
      }
      const entry = map[sub.assignment_id];
      entry.total++;
      entry.graded++;
      entry.avg += sub.grade!;
      if (sub.grade! >= 70) entry.distinction++;
      else if (sub.grade! >= 60) entry.merit++;
      else if (sub.grade! >= 40) entry.pass++;
      else entry.fail++;
    }
    return Object.values(map).map(e => ({ ...e, avg: e.graded > 0 ? Math.round(e.avg / e.graded) : 0 }));
  }, [gradedSubmissions]);

  if (mLoading) return <DashboardSkeleton />;

  const handleLogIncident = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setIncidents(prev => [...prev, {
      id: crypto.randomUUID(),
      student: fd.get('student') as string,
      type: fd.get('type') as string,
      description: fd.get('description') as string,
      time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      severity: fd.get('type') === 'malpractice' ? 'high' : 'medium',
    }]);
    setIncidentOpen(false);
    toast.success('Incident logged');
  };

  const tabs: { key: Tab; label: string; icon: typeof Calendar }[] = [
    { key: 'schedule', label: 'Schedule', icon: Calendar },
    { key: 'seating', label: 'Seating Plans', icon: MapPin },
    { key: 'incidents', label: `Incidents (${incidents.length})`, icon: AlertTriangle },
    { key: 'results', label: 'Results', icon: FileText },
  ];

  return (
    <DashboardLayout
      title="Examinations"
      subtitle="Scheduling, rooms, seating, entry verification, and incidents"
      actions={
        <Dialog open={incidentOpen} onOpenChange={setIncidentOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline"><AlertTriangle className="w-3.5 h-3.5 mr-1.5" />Log Incident</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log Exam Incident</DialogTitle></DialogHeader>
            <form onSubmit={handleLogIncident} className="space-y-4">
              <div><Label>Student Name</Label><Input name="student" required placeholder="Full name" /></div>
              <div>
                <Label>Incident Type</Label>
                <Select name="type" required>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="late_arrival">Late Arrival</SelectItem>
                    <SelectItem value="malpractice">Suspected Malpractice</SelectItem>
                    <SelectItem value="disruptive">Disruptive Behaviour</SelectItem>
                    <SelectItem value="medical">Medical Emergency</SelectItem>
                    <SelectItem value="technical">Technical Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Textarea name="description" required placeholder="What happened..." /></div>
              <Button type="submit" className="w-full">Log Incident</Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Upcoming Exams" value={examSchedule.filter(e => e.status !== 'Completed').length} change="next 30 days" changeType="neutral" icon={Calendar} />
        <StatCard label="Rooms Allocated" value={HALLS.length} icon={Monitor} />
        <StatCard label="Students Registered" value={totalStudents} icon={UserCheck} />
        <StatCard label="Incidents (Term)" value={incidents.length} change={incidents.length === 0 ? 'none' : `${incidents.length} logged`} changeType={incidents.length === 0 ? 'positive' : 'negative'} icon={AlertTriangle} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-default ${
              tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-accent'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Schedule Tab */}
      {tab === 'schedule' && (
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-4">Exam Timetable</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="surface-data">
                  <th className="text-label text-left px-4 py-3">Date</th>
                  <th className="text-label text-left px-4 py-3">Time</th>
                  <th className="text-label text-left px-4 py-3">Module</th>
                  <th className="text-label text-left px-4 py-3">Level</th>
                  <th className="text-label text-left px-4 py-3">Room</th>
                  <th className="text-label text-left px-4 py-3">Invigilator</th>
                  <th className="text-label text-left px-4 py-3">Students</th>
                  <th className="text-label text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {examSchedule.map((e) => (
                  <tr key={e.id} className="border-t border-border/50">
                    <td className="px-4 py-3 text-sm font-medium">{e.dateStr}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{e.time}</td>
                    <td className="px-4 py-3 text-sm">{e.module}</td>
                    <td className="px-4 py-3 text-sm">{e.level}</td>
                    <td className="px-4 py-3 text-sm">{e.room}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{e.invigilator}</td>
                    <td className="px-4 py-3 text-sm font-medium">{e.students}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={e.status} variant={e.status === 'Scheduled' ? 'success' : e.status === 'Completed' ? 'neutral' : 'warning'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Seating Plans Tab */}
      {tab === 'seating' && (
        <div className="space-y-6">
          {seatingData.map((hall) => (
            <div key={hall.hall} className="surface-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> {hall.hall}
                </h3>
                <span className="text-xs text-muted-foreground">{hall.totalSeats} seats · {hall.exams.length} exams</span>
              </div>
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${hall.cols}, 1fr)` }}>
                {Array.from({ length: hall.rows * hall.cols }).map((_, i) => {
                  const row = Math.floor(i / hall.cols);
                  const col = i % hall.cols;
                  const seatNum = i + 1;
                  const isOccupied = seatNum <= hall.totalSeats;
                  return (
                    <div
                      key={i}
                      className={`h-8 rounded text-[10px] flex items-center justify-center font-medium ${
                        isOccupied
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'bg-secondary text-muted-foreground'
                      }`}
                      title={isOccupied ? `Seat ${String.fromCharCode(65 + row)}${col + 1}` : 'Empty'}
                    >
                      {String.fromCharCode(65 + row)}{col + 1}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-primary/10 border border-primary/20" /> Occupied</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-secondary" /> Empty</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Incidents Tab */}
      {tab === 'incidents' && (
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" /> Incident Log
          </h3>
          {incidents.length > 0 ? (
            <div className="space-y-3">
              {incidents.map((inc) => (
                <div key={inc.id} className="surface-data rounded-lg p-4 flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    inc.severity === 'high' ? 'bg-destructive/10' : 'bg-warning/10'
                  }`}>
                    <AlertTriangle className={`w-4 h-4 ${inc.severity === 'high' ? 'text-destructive' : 'text-warning'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{inc.student}</span>
                      <span className="text-[10px] font-medium bg-secondary px-1.5 py-0.5 rounded capitalize">{inc.type.replace('_', ' ')}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1"><Clock className="w-3 h-3" />{inc.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{inc.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <CheckCircle className="w-8 h-8 mb-2 text-success" />
              <p className="text-sm">No incidents recorded this term</p>
              <p className="text-xs mt-1">Use the "Log Incident" button to record any exam issues</p>
            </div>
          )}
        </div>
      )}

      {/* Results Tab */}
      {tab === 'results' && (
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-4">Exam Results Summary</h3>
          {gradedSubmissions.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="surface-data rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-primary">{gradedSubmissions.length}</p>
                  <p className="text-[10px] text-muted-foreground">Total Graded</p>
                </div>
                <div className="surface-data rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-success">{gradedSubmissions.filter(s => s.grade! >= 70).length}</p>
                  <p className="text-[10px] text-muted-foreground">Distinctions</p>
                </div>
                <div className="surface-data rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">{gradedSubmissions.filter(s => s.grade! >= 40 && s.grade! < 70).length}</p>
                  <p className="text-[10px] text-muted-foreground">Pass</p>
                </div>
                <div className="surface-data rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-destructive">{gradedSubmissions.filter(s => s.grade! < 40).length}</p>
                  <p className="text-[10px] text-muted-foreground">Fail</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="surface-data">
                      <th className="text-label text-left px-4 py-3">Student</th>
                      <th className="text-label text-left px-4 py-3">Grade</th>
                      <th className="text-label text-left px-4 py-3">Classification</th>
                      <th className="text-label text-left px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradedSubmissions.slice(0, 20).map((s) => (
                      <tr key={s.id} className="border-t border-border/50">
                        <td className="px-4 py-3 text-sm">{s.student_name}</td>
                        <td className="px-4 py-3 text-sm font-bold text-primary">{s.grade}%</td>
                        <td className="px-4 py-3 text-sm">
                          {s.grade! >= 70 ? 'Distinction' : s.grade! >= 60 ? 'Merit' : s.grade! >= 40 ? 'Pass' : 'Fail'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status="Published" variant="success" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">No results published yet</p>
          )}
        </div>
      )}

      {/* Entry Verification Flow */}
      {tab === 'schedule' && (
        <div className="grid lg:grid-cols-2 gap-4 mt-6">
          <div className="surface-card p-5">
            <h3 className="text-sm font-semibold mb-3">Exam Entry Verification Flow</h3>
            <div className="space-y-3">
              {[
                { step: '1', label: 'Student arrives at centre', icon: '🏫' },
                { step: '2', label: 'QR code or roster lookup', icon: '📱' },
                { step: '3', label: 'ID checked (CNIC/Passport)', icon: '🪪' },
                { step: '4', label: 'Face match verification', icon: '📸' },
                { step: '5', label: 'Optional fingerprint scan', icon: '🔐' },
                { step: '6', label: 'Admitted or Denied → Event logged', icon: '✅' },
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-3 py-1">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {s.step}
                  </div>
                  <span className="text-sm">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card p-5">
            <h3 className="text-sm font-semibold mb-3">Exam Rules & Guidelines</h3>
            <div className="space-y-2">
              {[
                'Students must arrive 15 minutes before exam start',
                'Only transparent pencil cases allowed',
                'Mobile phones must be switched off and stored',
                'No communication between candidates',
                'Invigilators must report incidents within 10 minutes',
                'All scripts collected and counted before dismissal',
              ].map((rule, i) => (
                <div key={i} className="flex items-start gap-2 py-1">
                  <CheckCircle className="w-3.5 h-3.5 mt-0.5 text-success shrink-0" />
                  <span className="text-xs text-muted-foreground">{rule}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
