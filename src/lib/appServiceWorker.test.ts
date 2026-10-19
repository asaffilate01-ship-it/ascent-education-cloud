import { describe, expect, it } from 'vitest';
import { canRegisterAppWorker } from './appServiceWorker';

const live = { production: true, framed: false, hostname: 'ascent-education-cloud.lovable.app', search: '' };

describe('app worker preview safety', () => {
  it.each(['id-preview--example.lovable.app', 'preview--example.lovable.app', 'lovableproject.com', 'a.lovableproject.com', 'lovableproject-dev.com', 'a.lovableproject-dev.com', 'beta.lovable.dev', 'a.beta.lovable.dev'])('does not register on %s', hostname => {
    expect(canRegisterAppWorker({ ...live, hostname })).toBe(false);
  });
  it('does not register in development', () => {
    expect(canRegisterAppWorker({ ...live, production: false })).toBe(false);
  });
  it('does not register inside the editor frame', () => {
    expect(canRegisterAppWorker({ ...live, framed: true })).toBe(false);
  });
  it('honours the offline kill switch', () => {
    expect(canRegisterAppWorker({ ...live, search: '?sw=off' })).toBe(false);
  });
  it('keeps offline support on the published site', () => {
    expect(canRegisterAppWorker(live)).toBe(true);
  });
});