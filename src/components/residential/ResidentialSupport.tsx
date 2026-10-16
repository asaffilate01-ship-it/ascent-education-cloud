import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { datedTeaching, type CalendarVisit } from '@/lib/residentialCalendar';
import { parseSupportPlan, teachingKey, validateSupport, type SupportAppointment, type TeachingAllocation } from '@/lib/residentialSupport';
import { downloadText } from '@/lib/downloadText';
export default function ResidentialSupport({visit}:{visit:CalendarVisit}) {
  const [appointments,setAppointments]=useState<SupportAppointment[]>([]);
  const [allocations,setAllocations]=useState<TeachingAllocation[]>([]);
  const [error,setError]=useState('');
  const sessions=datedTeaching(visit);
  const errors=validateSupport(visit,appointments,allocations);
  const time=(m:number)=>`${Math.floor(m/60).toString().padStart(2,'0')}:${(m%60).toString().padStart(2,'0')}`;
  return <section className="space-y-4 rounded border p-4"><h3 className="text-xl font-bold">Private support and teaching staff — visit {visit.visit}</h3>
    <p className="text-sm text-muted-foreground">Use consistent tutor IDs and anonymous student numbers 1–{visit.students}. Students 1–50 are group A, 51–100 B, 101–150 C and 151–200 D. Each student can receive up to 90 minutes per visit. This draft checks clashes against the teaching and trip schedule shown above.</p>
    <details><summary className="cursor-pointer font-semibold">Allocate teaching tutors ({allocations.length}/{sessions.length})</summary><div className="mt-3 grid gap-2 md:grid-cols-2">{sessions.map(s=><label key={teachingKey(s)} className="text-sm">{s.date} {time(s.start)} · group {s.group}<Input aria-label={`Tutor ${s.date} ${time(s.start)}`} maxLength={60} value={allocations.find(a=>a.session===teachingKey(s))?.tutor||''} onChange={e=>setAllocations(old=>[...old.filter(a=>a.session!==teachingKey(s)),...(e.target.value.trim()?[{session:teachingKey(s),tutor:e.target.value}]:[])])}/></label>)}</div></details>
    <form className="grid gap-3 sm:grid-cols-3" onSubmit={e=>{
      e.preventDefault();const form=e.currentTarget,f=new FormData(form),parts=String(f.get('time')).split(':').map(Number);
      const next:SupportAppointment={id:crypto.randomUUID(),student:Number(f.get('student')),tutor:String(f.get('tutor')).trim(),date:String(f.get('date')),start:parts[0]*60+parts[1],minutes:Number(f.get('minutes')) as 30|60|90};
      const issues=validateSupport(visit,[...appointments,next],allocations);
      if(issues.length){setError(issues.join(' '));return;}setAppointments(old=>[...old,next]);setError('');form.reset();
    }}>
      <label>Student number<Input name="student" type="number" min="1" max={visit.students} required/></label>
      <label>Support tutor ID<Input name="tutor" maxLength={60} required/></label>
      <label>Support date<Input name="date" type="date" min={visit.start} max={visit.end} required/></label>
      <label>Support starts<Input name="time" type="time" min="08:00" max="19:30" required/></label>
      <label>Minutes<select name="minutes" className="w-full rounded border p-2"><option value="30">30</option><option value="60">60</option><option value="90">90</option></select></label>
      <Button type="submit">Add support appointment</Button>
    </form>
    {(error||errors.length>0)&&<p role="alert">{error||errors.join(' ')}</p>}
    <p>{appointments.length} appointments · {appointments.reduce((n,a)=>n+a.minutes,0)/60} tutor-hours allocated · {visit.students*1.5} tutor-hours if every student requests the full allowance.</p>
    <p className="text-sm text-muted-foreground">Ten simultaneous support places maximum, one tutor per student. Tutor checks cover only allocations entered here. Availability, breaks, overnight duties and other workloads still need staff review. Changing visits discards unsaved support edits; save a draft file first.</p>
    <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={errors.length>0} onClick={()=>downloadText(`support-cohort-${visit.cohort}-visit-${visit.visit}.json`,JSON.stringify({version:1,visit,appointments,allocations},null,2),'application/json')}>Save support draft</Button>
      <label>Open support draft<Input type="file" accept=".json,application/json" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(file.size>150000)throw Error('Plan exceeds 150 KB.');const p=parseSupportPlan(await file.text(),visit);setAppointments(p.appointments);setAllocations(p.allocations);setError('');}catch(err){setError((err as Error).message);}}}/></label></div>
    {appointments.length>0&&<div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption>Draft one-to-one appointments, Pakistan local time</caption><thead><tr>{['Student','Tutor','Date','Time','Action'].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{[...appointments].sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start).map(a=><tr key={a.id} className="border-t"><td className="p-2">{a.student}</td><td>{a.tutor}</td><td>{a.date}</td><td>{time(a.start)}–{time(a.start+a.minutes)}</td><td><Button variant="ghost" aria-label={`Remove appointment ${a.student} ${a.date} ${time(a.start)}`} onClick={()=>{setAppointments(old=>old.filter(x=>x.id!==a.id));setError('');}}>Remove</Button></td></tr>)}</tbody></table></div>}
  </section>;
}
