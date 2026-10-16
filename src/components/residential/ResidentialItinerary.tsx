import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { downloadText } from '@/lib/downloadText';
import type { CalendarDraft } from '@/lib/residentialCalendar';
import type { VisitOperations } from '@/lib/residentialWorkspace';
import { itineraryTime, residentialItinerary, residentialItineraryCsv } from '@/lib/residentialItinerary';

export default function ResidentialItinerary({ calendar, operations }: { calendar: CalendarDraft; operations: Record<string, VisitOperations> }) {
  const [cohort, setCohort] = useState(1);
  const [student, setStudent] = useState(1);
  let plan: ReturnType<typeof residentialItinerary> | undefined;
  let error = '';
  try { plan = residentialItinerary(calendar, operations, cohort, student); } catch (e) { error = (e as Error).message; }
  return <section className="space-y-3 rounded border p-4">
    <h3 className="text-xl font-bold">Individual annual itinerary</h3>
    <p className="text-sm text-muted-foreground">Staff draft using anonymous learner numbers within each cohort. Numbers must refer to the same learner across both visits. This does not link to student accounts or publish a timetable. All times are Pakistan local.</p>
    <div className="grid gap-3 sm:grid-cols-2"><label>Itinerary cohort<Input type="number" min={1} max={Math.ceil(calendar.students / 200)} value={Number.isNaN(cohort) ? '' : cohort} onChange={e => setCohort(e.target.valueAsNumber)} /></label><label>Itinerary learner number<Input type="number" min={1} max={Math.min(200, calendar.students - (cohort - 1) * 200)} value={Number.isNaN(student) ? '' : student} onChange={e => setStudent(e.target.valueAsNumber)} /></label></div>
    {error && <p role="alert">{error}</p>}
    {plan && <><p>Group {plan.group} · {plan.teachingMinutes / 60} / 72 annual teaching hours scheduled · {plan.supportMinutes / 60} / 3 optional support hours allocated</p>
      <p className="text-sm">Picnic and evening outing still need allocation. Unassigned tutors or rooms are shown below; accommodation and transport remain unconfirmed.</p>
      {plan.blockers.length > 0 && <p role="alert">{plan.blockers.join(' ')}</p>}
      <Button variant="outline" disabled={plan.blockers.length > 0} onClick={() => downloadText(`draft-cohort-${cohort}-learner-${student}.csv`, residentialItineraryCsv(calendar, operations, cohort, student), 'text/csv;charset=utf-8')}>Export learner draft itinerary</Button>
      <ul>{plan.stays.map(s => <li key={s.visit}>Visit {s.visit}: {s.start}–{s.end} · Site: {s.site} · Room: {s.room}</li>)}</ul>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption>Draft activities for this learner only</caption><thead><tr>{['Visit', 'Date', 'Activity', 'Time', 'Tutor'].map(h => <th className="p-2" key={h}>{h}</th>)}</tr></thead><tbody>{plan.activities.map((a, i) => <tr className="border-t" key={i}><td className="p-2">{a.visit}</td><td>{a.date}</td><td>{a.activity}</td><td>{itineraryTime(a.start)}{a.end !== null && `–${itineraryTime(a.end)}`}</td><td>{a.tutor}</td></tr>)}</tbody></table></div>
    </>}
  </section>;
}
