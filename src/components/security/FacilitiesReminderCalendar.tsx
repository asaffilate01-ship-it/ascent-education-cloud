import {useMemo,useState} from 'react';
import {Button} from '@/components/ui/button';
import {pakistanCalendarDate} from '@/lib/facilitiesPlanning';
import type {MaintenanceRow} from '@/lib/facilitiesMaintenance';
import {buildFacilitiesReminderCalendar,facilitiesReminderDates,reminderHorizons,type ReminderHorizon} from '@/lib/facilitiesReminderCalendar';

export default function FacilitiesReminderCalendar({rows}:{rows:readonly MaintenanceRow[]}){
 const [horizon,setHorizon]=useState<ReminderHorizon>(30);
 const [alarm,setAlarm]=useState<0|1|7>(1);
 const [notice,setNotice]=useState('');
 const [error,setError]=useState('');
 const today=pakistanCalendarDate();
 const dates=useMemo(()=>{try{return facilitiesReminderDates(rows,today,horizon);}catch{return null;}},[rows,today,horizon]);
 const total=dates?.reduce((n,row)=>n+row.count,0)??0;
 function download(){
  setError('');setNotice('');
  let url:string|null=null;
  try{
   const calendar=buildFacilitiesReminderCalendar(rows,horizon,alarm,crypto.randomUUID());
   url=URL.createObjectURL(new Blob([calendar],{type:'text/calendar;charset=utf-8'}));
   const link=document.createElement('a');
   link.href=url;link.download='unipathway-inspection-review.ics';
   document.body.appendChild(link);
   try{link.click();}finally{link.remove();}
   setNotice('Calendar file prepared. Import it into your approved calendar; delivery of reminders depends on that application.');
  }catch{setError('Calendar export could not be prepared. Refresh the verified register and try again.');}
  finally{if(url){const release=url;window.setTimeout(()=>URL.revokeObjectURL(release),1000);}}
 }
 return <details className="mt-4 min-w-0 rounded-xl border p-4">
  <summary className="min-h-11 cursor-pointer font-semibold">Inspection calendar and reminders</summary>
  <p className="mt-2 text-sm text-muted-foreground">Export generic all-day review dates from the verified centre register. No asset codes, locations, defects, staff details or centre identifiers are included in the file. Overdue and unscheduled inspections remain in the on-screen review queue.</p>
  <div className="mt-3 grid gap-3 sm:grid-cols-2">
   <label className="block min-w-0 text-sm font-medium">Planning horizon<select className="mt-1 min-h-11 w-full rounded-lg border bg-background px-3" value={horizon} onChange={e=>{setHorizon(Number(e.target.value) as ReminderHorizon);setNotice('');setError('');}}>{reminderHorizons.map(days=><option key={days} value={days}>Today through the next {days} days</option>)}</select></label>
   <label className="block min-w-0 text-sm font-medium">Calendar alarm<select className="mt-1 min-h-11 w-full rounded-lg border bg-background px-3" value={alarm} onChange={e=>{setAlarm(Number(e.target.value) as 0|1|7);setNotice('');setError('');}}><option value={0}>No alarm</option><option value={1}>One day before</option><option value={7}>Seven days before</option></select></label>
  </div>
  {dates===null?<p role="alert" className="mt-3 text-sm text-destructive">Inspection dates could not be verified for export.</p>:<p className="mt-3 text-sm">{total} scheduled inspections across {dates.length} calendar dates.</p>}
  <Button type="button" variant="outline" className="mt-3 min-h-11" disabled={!dates?.length} onClick={download}>Download inspection calendar (.ics)</Button>
  {notice&&<p role="status" className="mt-2 text-sm">{notice}</p>}{error&&<p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
  <p className="mt-3 text-xs text-muted-foreground">This is a manual export, not a live calendar subscription, inspection booking or automatic notification service. Repeated imports may duplicate events; remove old reminders and re-export after dates change. Alarms may already be past for imminent inspections. Use the current register as the source of truth.</p>
 </details>;
}
