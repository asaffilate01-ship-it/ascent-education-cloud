import {matchesLocalSearch} from '@/lib/localSearch';

/**
 * Small, local, role-scoped service-directory search.
 * No learner data, navigation history or search terms leave this component.
 */
export function workspaceServiceMatches(label:string,description:string,area:string,query:string):boolean {
 return matchesLocalSearch(`${area} ${label} ${description}`,query);
}
