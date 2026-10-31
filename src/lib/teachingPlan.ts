/** Scheduled plans use same-day start/end times; invalid intervals contribute no duration. */
export function teachingHours(rows:{start_time:string;end_time:string}[]){
 const minutes=(value:string)=>{if(!/^\d{2}:\d{2}(:\d{2})?$/.test(value))return NaN;const [h,m]=value.split(':').map(Number);return h<24&&m<60?h*60+m:NaN;};
 return rows.reduce((sum,r)=>{const duration=minutes(r.end_time)-minutes(r.start_time);return sum+(Number.isFinite(duration)&&duration>0?duration/60:0);},0);
}

type Slot={day_of_week:number;start_time:string;end_time:string;effective_from:string;effective_until:string|null};
/** Conservative warning: recurrence patterns still need human review. */
export function planOverlaps(rows:Slot[]){
 let overlaps=0;
 for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
  const a=rows[i],b=rows[j];
  if(a.day_of_week===b.day_of_week&&a.start_time<b.end_time&&b.start_time<a.end_time&&a.effective_from<=(b.effective_until||'9999-12-31')&&b.effective_from<=(a.effective_until||'9999-12-31'))overlaps++;
 }
 return overlaps;
}

/** Order-independent module search; only applied to an already-authorised module list. */
export function matchesTeachingModuleSearch(title: string, code: string | null | undefined, search: string) {
 const terms=search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
 const haystack=[title,code||''].join(' ').toLocaleLowerCase();
 return terms.every(term=>haystack.includes(term));
}
/** ISO weekday 1=Monday through 7=Sunday, using the centre's local date. */
export function pakistanTeachingDayOfWeek(at=new Date()): number {
 const day=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Karachi',weekday:'long'}).format(at);
 return ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].indexOf(day)+1;
}
