import { Button } from '@/components/ui/button';
import { downloadText } from '@/lib/downloadText';
import type { CalendarDraft } from '@/lib/residentialCalendar';
import type { VisitOperations } from '@/lib/residentialWorkspace';
import { reviewResidentialWorkspace,residentialReviewCsv } from '@/lib/residentialReview';
export default function ResidentialReview({calendar,operations,onSelect}:{calendar:CalendarDraft;operations:Record<string,VisitOperations>;onSelect:(key:string)=>void}){
 const review=reviewResidentialWorkspace(calendar,operations);
 return <section className="space-y-3 rounded border p-4"><h3 className="text-xl font-bold">Residential allocation overview</h3>
 <p>{review.visits.length} scheduled visits · {review.unscheduled.length} unscheduled · {review.obsolete.length} outdated plans · closures {review.closuresReviewed?'reviewed':'awaiting review'}</p>
 <p className="text-sm text-muted-foreground">Counts reflect this draft only. Optional support is not a completion requirement. Complete allocations do not confirm staff availability, property bookings, transport, programme approval or student publication.</p>
 <Button variant="outline" onClick={()=>downloadText('residential-allocation-review.csv',residentialReviewCsv(calendar,operations),'text/csv;charset=utf-8')}>Export allocation overview</Button>
 <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption>Every scheduled visit, including visits with no allocations entered</caption><thead><tr>{['Cohort / visit','Missing teaching tutors','Students without rooms','Optional support','Status','Action'].map(h=><th className="p-2" key={h}>{h}</th>)}</tr></thead><tbody>{review.visits.map(r=><tr key={`${r.visit.cohort}-${r.visit.visit}`} className="border-t"><td className="p-2">{r.visit.cohort} / {r.visit.visit}</td><td>{r.missingTutors}</td><td>{r.unallocatedStudents}</td><td>{r.supportStudents} students · {r.supportMinutes/60} hours</td><td>{r.status}{r.errors.length>0&&<p>{r.errors.join(' ')}</p>}</td><td><Button variant="ghost" aria-label={`Review cohort ${r.visit.cohort} visit ${r.visit.visit}`} onClick={()=>onSelect(`${r.visit.cohort}-${r.visit.visit}`)}>Review</Button></td></tr>)}</tbody></table></div></section>;
}
