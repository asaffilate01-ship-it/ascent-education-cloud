import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { Calendar, Users, AlertTriangle, CheckCircle } from 'lucide-react';

export default function AttendanceDashboard() {
  return (
    <DashboardLayout title="Attendance" subtitle="Digital registers, absence tracking, and alerts">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Today's Sessions" value="8" icon={Calendar} />
        <StatCard label="Present" value="248" change="91% rate" changeType="positive" icon={CheckCircle} />
        <StatCard label="Absent" value="18" change="4 flagged" changeType="negative" icon={AlertTriangle} />
        <StatCard label="Late Arrivals" value="7" icon={Users} />
      </div>

      {/* Today's Register */}
      <div className="surface-card p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4">Today's Register</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="surface-data">
                <th className="text-label text-left px-4 py-3">Student</th>
                <th className="text-label text-left px-4 py-3">Module</th>
                <th className="text-label text-left px-4 py-3">Time</th>
                <th className="text-label text-left px-4 py-3">Method</th>
                <th className="text-label text-left px-4 py-3">Status</th>
                <th className="text-label text-left px-4 py-3">Overall %</th>
              </tr>
            </thead>
            <tbody>
              {[
                { student: 'Sara Ali', module: 'Strategic Management', time: '09:02', method: 'Online', status: 'present', overall: 94 },
                { student: 'Omar Farooq', module: 'Strategic Management', time: '09:15', method: 'Online', status: 'late', overall: 78 },
                { student: 'Zara Sheikh', module: 'Strategic Management', time: '—', method: '—', status: 'absent', overall: 65 },
                { student: 'Hassan Ali', module: 'IAB Accounting', time: '09:00', method: 'QR', status: 'present', overall: 88 },
                { student: 'Ayesha Khan', module: 'Computing L4', time: '10:58', method: 'Online', status: 'present', overall: 92 },
                { student: 'Ali Raza', module: 'Computing L4', time: '—', method: '—', status: 'absent', overall: 58 },
              ].map((a, i) => (
                <tr key={i} className="border-t border-border/50">
                  <td className="px-4 py-3 text-sm font-medium">{a.student}</td>
                  <td className="px-4 py-3 text-sm">{a.module}</td>
                  <td className="px-4 py-3 text-sm font-mono">{a.time}</td>
                  <td className="px-4 py-3 text-sm">{a.method}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={a.status}
                      variant={a.status === 'present' ? 'success' : a.status === 'late' ? 'warning' : 'danger'}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${a.overall >= 80 ? 'text-success' : a.overall >= 70 ? 'text-warning' : 'text-destructive'}`}>
                      {a.overall}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* At-Risk Students */}
      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive" /> At-Risk Students (Below 70% Attendance)
        </h3>
        <div className="space-y-2">
          {[
            { student: 'Zara Sheikh', attendance: '65%', absences: 8, lastPresent: '10 Mar' },
            { student: 'Ali Raza', attendance: '58%', absences: 12, lastPresent: '8 Mar' },
            { student: 'Farhan Qureshi', attendance: '62%', absences: 10, lastPresent: '11 Mar' },
          ].map((s) => (
            <div key={s.student} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
              <div>
                <p className="text-sm font-medium">{s.student}</p>
                <p className="text-xs text-muted-foreground">{s.absences} absences · Last present: {s.lastPresent}</p>
              </div>
              <span className="text-sm font-bold text-destructive">{s.attendance}</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
