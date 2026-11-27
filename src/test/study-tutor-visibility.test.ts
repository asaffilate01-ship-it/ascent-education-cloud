import { describe, expect, it } from 'vitest';
import appSource from '../App.tsx?raw';

describe('temporary study tutor withdrawal', () => {
  it('does not mount or import the study tutor in the global application shell', () => {
    expect(appSource).not.toMatch(/<AIChatWidget(?:Lazy)?\b/);
    expect(appSource).not.toMatch(/import\s*\(\s*['"][^'"]*AIChatWidget['"]\s*\)/);
  });
});
