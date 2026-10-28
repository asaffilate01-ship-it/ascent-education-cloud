// @vitest-environment node
import { readFileSync } from 'node:fs';
const css = readFileSync('src/index.css', 'utf8');
import { describe, expect, it } from 'vitest';

const luminance = (hsl: number[]) => {
  const [h, saturation, lightness] = hsl;
  const s = saturation / 100;
  const l = lightness / 100;
  const a = s * Math.min(l, 1 - l);
  const channels = [0, 8, 4].map(n => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  });
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
};

describe('shared semantic text contrast', () => {
  for (const selector of [':root', '.dark']) {
    const block = css.slice(css.indexOf(`${selector} {`)).split('}')[0];
    const token = (name: string) => {
      const value = block.match(new RegExp(`--${name}:\\s*([\\d.]+) ([\\d.]+)% ([\\d.]+)%`));
      if (!value) throw new Error(`Missing ${selector} ${name}`);
      return luminance(value.slice(1).map(Number));
    };
    for (const [fg, bg] of [
      ['warning', 'card'], ['success', 'card'],
      ['primary-foreground', 'primary'],
      ['warning-foreground', 'warning'], ['success-foreground', 'success'],
    ]) {
      it(`${selector}: ${fg} on ${bg} meets AA normal text`, () => {
        const values = [token(fg), token(bg)].sort((a, b) => b - a);
        expect((values[0] + .05) / (values[1] + .05)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
