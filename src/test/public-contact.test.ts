import { describe, expect, it } from 'vitest';
import { socialUrl, whatsappUrl } from '../lib/publicContact';

describe('public contact destinations', () => {
  it('hides missing, malformed and placeholder WhatsApp numbers', () => {
    for (const number of [undefined, '', '923000000000', '923001234567', '123', 'abc923001234567', '03001234567']) expect(whatsappUrl(number)).toBe('');
  });
  it('normalizes an international number and encodes the draft message', () => {
    expect(whatsappUrl('+44 (7700) 900123', 'Courses & fees?')).toBe('https://wa.me/447700900123?text=Courses%20%26%20fees%3F');
  });
  it('accepts only HTTPS links on the intended platform', () => {
    expect(socialUrl('https://www.instagram.com/example', ['instagram.com'])).toBe('https://www.instagram.com/example');
    for (const url of ['', 'javascript:alert(1)', 'http://instagram.com/example', 'https://instagram.com.evil.test/example', 'https://user:pass@instagram.com/example']) expect(socialUrl(url, ['instagram.com'])).toBe('');
  });
});
