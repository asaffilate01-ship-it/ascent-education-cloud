import { NAV_CONFIG } from '@/components/layout/DashboardSidebar';
import type { UserRole } from '@/types/platform';
/** Only the active, assigned role is searched; switching roles is explicit. */
export function searchNavigation(role?: UserRole) {
  const seen = new Set<string>();
  return (role ? NAV_CONFIG[role] || [] : []).flatMap(section => section.items
    .filter(item => { if (seen.has(item.path)) return false; seen.add(item.path); return true; })
    .map(item => ({ ...item, section: section.title || 'Workspace' })));
}
