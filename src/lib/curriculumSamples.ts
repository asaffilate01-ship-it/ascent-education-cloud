/** Exact unit titles from the cited awarding-body listings. These records are a
 * curriculum-mapping starting point, NOT lessons, assessment briefs or proof
 * that UniPathway has permission to teach an awarded qualification.
 */
export type OfficialUnit = {reference:string|null;title:string;credits:number;guidedHours:number|null};
export type CurriculumSample = {
  id:string;body:'OTHM'|'Qualifi';qualificationTitle:string;
  qualificationCode:string|null;level:number;credits:number;
  sourceUrl:string;specificationUrl:string;units:OfficialUnit[];
  verificationStatus:'current_source_review_required';
};
export const curriculumSamples:CurriculumSample[]=[
  {
    id:'othm-l4-business',
    body:'OTHM',
    qualificationTitle:'OTHM Level 4 Diploma in Business Management',
    qualificationCode:null,
    level:4,
    credits:120,
    sourceUrl:'https://othm.org.uk/qualification/othm-level-4-diploma-in-business-management',
    specificationUrl:'https://othm.org.uk/qualification/othm-level-4-diploma-in-business-management',
    verificationStatus:'current_source_review_required',
    units:[
      {reference:null,title:'Academic Writing and Research Skills',credits:20,guidedHours:null},
      {reference:null,title:'Business Operations',credits:20,guidedHours:null},
      {reference:null,title:'Communication in Business',credits:20,guidedHours:null},
      {reference:null,title:'Finance and Accounting',credits:20,guidedHours:null},
      {reference:null,title:'Leading and Managing Teams',credits:20,guidedHours:null},
      {reference:null,title:'Operating in a Global Context',credits:20,guidedHours:null},
    ],
  },
  {
    id:'qualifi-l4-ai',
    body:'Qualifi',
    qualificationTitle:'Qualifi Level 4 Diploma in Artificial Intelligence',
    qualificationCode:'610/3934/2',
    level:4,credits:120,
    sourceUrl:'https://qualifi.net/qualifi-level-4-diploma-in-artificial-intelligence/',
    specificationUrl:'https://qualifi.net/wp-content/uploads/2024/03/Qualifi-Level-4-and-Level-5-Diplomas-in-AI-March-2024.pdf',
    verificationStatus:'current_source_review_required',
    units:[
      {reference:'R/651/0599',title:'Introduction to Artificial Intelligence and Applications',credits:20,guidedHours:120},
      {reference:'F/651/0600',title:'Mathematical Foundations for Machine Learning',credits:20,guidedHours:120},
      {reference:'H/651/0601',title:'Data Science Using Python',credits:20,guidedHours:120},
      {reference:'J/651/0602',title:'Big Data Management',credits:20,guidedHours:120},
      {reference:'K/651/0603',title:'Introduction to Deep Learning',credits:20,guidedHours:120},
      {reference:'L/651/0604',title:'Artificial Intelligence Ethics',credits:20,guidedHours:120},
    ],
  },
];
export function sampleHasSufficientUnitReferences(sample:CurriculumSample):boolean {
  return sample.units.length>0 && sample.units.every(u=>Boolean(u.reference?.trim())) &&
    new Set(sample.units.map(u=>u.reference)).size===sample.units.length;
}
