import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { socialUrl, whatsappDisplay, whatsappUrl } from '../lib/publicContact';

describe('public contact destinations', () => {
  it('hides missing, malformed and placeholder WhatsApp numbers', () => {
    for (const number of [undefined, '', '923000000000', '923001234567', '123', 'abc923001234567', '03001234567']) expect(whatsappUrl(number)).toBe('');
  });
  it('publishes the UniPathway WhatsApp number in the committed production settings', () => {
    const env = readFileSync(resolve(__dirname, '../../.env.production'), 'utf8');
    const configured = /VITE_PUBLIC_WHATSAPP_NUMBER="?([^"\n]+)"?/.exec(env)?.[1];
    expect(configured).toBeTruthy();
    expect(whatsappUrl(configured)).toContain('https://wa.me/923090737000');
    expect(whatsappDisplay(configured)).toBe('+92 309 073 7000');
  });
  it('normalizes an international number and encodes the draft message', () => {
    expect(whatsappUrl('+44 (7700) 900123', 'Courses & fees?')).toBe('https://wa.me/447700900123?text=Courses%20%26%20fees%3F');
  });
  it('accepts only HTTPS links on the intended platform', () => {
    expect(socialUrl('https://www.instagram.com/example', ['instagram.com'])).toBe('https://www.instagram.com/example');
    for (const url of ['', 'javascript:alert(1)', 'http://instagram.com/example', 'https://instagram.com.evil.test/example', 'https://user:pass@instagram.com/example']) expect(socialUrl(url, ['instagram.com'])).toBe('');
  });
});
