export const scholarshipSources=[
 {id:'uk',country:'United Kingdom',provider:'British Council · Study UK',title:'Scholarships and funding',url:'https://study-uk.britishcouncil.org/scholarships-funding',detail:'Explore funding schemes and check each university’s current criteria.'},
 {id:'germany',country:'Germany',provider:'DAAD',title:'Scholarship programmes',url:'https://www.daad.de/en/studying-in-germany/scholarships/daad-scholarships/',detail:'Research funding calls by qualification, field and applicant country.'},
 {id:'italy',country:'Italy',provider:'Italian Ministry of Foreign Affairs',title:'Scholarships for international students',url:'https://www.esteri.it/en/servizi-opportunita/opportunita/borse-di-studio/per-cittadini-stranieri/',detail:'Review government and university funding information for the applicable academic year.'},
 {id:'canada',country:'Canada',provider:'EduCanada',title:'International scholarships',url:'https://www.educanada.ca/scholarships-bourses/index.aspx?lang=eng',detail:'Check award conditions and whether a Canadian institution must nominate applicants.'},
 {id:'usa',country:'United States',provider:'EducationUSA',title:'Undergraduate financial planning',url:'https://educationusa.state.gov/your-5-steps-us-study/finance-your-studies/undergraduate',detail:'Research institutional financial aid and the cost of an undergraduate degree.'},
 {id:'australia',country:'Australia',provider:'Study Australia',title:'Scholarships and bursaries',url:'https://www.studyaustralia.gov.au/en/plan-your-studies/scholarships',detail:'Explore government, research and institution-specific funding.'},
 {id:'europe',country:'Europe / multiple countries',provider:'European Commission · Erasmus+',title:'Erasmus Mundus Joint Masters',url:'https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/erasmus-mundus-joint-masters',detail:'Check participating master’s programmes, current calls and consortium application instructions.'},
] as const;
export const scholarshipSourcesReviewed='2026-11-25';
export function scholarshipResearchDestination(value:unknown):string{
 if(typeof value!=='string')return 'all';
 if(scholarshipSources.some(s=>s.id===value))return value;
 return ['france','spain','netherlands'].includes(value)?'europe':'all';
}
export function scholarshipResearchUrl(destination?:string){
 const country=scholarshipResearchDestination(destination);
 return '/scholarships'+(country==='all'?'':'?'+new URLSearchParams({funding:country}).toString())+'#international-scholarship-research';
}
export const deadlineKinds=['Scholarship','University application','Document submission','Language test','Other'] as const;
export type DeadlineKind=typeof deadlineKinds[number];
export type DeadlineDraft={title:string;kind:DeadlineKind;date:string;source:string};
export type DeadlineRecord=DeadlineDraft&{id:string;completed:boolean};
export function validateDeadline(draft:DeadlineDraft):DeadlineDraft|null{
 const title=draft.title.trim(),source=draft.source.trim();
 if(!title||title.length>120||!deadlineKinds.includes(draft.kind)||source.length>300)return null;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)||draft.date.startsWith('0000-'))return null;
 const date=new Date(draft.date+'T00:00:00Z');
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==draft.date)return null;
 if(source){try{const parsed=new URL(source);if(parsed.protocol!=='https:'||parsed.username||parsed.password)return null;}catch{return null;}}
 return {title,kind:draft.kind,date:draft.date,source};
}
export function calendarDateInPakistan(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const part=(type:string)=>parts.find(p=>p.type===type)?.value??'';
 return [part('year'),part('month'),part('day')].join('-');
}
export function deadlineStatus(date:string,today:string,completed:boolean){
 if(completed)return 'completed';
 if(date<today)return 'past';
 if(date===today)return 'today';
 const days=(Date.parse(date+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000;
 return days<=7?'next-seven-days':'upcoming';
}
export function sortDeadlines(records:readonly DeadlineRecord[]):DeadlineRecord[]{
 return [...records].sort((a,b)=>Number(a.completed)-Number(b.completed)||a.date.localeCompare(b.date)||a.title.localeCompare(b.title));
}
