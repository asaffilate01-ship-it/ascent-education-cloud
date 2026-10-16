import { useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { buildResidentialRotation, groupTripDays, residentialCapacity } from '@/lib/programmePriorities';
import { downloadText } from '@/lib/downloadText';
const rotation = buildResidentialRotation();
const time = (minute: number) => `${Math.floor(minute / 60).toString().padStart(2, '0')}:${(minute % 60).toString().padStart(2, '0')}`;
export default function ResidentialPlanner() {
  const [students, setStudents] = useState('1000');
  const [weeks, setWeeks] = useState('20');
  let result: ReturnType<typeof residentialCapacity> | undefined;
  let error = '';
  try { result = residentialCapacity(Number(students), Number(weeks)); } catch (e) { error = (e as Error).message; }
  return <DashboardLayout title="OTHM / Qualifi residential planning"><div className="space-y-6">
    <p>Planning draft: two 14-day visits per year, 36 teaching hours and up to 1½ private-support hours per visit. Remaining learning is online. All residential learners are 18 or over.</p>
    <div className="grid gap-4 sm:grid-cols-2"><label>Annual students<Input type="number" min="1" max="10000" value={students} onChange={e => setStudents(e.target.value)} /></label><label>Usable operating weeks after closures<Input type="number" min="1" max="52" value={weeks} onChange={e => setWeeks(e.target.value)} /></label></div>
    {error && <p role="alert">{error}</p>}
    {result && <section className="surface-card space-y-2 p-5" aria-live="polite"><h2 className="text-xl font-bold">{result.fits ? 'Fits the cohort capacity model' : 'More operating weeks are needed'}</h2><p>{result.cohorts} cohorts of up to 200 · {result.bookings} fortnight bookings · {result.requiredWeeks} required weeks</p><p>Capacity within entered weeks: {result.supportedStudents} students. Optional one-to-one help at full uptake: {result.annualSupportTutorHours.toLocaleString()} tutor-hours annually.</p><p className="text-sm text-muted-foreground">This does not reserve dates or confirm staffing. The mid-October–mid-April season must exclude Ramadan and Muharram, allow turnaround and fit both visits for every cohort.</p></section>}
    <section className="surface-card space-y-3 p-5"><h2 className="text-xl font-bold">Four groups of 50, separate accommodation</h2><p>50 main teaching places plus 10 separate private-support places. Up to 200 student beds off site, plus staff beds, with separate male and female sections. Staff duty allocations must include rest.</p><p>Trips are full days: one Lahore and one Islamabad trip per group per visit. One picnic and one evening outing across the year need separate allocations. Trip days below are teaching-free suggestions, not transport bookings.</p><div className="grid gap-3 sm:grid-cols-2">{['A','B','C','D'].map(group => { const days = groupTripDays(rotation, group); return <p key={group}>Group {group}: Lahore day {days[0]}, Islamabad day {days[1]}</p>; })}</div></section>
    <section className="space-y-3"><h2 className="text-xl font-bold">Repeatable fortnight teaching draft</h2><p className="text-sm text-muted-foreground">Ten 3½-hour sessions plus a one-hour top-up per group. Times are local centre time. Teaching durations exclude the changeover gaps shown; any breaks inside lessons require replacement teaching time. Private support requires its own tutor and appointment rota.</p><Button variant="outline" onClick={() => downloadText('residential-rotation-draft.csv', 'Day,Group,Activity,Start,End,Hours\n' + rotation.map(s => `${s.day},${s.group},${s.kind},${time(s.start)},${time(s.end)},${(s.end-s.start)/60}`).join('\n'), 'text/csv;charset=utf-8')}>Download teaching draft CSV</Button><div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Draft sessions for each 14-day visit</caption><thead><tr>{['Day','Group','Activity','Time'].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{rotation.map(s => <tr key={`${s.day}-${s.start}`} className="border-t"><td className="p-2">{s.day}</td><td className="p-2">{s.group}</td><td className="p-2">{s.kind}</td><td className="p-2">{time(s.start)}–{time(s.end)}</td></tr>)}</tbody></table></div></section>
    <div className="flex flex-wrap gap-3"><Button asChild variant="outline"><Link to="/residential">Recorded residential visits</Link></Button><Button asChild variant="outline"><Link to="/director/global-partners">University agreements and referrals</Link></Button></div>
  </div></DashboardLayout>;
}
