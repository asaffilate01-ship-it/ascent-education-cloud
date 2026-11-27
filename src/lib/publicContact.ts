/** Public contact settings. Empty values have no outbound link; never invent profile URLs. */
export function socialUrl(value: unknown, hosts: string[]): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && !url.username && !url.password && hosts.includes(url.hostname.replace(/^www\./, '')) ? url.href : '';
  } catch { return ''; }
}

export function whatsappUrl(value: unknown, message = 'Hello UniPathway, I would like advice about courses and online or in-class learning.'): string {
  if (typeof value !== 'string' || !/^\+?[\d\s()-]+$/.test(value)) return '';
  const number = value.replace(/\D/g, '');
  if (!/^[1-9]\d{7,14}$/.test(number) || ['923000000000', '923001234567'].includes(number)) return '';
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export const SOCIAL_LINKS = {
  facebook: socialUrl(import.meta.env.VITE_PUBLIC_FACEBOOK_URL, ['facebook.com']),
  instagram: socialUrl(import.meta.env.VITE_PUBLIC_INSTAGRAM_URL, ['instagram.com']),
  twitter: socialUrl(import.meta.env.VITE_PUBLIC_X_URL, ['x.com', 'twitter.com']),
  linkedin: socialUrl(import.meta.env.VITE_PUBLIC_LINKEDIN_URL, ['linkedin.com']),
  youtube: socialUrl(import.meta.env.VITE_PUBLIC_YOUTUBE_URL, ['youtube.com', 'youtu.be']),
  tiktok: '', // Icon only until a destination is requested.
  google: socialUrl(import.meta.env.VITE_PUBLIC_GOOGLE_URL, ['google.com', 'maps.google.com', 'maps.app.goo.gl', 'g.page']),
  whatsapp: whatsappUrl(import.meta.env.VITE_PUBLIC_WHATSAPP_NUMBER),
};

/** Friendly dialling text for the configured WhatsApp number; empty when unconfigured. */
export function whatsappDisplay(value: unknown): string {
  const href = whatsappUrl(value);
  if (!href) return '';
  const digits = href.slice('https://wa.me/'.length).split('?')[0];
  if (digits.startsWith('92') && digits.length === 12) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return `+${digits}`;
}

export const WHATSAPP_DISPLAY = whatsappDisplay(import.meta.env.VITE_PUBLIC_WHATSAPP_NUMBER);
export const waRecruitmentUrl=whatsappUrl(import.meta.env.VITE_PUBLIC_WHATSAPP_NUMBER,'Hello UniPathway recruitment, I would like to enquire about part-time teaching opportunities.');
