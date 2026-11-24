import {matchesLocalSearch} from '@/lib/localSearch';
import type {WorkspaceGroup} from '@/lib/workspaceCatalog';

/** Local, role-scoped directory search. No search terms leave the component. */
export function workspaceServiceMatches(label:string,description:string,area:string,query:string):boolean {
 return matchesLocalSearch(`${area} ${label} ${description}`,query);
}
/** Curated entries take precedence, matching service areas are merged, each path occurs once. */
export function combineWorkspaceGroups(curated:readonly WorkspaceGroup[],extra:readonly WorkspaceGroup[]):WorkspaceGroup[]{
 const groups=new Map<string,WorkspaceGroup>();
 const seen=new Set<string>();
 for(const group of [...curated,...extra]){
  for(const item of group.items){
   if(seen.has(item.to))continue;
   seen.add(item.to);
   const key=group.title.trim().toLocaleLowerCase();
   const target=groups.get(key)||{title:group.title,items:[]};
   target.items.push({...item});groups.set(key,target);
  }
 }
 return [...groups.values()];
}
