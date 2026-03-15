import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { Calendar, AlertTriangle, UserCheck, Monitor } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { useMemo } from 'react';

export default function ExamsDashboard() {
  const { data: modules, loading } = useSupabaseQuery('modules', {
    filters: [{ column: 'status', operator: 'eq', value: 'active' }],
    orderBy: { column: 'title', ascending: true },
  });
  const { data: profiles } = useSupabaseQuery('profiles');
  const { data: programmes } = useSupabaseQuery('programmes');

  const programmeMap = useMemo(() => {
    const map: Record<string, string> = {};
    programmes.forEach((p) => { map[p.id] = p.level; });
    return map;
  }, [programmes]);

  if (loading) return <DashboardSkeleton />;

  // Generate exam schedule from active modules
  const today = new Date();
  const examSchedule = modules.slice(0, 6).map((mod, i) => {
    const examDate = new Date(today);
    examDate.setDate(today.getDate() + 5 + i * 3);
    return {
      id: mod.id,
      date: examDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      module: mod.title,
      level: programmeMap[mod.programme_id] || '—',
      room: `Hall ${String.fromCharCode(65 + (i % 3))}`,
      students: programmes.find(p => p.id === mod.programme_id)?.enrolled || 0,
      status: i < 4 ? 'Scheduled' : 'Pending Approval',
    };
  });

  const totalStudents = examSchedule.reduce((s, e) => s + e.students, 0);

  return (
    <DashboardLayout
      title="Examinations"
      subtitle="Scheduling, rooms, seating, entry verification, and incidents"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Upcoming Exams" value={examSchedule.length} change="next 30 days" changeType="neutral" icon={Calendar} />
        <StatCard label="Rooms Allocated" value="3" icon={Monitor} />
        <StatCard label="Students Registered" value={totalStudents} icon={UserCheck} />
        <StatCard label="Incidents (Term)" value="0" change="none" changeType="positive" icon={AlertTriangle} />
      </div>

      {/* Exam Schedule */}
      <div className="surface-card p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4">Exam Schedule</h3>
        {examSchedule.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="surface-data">
                  <th className="text-label text-left px-4 py-3">Date</th>
                  <th className="text-label text-left px-4 py-3">Module</th>
                  <th className="text-label text-left px-4 py-3">Level</th>
                  <th className="text-label text-left px-4 py-3">Room</th>
                  <th className="text-label text-left px-4 py-3">Students</th>
                  <th className="text-label text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {examSchedule.map((e) => (
                  <tr key={e.id} className="border-t border-border/50">
                    <td className="px-4 py-3 text-sm font-medium">{e.date}</td>
                    <td className="px-4 py-3 text-sm">{e.module}</td>
                    <td className="px-4 py-3 text-sm">{e.level}</td>
                    <td className="px-4 py-3 text-sm">{e.room}</td>
                    <td className="px-4 py-3 text-sm font-medium">{e.students}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={e.status} variant={e.status === 'Scheduled' ? 'success' : 'warning'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No upcoming exams</p>
        )}
      </div>

      {/* Entry Flow + Info */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3">Exam Entry Verification Flow</h3>
          <div className="space-y-3">
            {[
              { step: '1', label: 'Student arrives at centre' },
              { step: '2', label: 'QR code or roster lookup' },
              { step: '3', label: 'ID checked (CNIC/Passport)' },
              { step: '4', label: 'Face match verification' },
              { step: '5', label: 'Optional fingerprint scan' },
              { step: '6', label: 'Admitted or Denied → Event logged' },
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
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" /> Incident Log
          </h3>
          <p className="text-sm text-muted-foreground text-center py-8">No incidents recorded this term</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
