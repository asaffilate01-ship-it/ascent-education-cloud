import { describe, expect, it } from 'vitest';
import appSource from '../App.tsx?raw';
import authSource from '../contexts/AuthContext.tsx?raw';

describe('role dashboard coverage', () => {
  it('maps every configured role home to exactly one declared route', () => {
    const block = authSource.match(/export const ROLE_HOME:[\s\S]*?\n};/)?.[0];
    expect(block).toBeTruthy();
    const homes = [...(block ?? '').matchAll(/(\w+):\s*'([^']+)'/g)];
    expect(homes.length).toBeGreaterThanOrEqual(21);
    const routes = [...appSource.matchAll(/<Route\s+path="([^"]+)"/g)].map(match => match[1]);
    for (const [, role, home] of homes) {
      expect(routes.filter(route => route === home), role + ' → ' + home).toHaveLength(1);
    }
  });
});
