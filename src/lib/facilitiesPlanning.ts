export const facilitiesCategories = ['fire_alarm','extinguisher','emergency_exit','emergency_lighting','signage','evacuation_plan','ups','solar','access_control','security_post'] as const;
export type FacilitiesCategory = typeof facilitiesCategories[number];
export type InspectionDraft = { category: FacilitiesCategory; assetCode: string; location: string; dueDate: string };
export function validCalendarDate(value: string): boolean {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
 const date = new Date(value + 'T00:00:00Z');
 return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}
export function validateInspectionDraft(draft: InspectionDraft): InspectionDraft {
 const assetCode = draft.assetCode.trim(), location = draft.location.trim();
 if (!facilitiesCategories.includes(draft.category) || !assetCode || assetCode.length > 80 || !location || location.length > 160 || !validCalendarDate(draft.dueDate)) throw new Error('Enter a valid equipment category, asset reference, location and planned inspection date.');
 return {...draft, assetCode, location};
}
export function inspectionTiming(dueDate: string, today: string): 'overdue'|'due-today'|'upcoming'|'unknown' {
 if (!validCalendarDate(dueDate) || !validCalendarDate(today)) return 'unknown';
 return dueDate < today ? 'overdue' : dueDate === today ? 'due-today' : 'upcoming';
}
export function pakistanCalendarDate(now = new Date()): string {
 const parts = new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const read = (type: string) => parts.find(p=>p.type===type)?.value ?? '';
 return [read('year'),read('month'),read('day')].join('-');
}
