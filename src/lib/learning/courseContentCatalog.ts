/**
 * Planning taxonomy only. Names are not endorsements, centre approvals, licences,
 * exam-entry authorisations or equivalence decisions. Real programme eligibility
 * comes exclusively from the live centre programme/module records.
 */
export type CourseBoard={
 id:string;label:string;family:'UK diplomas'|'International schools'|'Pakistan school boards'|'Pakistan vocational';
 databaseLabels:readonly string[];examples:string;planningNote:string;
};
export const COURSE_BOARDS:readonly CourseBoard[]=[
 {id:'othm',label:'OTHM',family:'UK diplomas',databaseLabels:['OTHM'],examples:'Level 3–7 diplomas, subject to approved qualification and centre scope',planningNote:'Match the current unit specification, learning outcomes and assessment guidance.'},
 {id:'qualifi',label:'Qualifi',family:'UK diplomas',databaseLabels:['QUALIFI'],examples:'Level 3–7 diplomas and regulated or non-regulated pathways as applicable',planningNote:'Track qualification number, approved unit version and required evidence.'},
 {id:'athe',label:'ATHE',family:'UK diplomas',databaseLabels:['ATHE'],examples:'Business, computing and other available qualification pathways',planningNote:'Centre and qualification approval must be verified independently.'},
 {id:'iab',label:'IAB',family:'UK diplomas',databaseLabels:['IAB'],examples:'Bookkeeping, accounting and finance training',planningNote:'Keep learning resources and approved assessment requirements distinct.'},
 {id:'pearson-btec',label:'Pearson BTEC',family:'UK diplomas',databaseLabels:['PEARSON_BTEC','BTEC'],examples:'Vocational diploma unit materials and practical assessments',planningNote:'Use the correct qualification specification and licensed resources.'},
 {id:'pearson-edexcel',label:'Pearson Edexcel',family:'International schools',databaseLabels:['PEARSON_EDEXCEL','EDEXCEL'],examples:'International GCSE, International AS/A levels',planningNote:'Select subject, specification code and examination series.'},
 {id:'cambridge',label:'Cambridge International',family:'International schools',databaseLabels:['CAMBRIDGE'],examples:'IGCSE, O Level, International AS & A Level',planningNote:'Choose the syllabus code, component and examination year.'},
 {id:'fbise',label:'FBISE',family:'Pakistan school boards',databaseLabels:['FBISE'],examples:'SSC 9–10 and HSSC 11–12 subject preparation',planningNote:'Use the applicable subject syllabus, textbook scheme and exam session.'},
 {id:'bise-rawalpindi',label:'BISE Rawalpindi',family:'Pakistan school boards',databaseLabels:['BISE_RAWALPINDI'],examples:'Punjab Matric and Intermediate preparation',planningNote:'Do not combine another Punjab board’s papers and session as identical.'},
 {id:'bise-lahore',label:'BISE Lahore',family:'Pakistan school boards',databaseLabels:['BISE_LAHORE'],examples:'Punjab SSC / HSSC preparation',planningNote:'Track the particular board and annual or supplementary session.'},
 {id:'bise-other',label:'Other Pakistan BISE boards',family:'Pakistan school boards',databaseLabels:['BISE_OTHER'],examples:'Selected Punjab, Sindh, KP, Balochistan and AJK boards',planningNote:'Record the precise board and syllabus; this label is a planning group, not an exam authority.'},
 {id:'aku-eb',label:'AKU-EB',family:'Pakistan school boards',databaseLabels:['AKU_EB'],examples:'Aga Khan University Examination Board SSC / HSSC',planningNote:'Keep board-specific learning outcomes and assessment format.'},
 {id:'navttc',label:'NAVTTC / NVQF',family:'Pakistan vocational',databaseLabels:['NAVTTC'],examples:'Competency-based vocational training and practical evidence',planningNote:'Verify the qualification, assessment authority and applicable framework before enrolment.'},
];
export type ProgrammeRow={id:string;tenant_id:string;title:string;level:string;awarding_body:string;status:string;course_number?:string|null};
export type ModuleRow={id:string;tenant_id:string;programme_id:string;title:string;lecturer_id:string|null};
export type MaterialRow={id:string;tenant_id:string;module_id:string;publication_status:string};
export function catalogueBoardFor(programme:ProgrammeRow):CourseBoard|undefined{
 const code=programme.awarding_body.toUpperCase().trim();
 return COURSE_BOARDS.find(board=>board.databaseLabels.some(b=>b===code));
}
export function eligibleCourseModules(programmes:readonly ProgrammeRow[],modules:readonly ModuleRow[],tenant:string,account:string,role:string){
 const allowed=new Set(programmes.filter(p=>p.tenant_id===tenant).map(p=>p.id));
 return modules.filter(m=>m.tenant_id===tenant&&allowed.has(m.programme_id)&&
   (role!=='lecturer'||m.lecturer_id===account));
}
export function moduleMaterialCoverage(modules:readonly ModuleRow[],materials:readonly MaterialRow[],tenant:string){
 const allowed=new Set(modules.filter(m=>m.tenant_id===tenant).map(m=>m.id));
 const scoped=materials.filter(m=>m.tenant_id===tenant&&allowed.has(m.module_id));
 return {modules:allowed.size,drafts:scoped.filter(m=>m.publication_status==='draft').length,
  published:scoped.filter(m=>m.publication_status==='published').length};
}
export function courseContentMatches(label:string,query:string):boolean{
 const terms=query.normalize('NFKC').trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean).slice(0,12);
 const text=label.normalize('NFKC').toLocaleLowerCase();
 return terms.every(term=>text.includes(term));
}
