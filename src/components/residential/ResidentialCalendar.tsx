import ResidentialSupport from './ResidentialSupport';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { downloadText } from '@/lib/downloadText';
import { calendarCsv, calendarDraftSchema, datedTeaching, datedTrips, initialCalendarDraft, parseCalendarDraft, scheduleResidentialCalendar, type CalendarDraft } from '@/lib/residentialCalendar';

export default function ResidentialCalendar() {
  const [draft, setDraft] = useState<CalendarDraft>(initialCalendarDraft);
  const [fileError, setFileError] = useState('');
  const [selected, setSelected] = useState('1-1');
  const validation = calendarDraftSchema.safeParse(draft);
  const result = validation.success ? scheduleResidentialCalendar(validation.data) : null;
  const active = result?.visits.find(v => `${v.cohort}-${v.visit}` === selected) || result?.visits[0];
  const change = <K extends keyof CalendarDraft>(key: K, value: CalendarDraft[K]) => setDraft(old => ({ ...old, [key]: value, ...(key !== 'closuresReviewed' ? { closuresReviewed: false } : {}) }));
  const updateClosure = (index: number, field: 'label'|'start'|'end', value: string) => change('closures', draft.closures.map((c,i) => i === index ? { ...c, [field]: value } : c));
  const time = (minute: number) => `${Math.floor(minute/60).toString().padStart(2,'0')}:${(minute%60).toString().padStart(2,'0')}`;
  return <section className="surface-card space-y-5 p-5" aria-labelledby="calendar-heading">
    <h2 id="calendar-heading" className="text-2xl font-bold">Dated residential calendar</h2>
    <p className="text-sm text-muted-foreground">Draft planning for one centre. September 2027 intake dates are initial assumptions. Enter locally confirmed Ramadan, Muharram and other closures before assessing fit. All dates and teaching times are Pakistan local time.</p>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label>Calendar students<Input type="number" min="1" max="10000" value={Number.isNaN(draft.students) ? '' : draft.students} onChange={e => change('students',e.target.valueAsNumber)} /></label>
      <label>Season starts<Input type="date" value={draft.seasonStart} onChange={e => change('seasonStart',e.target.value)} /></label>
      <label>Season ends<Input type="date" value={draft.seasonEnd} onChange={e => change('seasonEnd',e.target.value)} /></label>
      <label>Turnaround days between bookings<Input type="number" min="0" max="14" value={Number.isNaN(draft.turnaroundDays) ? '' : draft.turnaroundDays} onChange={e => change('turnaroundDays',e.target.valueAsNumber)} /></label>
      <label>Minimum clear days between each cohort’s visits<Input type="number" min="1" max="180" value={Number.isNaN(draft.minimumVisitGapDays) ? '' : draft.minimumVisitGapDays} onChange={e => change('minimumVisitGapDays',e.target.valueAsNumber)} /></label>
    </div>
    <fieldset className="space-y-3"><legend className="font-semibold">Closure dates (both endpoints included)</legend>
      {draft.closures.map((closure,index) => <div key={index} className="grid gap-2 sm:grid-cols-4">
        <label>Closure {index+1} name<Input value={closure.label} onChange={e => updateClosure(index,'label',e.target.value)} /></label>
        <label>Closure {index+1} starts<Input type="date" value={closure.start} onChange={e => updateClosure(index,'start',e.target.value)} /></label>
        <label>Closure {index+1} ends<Input type="date" value={closure.end} onChange={e => updateClosure(index,'end',e.target.value)} /></label>
        <Button variant="outline" aria-label={`Remove closure ${index+1}`} onClick={() => change('closures',draft.closures.filter((_,i) => i !== index))}>Remove</Button>
      </div>)}
      <Button variant="outline" disabled={draft.closures.length >= 50} onClick={() => change('closures',[...draft.closures,{label:'',start:'',end:''}])}>Add closure</Button>
    </fieldset>
    <label className="flex items-start gap-2"><input type="checkbox" checked={draft.closuresReviewed} onChange={e => change('closuresReviewed',e.target.checked)} /><span>I have reviewed Ramadan, Muharram and other closure dates for this season.</span></label>
    {!validation.success && <p role="alert">{validation.error.issues[0].message}</p>}
    {result && <div aria-live="polite" className="rounded border p-4 space-y-2">
      <h3 className="font-bold">{!draft.closuresReviewed ? 'Provisional: closures have not been reviewed' : result.fits ? 'All requested visits fit this draft calendar' : 'This draft leaves visits unscheduled'}</h3>
      <p>{result.usableDays} available days after closures · {result.visits.length} scheduled fortnight visits · {result.missing.length} unscheduled</p>
      <p className="text-sm text-muted-foreground">First-fit scheduling puts all first visits before second visits and reserves turnaround gaps. An unscheduled result is not proof that no alternative arrangement exists. A fit does not confirm tutors, qualification approval, beds or transport.</p>
      {result.missing.length > 0 && <p>Unscheduled: {result.missing.map(v => `cohort ${v.cohort}, visit ${v.visit}`).join('; ')}</p>}
    </div>}
    <div className="flex flex-wrap items-end gap-3">
      <Button variant="outline" disabled={!validation.success} onClick={() => downloadText('residential-calendar-draft.json',JSON.stringify(draft,null,2),'application/json')}>Save draft file</Button>
      <Button disabled={!result || !draft.closuresReviewed || !result.fits} onClick={() => downloadText('residential-dated-teaching-and-trips.csv',calendarCsv(draft),'text/csv;charset=utf-8')}>Export dated teaching and trips</Button>
      <label>Open draft file<Input type="file" accept=".json,application/json" onChange={async e => {
        const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
        setFileError('');
        try {
          if (file.size > 100000) throw new Error('Draft file is too large. Maximum 100 KB.');
          const next = parseCalendarDraft(await file.text());
          setDraft({ ...next, closuresReviewed: false }); setSelected('1-1');
        } catch { setFileError('Could not open this draft. Use a valid version 1 calendar JSON file under 100 KB. Your current plan has not changed.'); }
      }} /></label>
    </div>
    <p className="text-sm text-muted-foreground">Draft files save your planning inputs for reopening; they do not save to the centre database or publish visits. Imported drafts require closure review again. Complete, reviewed calendars can be exported as dated CSV.</p>
    {fileError && <p role="alert">{fileError}</p>}
    {result && result.visits.length > 0 && <><div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption>Draft visits — separate accommodation; four teaching groups of up to 50</caption><thead><tr>{['Cohort','Visit','Students','Start','End','Details'].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{result.visits.map(v => <tr key={`${v.cohort}-${v.visit}`} className="border-t"><td className="p-2">{v.cohort}</td><td>{v.visit}</td><td>{v.students}</td><td>{v.start}</td><td>{v.end}</td><td><Button variant="ghost" aria-label={`View cohort ${v.cohort} visit ${v.visit}`} onClick={() => setSelected(`${v.cohort}-${v.visit}`)}>View</Button></td></tr>)}</tbody></table></div>
      {active && <ResidentialSupport key={`${active.cohort}-${active.visit}-${active.start}-${active.end}-${active.students}`} visit={active} />}
      {active && <div className="space-y-3"><h3 className="font-bold">Cohort {active.cohort}, visit {active.visit}: dated activities</h3><p>Optional private help at full uptake: {active.students * 1.5} tutor-hours for this visit. Support appointments, the annual picnic and evening outing still need separate allocations.</p><ul className="grid gap-2 sm:grid-cols-2">{datedTrips(active).map(t => <li key={`${t.group}-${t.date}`}>Group {t.group}: {t.destination}, {t.date} · {t.students} students · full day</li>)}</ul><div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption>Teaching — Pakistan local time</caption><thead><tr>{['Date','Group','Activity','Time','Students'].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{datedTeaching(active).map(s => <tr className="border-t" key={`${s.date}-${s.start}`}><td className="p-2">{s.date}</td><td>{s.group}</td><td>{s.kind}</td><td>{time(s.start)}–{time(s.end)}</td><td>{s.students}</td></tr>)}</tbody></table></div></div>}
    </>}
  </section>;
}
