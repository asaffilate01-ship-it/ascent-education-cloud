import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
describe('UniPathway bootstrap offline fallbacks',()=>{
 it('attempts the first-party app before trusting navigator.onLine for offline mode',()=>{
  const main=readFileSync('src/main.tsx','utf8');
  expect(main).toContain('loadApp();');
  expect(main).not.toContain('if(!navigator.onLine)showOffline();');
  expect(main).toContain('if(!navigator.onLine){showOffline();return;}');
  expect(main).toContain("import('./App.tsx')");
 });
});
