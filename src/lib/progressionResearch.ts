import type {ProgressionCountry,ProgressionBody,ProgressionInstitution} from './universityProgressionDirectory';

export const researchSubjects=[
 {id:'business',label:'Business and management',matches:(text:string)=>/\b(?:business|management|mba|leadership|marketing|logistics)\b/i.test(text)},
 {id:'accounting',label:'Accounting and finance',matches:(text:string)=>/\b(?:accounting|accountancy|finance|financial)\b/i.test(text)},
 {id:'technology',label:'Technology and computing',matches:(text:string)=>/\b(?:computing|information technology|cyber(?:security| security)?|data science|robotics)\b/i.test(text)||/\b(?:IT|AI)\b/.test(text)},
 {id:'health',label:'Health and social care',matches:(text:string)=>/\b(?:health|healthcare|social care|OH&S)\b/i.test(text)},
 {id:'law',label:'Law',matches:(text:string)=>/\blaw\b/i.test(text)},
 {id:'education',label:'Education and childhood',matches:(text:string)=>/\b(?:education|childhood|early years)\b/i.test(text)},
 {id:'hospitality',label:'Hospitality and tourism',matches:(text:string)=>/\b(?:hospitality|tourism)\b/i.test(text)},
 {id:'engineering',label:'Engineering',matches:(text:string)=>/\bengineering\b/i.test(text)},
] as const;
export const researchLevels=['3','4','5','6','7','8'] as const;
export type ResearchFilters={country:'All'|ProgressionCountry;body:'All'|ProgressionBody;subject:string;level:string;search:string};
export const defaultResearchFilters:ResearchFilters={country:'All',body:'All',subject:'all',level:'all',search:''};

/** Match explicit level mentions, never infer qualification equivalence. */
export function levelSegments(route:string):{levels:string[];text:string}[]{
 const matches=[...route.matchAll(/\blevels?\s+([2-8](?:\s*(?:\/|,|and|&)\s*[2-8])*)\b/gi)];
 return matches.map((match,index)=>({
  levels:match[1].match(/[2-8]/g)??[],
  text:route.slice(match.index!,matches[index+1]?.index??route.length),
 }));
}
export function routeMentionsLevel(route:string,level:string):boolean{
 return researchLevels.some(v=>v===level)&&levelSegments(route).some(segment=>segment.levels.includes(level));
}
export function filterProgressionResearch(all:readonly ProgressionInstitution[],filters:ResearchFilters):ProgressionInstitution[]{
 const subject=researchSubjects.find(s=>s.id===filters.subject);
 if(filters.subject!=='all'&&!subject)return [];
 if(filters.level!=='all'&&!researchLevels.some(l=>l===filters.level))return [];
 const q=filters.search.trim().toLowerCase();
 return all.filter(u=>filters.country==='All'||u.country===filters.country).map(u=>({...u,records:u.records.filter(r=>{
  if(filters.body!=='All'&&r.body!==filters.body)return false;
  if(q&&![u.name,u.country,r.body,r.route].join(' ').toLowerCase().includes(q))return false;
  if(filters.level==='all')return !subject||subject.matches(r.route);
  return levelSegments(r.route).some(segment=>segment.levels.includes(filters.level)&&(!subject||subject.matches(segment.text)));
 })})).filter(u=>u.records.length>0);
}
