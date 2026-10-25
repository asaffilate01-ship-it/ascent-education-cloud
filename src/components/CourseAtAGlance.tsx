import {Link} from 'react-router-dom';
type Props = {course:string; compact?:boolean; entry?:string; duration?:string; delivery?:string; fees?:string; intake?:string};
export default function CourseAtAGlance({course, compact=false, entry='Admissions will check your previous study and starting level.', duration='Confirm the duration for your selected course and study pace.', delivery='Online and in-class options; confirm availability for your chosen course.', fees='Request the full fee breakdown before enrolling.', intake='Ask admissions for the next available start date.'}:Props) {
 return <section aria-label={`${course}: course summary`} className="rounded-xl border bg-card p-5">
  <h2 className="text-lg font-bold">Before you enrol</h2>
  <dl className={compact ? "mt-4 space-y-3" : "mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>{[['Entry requirements',entry],['Duration',duration],['Delivery',delivery],['Fees',fees],['Next intake',intake]].map(([label,value])=><div key={label}><dt className="text-sm font-semibold">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{value}</dd></div>)}</dl>
  <Link className="mt-4 inline-flex min-h-11 items-center font-semibold underline" to={`/contact?${new URLSearchParams({course})}`}>Ask about {course} →</Link>
 </section>;
}
