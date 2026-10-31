/** Pure, server-side report authorisation. Never use UI-selected roles as authority. */
export const REPORT_ROLES={
 students:['centre_director','superadmin'],
 invoices:['finance_officer','centre_director','superadmin'],
 attendance:['centre_director','superadmin','programme_leader','exams_officer'],
 applications:['admissions_admin','centre_director','superadmin'],
} as const;
export type ReportType=keyof typeof REPORT_ROLES;
export function reportTypeAllowed(
 report:ReportType, roleRecords:readonly {role:string;tenant_id:string|null}[],
 effectiveTenant:string,
){
 const allowedRoles:readonly string[]=REPORT_ROLES[report];
 return !!effectiveTenant&&roleRecords.some(r=>
  allowedRoles.includes(r.role)&&(r.role==='superadmin'||r.tenant_id===effectiveTenant));
}
/** Neutralise spreadsheet formula interpretation in downloaded CSV fields. */
export function safeCsvValue(value:unknown):string{
 const raw=value===null||value===undefined?'':String(value);
 const safe=/^[=+\-@\t\r]/.test(raw)?"'"+raw:raw;
 return safe.includes(',')||safe.includes('"')||safe.includes('\n')
  ?'"'+safe.replace(/"/g,'""')+'"':safe;
}
