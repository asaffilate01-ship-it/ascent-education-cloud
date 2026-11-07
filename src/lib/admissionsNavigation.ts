// Only these review desks consume an application ID. Other workflows keep
// their existing selection and authorisation contracts.
const reviewPaths = new Set([
  '/admissions/documents',
  '/admissions/eligibility',
  '/admissions/offers',
  '/admissions/allocations',
  '/director/allocations',
]);
const pipelinePaths = new Set(['/admissions', '/admissions/applications', '/director/admissions']);
const pipelineFilters = ['q', 'stage', 'source', 'destination', 'view'] as const;

export function admissionsPath(path: string, search: string, applicationId?: string | null) {
  if (!reviewPaths.has(path) && !pipelinePaths.has(path)) return path;

  const current = new URLSearchParams(search);
  const next = new URLSearchParams();
  for (const key of pipelineFilters) {
    const value = current.get(key);
    if (value) next.set(key, value);
  }
  if (reviewPaths.has(path)) {
    const application = applicationId === undefined ? current.get('application') : applicationId;
    if (application) next.set('application', application);
    const reviewSearch = current.get('reviewSearch');
    if (reviewSearch) next.set('reviewSearch', reviewSearch);
  }
  const query = next.toString();
  return query ? `${path}?${query}` : path;
}

export function applicationReviewAction(stage: string) {
  if (stage === 'enrolled') return {path: '/admissions/allocations', label: 'Review allocation'};
  if (['conditional_offer', 'unconditional_offer', 'deposit_paid'].includes(stage)) {
    return {path: '/admissions/offers', label: 'Review offer'};
  }
  if (['qualified', 'under_review'].includes(stage)) {
    return {path: '/admissions/eligibility', label: 'Review eligibility'};
  }
  return {
    path: '/admissions/documents',
    label: ['lost', 'deferred'].includes(stage) ? 'Review application' : 'Review documents',
  };
}
