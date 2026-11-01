/**
 * Wellbeing enquiries are not clinical diagnoses and this is not a crisis service.
 * Server operations must independently validate these values, current role and centre.
 */
export const WELLBEING_CATEGORIES=[
 {value:'mental_health',label:'Mental health or emotional wellbeing'},
 {value:'academic',label:'Study, coursework or examination pressure'},
 {value:'personal',label:'Personal, family or relationship difficulties'},
 {value:'financial',label:'Financial hardship or essential needs'},
 {value:'bullying',label:'Bullying, harassment or feeling unsafe'},
 {value:'accessibility',label:'Disability, accessibility or study adjustments'},
 {value:'housing',label:'Accommodation or living circumstances'},
 {value:'other',label:'Something else'},
] as const;
export type WellbeingCategory=typeof WELLBEING_CATEGORIES[number]['value'];
export type WellbeingPrivacy='confidential'|'anonymous';
export type WellbeingUrgency='routine'|'soon';
export const WELLBEING_ENABLED=import.meta.env.VITE_UNIPATHWAY_WELLBEING_ENABLED==='true';
export const WELLBEING_ANONYMOUS_ENABLED=import.meta.env.VITE_UNIPATHWAY_ANONYMOUS_WELLBEING_ENABLED==='true';

export const isWellbeingCategory=(value:string):value is WellbeingCategory=>
 WELLBEING_CATEGORIES.some(category=>category.value===value);

export function validateWellbeingRequest(category:string,details:string,urgency:string){
 if(!isWellbeingCategory(category))return 'Choose the kind of help you need.';
 if(!['routine','soon'].includes(urgency))return 'Choose a valid support priority.';
 if(details.trim().length<10||details.length>3000)return 'Describe what support you need in 10–3,000 characters. Avoid adding another person’s private details.';
 return '';
}

/**
 * Anonymous reports have no student account reference, no case-status look-up,
 * and no direct reply. Do not submit them through an authenticated Supabase client.
 * Anonymous does NOT imply an untraceable network connection.
 */
export const ANONYMOUS_EXPLANATION='This form does not ask for your name or send your student account ID. Please do not identify yourself in the message if you want to stay anonymous. Network/security providers may still process technical information. We cannot reply to an anonymous report.';

export const CONFIDENTIAL_EXPLANATION='Your student account is linked to this private request so the authorised Welfare team can respond. It is not anonymous. It is not displayed to lecturers, other students, agents, parents or general office staff.';

export const CRISIS_NOTICE='This is not an emergency or 24-hour crisis service. If you or someone else is in immediate danger, contact local emergency services or a nearby emergency department now. For urgent mental-health support, contact a local qualified professional or trusted person rather than relying on this form.';
