import { describe, expect, it } from 'vitest';
import appSource from '../App.tsx?raw';
import sidebarSource from '../components/layout/DashboardSidebar.tsx?raw';
import { DASHBOARD_SHORTCUTS } from '../lib/dashboardNavigation';

const routes = new Set([...appSource.matchAll(/<Route\s+path="([^"]+)"/g)].map(match => match[1]));

describe('dashboard navigation coverage', () => {
  it('resolves literal sidebar destinations to declared application routes', () => {
    const destinations = [...sidebarSource.matchAll(/path:\s*['"](\/[^'"]+)['"]/g)].map(match => match[1]);
    expect(destinations.length).toBeGreaterThan(100);
    expect([...new Set(destinations)].filter(path => !routes.has(path))).toEqual([]);
  });
  it('resolves every role quick-access destination', () => {
    for (const [role, shortcuts] of Object.entries(DASHBOARD_SHORTCUTS)) {
      expect(shortcuts.length, role).toBeGreaterThan(0);
      for (const [label, path] of shortcuts) {
        expect(routes.has(path), role + ': ' + label + ' → ' + path).toBe(true);
      }
    }
  });
});
