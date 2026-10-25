/** Public contact settings. Empty values stay hidden; never invent profile URLs. */
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
  tiktok: socialUrl(import.meta.env.VITE_PUBLIC_TIKTOK_URL, ['tiktok.com']) || 'https://www.tiktok.com/@unipathway.pk',
  whatsapp: whatsappUrl(import.meta.env.VITE_PUBLIC_WHATSAPP_NUMBER),
};
