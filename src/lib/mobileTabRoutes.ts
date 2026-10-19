/** Pure route helpers shared by public and authenticated mobile tab bars. */
export const isPublicMobilePath = (path: string) =>
  path === '/' || /^\/(?:study|tech-academy|finance-academy|beauty-aesthetics|qualifications|funded-courses|german-preparation|careers|student-support|courses|tuition|employer-learning|ielts-preparation|pathways|germany|uk|usa|canada|australia|pakistan|about|contact|blog|privacy|terms|cookies|disclaimer|login|register|forgot-password|reset-password|apply)(?:\/|$)/.test(path) ||
  /^\/tenant\/[a-z0-9-]+(?:\/(?:courses|about|contact|germany|uk|pathways|apply)(?:\/|$))?$/.test(path);

export const isMobileTabActive = (target: string, current: string): boolean => {
  if (target === '/') return current === '/' || /^\/tenant\/[^/]+\/?$/.test(current);
  if (target === '/pathways') return /^\/(?:pathways|uk|germany|usa|canada|australia|pakistan)(?:\/|$)/.test(current) ||
    /^\/tenant\/[^/]+\/(?:pathways|uk|germany)(?:\/|$)/.test(current);
  if (target === '/contact') return /^\/tenant\/[^/]+\/contact(?:\/|$)/.test(current) || current === '/contact';
  return current === target || current.startsWith(target + '/');
};
