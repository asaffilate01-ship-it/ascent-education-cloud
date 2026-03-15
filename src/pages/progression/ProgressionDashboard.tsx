import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { GraduationCap, Building2, Award, CreditCard, Globe, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProgressionDashboard() {
  return (
    <DashboardLayout
      title="University Progression"
      subtitle="Partner universities, applications, offers, and commissions"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Eligible Students" value="48" icon={GraduationCap} />
        <StatCard label="Applications Sent" value="32" change="67% of eligible" changeType="positive" icon={FileText} />
        <StatCard label="Offers Received" value="24" change="75% success" changeType="positive" icon={Award} />
        <StatCard label="Commission Expected" value="£72,000" icon={CreditCard} />
      </div>

      {/* Partner Universities */}
      <div className="surface-card p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4">Partner Universities</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { uni: 'University of Sunderland', country: 'UK', programmes: 4, commission: '£3,000', students: 8 },
            { uni: 'Anglia Ruskin University', country: 'UK', programmes: 3, commission: '£2,500', students: 6 },
            { uni: 'University of Bolton', country: 'UK', programmes: 5, commission: '£2,000', students: 5 },
            { uni: 'University of Nicosia', country: 'Cyprus', programmes: 2, commission: '€2,000', students: 3 },
            { uni: 'Conestoga College', country: 'Canada', programmes: 3, commission: '$4,000', students: 4 },
            { uni: 'Charles Sturt University', country: 'Australia', programmes: 2, commission: '$3,500', students: 2 },
          ].map((u) => (
            <div key={u.uni} className="surface-data p-4 rounded-lg hover:shadow-surface-md transition-default cursor-pointer">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">{u.uni}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{u.country} · {u.programmes} programmes</p>
                </div>
                <Globe className="w-4 h-4 text-primary shrink-0" />
              </div>
              <div className="flex items-center justify-between mt-3 text-xs">
                <span className="text-muted-foreground">{u.students} students referred</span>
                <span className="font-medium text-primary">{u.commission}/student</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Applications Table */}
      <div className="surface-card p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4">Student Applications</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="surface-data">
                <th className="text-label text-left px-4 py-3">Student</th>
                <th className="text-label text-left px-4 py-3">University</th>
                <th className="text-label text-left px-4 py-3">Programme</th>
                <th className="text-label text-left px-4 py-3">Country</th>
                <th className="text-label text-left px-4 py-3">Status</th>
                <th className="text-label text-left px-4 py-3">Commission</th>
              </tr>
            </thead>
            <tbody>
              {[
                { student: 'Sara Ali', uni: 'University of Sunderland', prog: 'BA Business Top-Up', country: 'UK', status: 'Offer Received', commission: '£3,000' },
                { student: 'Omar Farooq', uni: 'Anglia Ruskin University', prog: 'BSc Computing Top-Up', country: 'UK', status: 'Application Sent', commission: '£2,500' },
                { student: 'Ayesha Khan', uni: 'Conestoga College', prog: 'Business Management', country: 'Canada', status: 'Offer Received', commission: '$4,000' },
                { student: 'Usman Tariq', uni: 'University of Bolton', prog: 'BA Accounting Top-Up', country: 'UK', status: 'Enrolled', commission: '£2,000' },
              ].map((a, i) => (
                <tr key={i} className="border-t border-border/50">
                  <td className="px-4 py-3 text-sm font-medium">{a.student}</td>
                  <td className="px-4 py-3 text-sm">{a.uni}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{a.prog}</td>
                  <td className="px-4 py-3 text-sm">{a.country}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={a.status}
                      variant={a.status === 'Enrolled' ? 'success' : a.status === 'Offer Received' ? 'info' : 'warning'}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-primary">{a.commission}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Country Commission Rates */}
      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold mb-3">Commission Rates by Country</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { country: 'United Kingdom', range: '£2,000 – £5,000', flag: '🇬🇧' },
            { country: 'Canada', range: '$3,000 – $4,000', flag: '🇨🇦' },
            { country: 'Australia', range: '$3,000 – $3,500', flag: '🇦🇺' },
            { country: 'USA', range: '$2,500 – $4,000', flag: '🇺🇸' },
          ].map((c) => (
            <div key={c.country} className="surface-data p-4 rounded-lg text-center">
              <p className="text-2xl mb-1">{c.flag}</p>
              <p className="text-sm font-semibold">{c.country}</p>
              <p className="text-xs text-primary font-medium mt-1">{c.range}</p>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
