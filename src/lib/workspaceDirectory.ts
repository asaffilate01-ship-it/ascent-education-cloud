/**
 * Small, local, role-scoped service-directory search.
 * No learner data, navigation history or search terms leave this component.
 */
export function workspaceServiceMatches(label:string,description:string,area:string,query:string):boolean {
 const terms=query.normalize('NFKC').trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean).slice(0,12);
 if(!terms.length)return true;
 const haystack=`${area} ${label} ${description}`.normalize('NFKC').toLocaleLowerCase();
 return terms.every(term=>haystack.includes(term));
}
