import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { Calendar, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { useMemo } from 'react';

export default function AttendanceDashboard() {
  const { data: records, loading } = useSupabaseQuery('attendance_records', {
    orderBy: { column: 'date', ascending: false },
  });
  const { data: profiles } = useSupabaseQuery('profiles');
  const { data: modules } = useSupabaseQuery('modules');

  const profileMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach((p) => { map[p.user_id] = p.full_name; });
    return map;
  }, [profiles]);

  const moduleMap = useMemo(() => {
    const map: Record<string, string> = {};
    modules.forEach((m) => { map[m.id] = m.title; });
    return map;
  }, [modules]);

  if (loading) return <DashboardSkeleton />;

  const today = new Date().toISOString().split('T')[0];
  const todayRecords = records.filter((r) => r.date === today);
  const presentToday = todayRecords.filter((r) => r.status === 'present' || r.status === 'excused').length;
  const absentToday = todayRecords.filter((r) => r.status === 'absent').length;
  const lateToday = todayRecords.filter((r) => r.status === 'late').length;
  const totalToday = todayRecords.length;
  const rate = totalToday > 0 ? Math.round((presentToday / totalToday) * 100) : 0;

  // Aggregate per-student overall attendance
  const studentAgg = useMemo(() => {
    const map: Record<string, { total: number; present: number }> = {};
    records.forEach((r) => {
      if (!map[r.student_id]) map[r.student_id] = { total: 0, present: 0 };
      map[r.student_id].total++;
      if (r.status === 'present' || r.status === 'excused') map[r.student_id].present++;
    });
    return map;
  }, [records]);

  const atRiskStudents = Object.entries(studentAgg)
    .filter(([, s]) => s.total > 0 && (s.present / s.total) < 0.7)
    .map(([id, s]) => ({
      id,
      name: profileMap[id] || id.slice(0, 8),
      rate: Math.round((s.present / s.total) * 100),
      absences: s.total - s.present,
    }))
    .sort((a, b) => a.rate - b.rate);

  return (
    <DashboardLayout title="Attendance" subtitle="Digital registers, absence tracking, and alerts">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Today's Records" value={totalToday || '—'} icon={Calendar} />
        <StatCard label="Present" value={presentToday} change={totalToday > 0 ? `${rate}% rate` : '—'} changeType={rate >= 80 ? 'positive' : 'negative'} icon={CheckCircle} />
        <StatCard label="Absent" value={absentToday} change={absentToday > 3 ? `${absentToday} flagged` : '—'} changeType="negative" icon={AlertTriangle} />
        <StatCard label="Late Arrivals" value={lateToday} icon={Users} />
      </div>

      {/* Today's Register */}
      <div className="surface-card p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4">Today's Register</h3>
        {todayRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="surface-data">
                  <th className="text-label text-left px-4 py-3">Student</th>
                  <th className="text-label text-left px-4 py-3">Module</th>
                  <th className="text-label text-left px-4 py-3">Method</th>
                  <th className="text-label text-left px-4 py-3">Status</th>
                  <th className="text-label text-left px-4 py-3">Overall %</th>
                </tr>
              </thead>
              <tbody>
                {todayRecords.map((r) => {
                  const overall = studentAgg[r.student_id];
                  const overallRate = overall && overall.total > 0 ? Math.round((overall.present / overall.total) * 100) : 0;
                  return (
                    <tr key={r.id} className="border-t border-border/50">
                      <td className="px-4 py-3 text-sm font-medium">{profileMap[r.student_id] || r.student_id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-sm">{r.module_id ? moduleMap[r.module_id] || '—' : '—'}</td>
                      <td className="px-4 py-3 text-sm">{r.method || 'manual'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={r.status}
                          variant={r.status === 'present' ? 'success' : r.status === 'late' ? 'warning' : 'danger'}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${overallRate >= 80 ? 'text-success' : overallRate >= 70 ? 'text-warning' : 'text-destructive'}`}>
                          {overallRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No attendance records for today</p>
        )}
      </div>

      {/* At-Risk Students */}
      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive" /> At-Risk Students (Below 70% Attendance)
        </h3>
        {atRiskStudents.length > 0 ? (
          <div className="space-y-2">
            {atRiskStudents.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.absences} absences</p>
                </div>
                <span className="text-sm font-bold text-destructive">{s.rate}%</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No at-risk students</p>
        )}
      </div>
    </DashboardLayout>
  );
}
