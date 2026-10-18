import { describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false }),
  ROLE_HOME: {},
}));
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BOTTOM_NAV, PUBLIC_BOTTOM_NAV, getBottomNavItems, isPublicMobilePath, isMobileTabActive } from '@/components/MobileBottomNav';
import type { UserRole } from '@/types/platform';

const roles: UserRole[] = [
  'superadmin','centre_director','admissions_admin','lecturer','assessor',
  'programme_leader','iqa_officer','awarding_body_eqa','welfare_officer',
  'exams_officer','finance_officer','marketing_officer','agent','student',
  'parent_guardian','university_partner','employer_partner',
];

describe('UniPathway native mobile navigation', () => {
  it("shows Lovable's five public tabs, including application and study abroad", () => {
    expect(PUBLIC_BOTTOM_NAV.map(item => item.path)).toEqual(['/', '/study', '/apply', '/pathways', '/login']);
    expect(getBottomNavItems(null, '/study')).toBe(PUBLIC_BOTTOM_NAV);
    expect(getBottomNavItems('student', '/pathways')).toBe(PUBLIC_BOTTOM_NAV);
  });

  it('treats public university pages as public but not tenant administration', () => {
    expect(isPublicMobilePath('/tenant/unipathway/pathways')).toBe(true);
    expect(isPublicMobilePath('/tenant/unipathway/germany')).toBe(true);
    expect(isPublicMobilePath('/tenant/unipathway/admin')).toBe(false);
    expect(isPublicMobilePath('/director/finance')).toBe(false);
    expect(isMobileTabActive('/pathways', '/tenant/unipathway/pathways')).toBe(true);
    expect(isMobileTabActive('/pathways', '/germany')).toBe(true);
    expect(isMobileTabActive('/contact', '/tenant/unipathway/contact')).toBe(true);
    expect(isMobileTabActive('/', '/tenant/unipathway')).toBe(true);
  });

  it('does not show student navigation to unrelated protected roles', () => {
    expect(Object.keys(BOTTOM_NAV).sort()).toEqual([...roles].sort());
    for (const role of roles) {
      expect(getBottomNavItems(role, '/student')[0]?.path).toBe(BOTTOM_NAV[role][0].path);
      expect(BOTTOM_NAV[role].length).toBeGreaterThanOrEqual(3);
      expect(BOTTOM_NAV[role].length).toBeLessThanOrEqual(5);
    }
    expect(BOTTOM_NAV.admissions_admin.map(item => item.path)).not.toContain('/director/students');
    expect(BOTTOM_NAV.programme_leader.map(item => item.path)).not.toContain('/director/programmes');
  });

  it('requires every public, role and sidebar destination to have a defined application route', () => {
    const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const sidebar = readFileSync(resolve(process.cwd(), 'src/components/layout/DashboardSidebar.tsx'), 'utf8');
    const appRoutes = new Set([...app.matchAll(/<Route\s+path="([^"]+)"/g)].map(match => match[1]));
    const sidebarPaths = [...sidebar.matchAll(/path:\s*'([^']+)'/g)].map(match => match[1]);
    const tabPaths = [...PUBLIC_BOTTOM_NAV, ...roles.flatMap(role => BOTTOM_NAV[role])].map(item => item.path);
    const unmatched = [...new Set([...sidebarPaths, ...tabPaths])].filter(path => !appRoutes.has(path));
    expect(unmatched).toEqual([]);
  });
});
