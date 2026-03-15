import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { Calendar, AlertTriangle, UserCheck, Monitor, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ExamsDashboard() {
  return (
    <DashboardLayout
      title="Examinations"
      subtitle="Scheduling, rooms, seating, entry verification, and incidents"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Upcoming Exams" value="6" change="next 30 days" changeType="neutral" icon={Calendar} />
        <StatCard label="Rooms Allocated" value="3" icon={Monitor} />
        <StatCard label="Students Registered" value="186" icon={UserCheck} />
        <StatCard label="Incidents (Term)" value="2" change="low" changeType="positive" icon={AlertTriangle} />
      </div>

      {/* Exam Schedule */}
      <div className="surface-card p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4">Exam Schedule</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="surface-data">
                <th className="text-label text-left px-4 py-3">Date</th>
                <th className="text-label text-left px-4 py-3">Module</th>
                <th className="text-label text-left px-4 py-3">Level</th>
                <th className="text-label text-left px-4 py-3">Room</th>
                <th className="text-label text-left px-4 py-3">Students</th>
                <th className="text-label text-left px-4 py-3">Invigilator</th>
                <th className="text-label text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { date: '20 Mar 2025', module: 'Strategic Management', level: 'L5', room: 'Hall A', students: 28, invigilator: 'Ms. Sana Mir', status: 'Scheduled' },
                { date: '22 Mar 2025', module: 'Financial Analysis', level: 'L4', room: 'Hall B', students: 32, invigilator: 'Mr. Tariq', status: 'Scheduled' },
                { date: '25 Mar 2025', module: 'Database Systems', level: 'L5', room: 'Lab C', students: 22, invigilator: 'Ms. Fatima', status: 'Scheduled' },
                { date: '28 Mar 2025', module: 'IAB Accounting L3', level: 'L3', room: 'Hall A', students: 35, invigilator: 'Ms. Sana Mir', status: 'Pending Approval' },
              ].map((e, i) => (
                <tr key={i} className="border-t border-border/50">
                  <td className="px-4 py-3 text-sm font-medium">{e.date}</td>
                  <td className="px-4 py-3 text-sm">{e.module}</td>
                  <td className="px-4 py-3 text-sm">{e.level}</td>
                  <td className="px-4 py-3 text-sm">{e.room}</td>
                  <td className="px-4 py-3 text-sm font-medium">{e.students}</td>
                  <td className="px-4 py-3 text-sm">{e.invigilator}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={e.status} variant={e.status === 'Scheduled' ? 'success' : 'warning'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Entry Flow + Incidents */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3">Exam Entry Verification Flow</h3>
          <div className="space-y-3">
            {[
              { step: '1', label: 'Student arrives at centre', icon: '🏫' },
              { step: '2', label: 'QR code or roster lookup', icon: '📱' },
              { step: '3', label: 'ID checked (CNIC/Passport)', icon: '🪪' },
              { step: '4', label: 'Face match verification', icon: '👤' },
              { step: '5', label: 'Optional fingerprint scan', icon: '🔏' },
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
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" /> Incident Log
          </h3>
          <div className="space-y-2">
            {[
              { date: '10 Mar', exam: 'Financial Analysis', student: 'Anonymous', incident: 'Unauthorized mobile phone detected', severity: 'High' },
              { date: '5 Mar', exam: 'Business Environment', student: 'Anonymous', incident: 'Student arrived 30 mins late — admitted with reduced time', severity: 'Medium' },
            ].map((inc, i) => (
              <div key={i} className="surface-data p-3 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{inc.exam}</span>
                  <StatusBadge status={inc.severity} variant={inc.severity === 'High' ? 'danger' : 'warning'} />
                </div>
                <p className="text-xs text-muted-foreground">{inc.incident}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{inc.date} · {inc.student}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
