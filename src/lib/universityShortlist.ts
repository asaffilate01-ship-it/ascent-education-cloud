import {normalizeUniversityName,type ProgressionInstitution} from './universityProgressionDirectory';

export const MAX_SHORTLIST=3;
export function universityResearchKey(university:ProgressionInstitution){
 return university.country+':'+normalizeUniversityName(university.name);
}
export function resolveUniversityShortlist(all:readonly ProgressionInstitution[],keys:readonly string[]):ProgressionInstitution[]{
 const byKey=new Map(all.map(u=>[universityResearchKey(u),u]));
 return [...new Set(keys)].filter(key=>byKey.has(key)).slice(0,MAX_SHORTLIST).map(key=>byKey.get(key)!);
}
export function toggleUniversityShortlist(all:readonly ProgressionInstitution[],keys:readonly string[],key:string):string[]{
 const current=resolveUniversityShortlist(all,keys).map(universityResearchKey);
 if(current.includes(key))return current.filter(item=>item!==key);
 if(current.length>=MAX_SHORTLIST||!all.some(u=>universityResearchKey(u)===key))return current;
 return [...current,key];
}
