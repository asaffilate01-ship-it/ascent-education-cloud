export const SITE_ACCESS_KEY = 'up_site_access';
export const SITE_ACCESS_CODE = 'unipathway2026';

/** Path prefixes that sit behind the promo password gate. */
export const GATED_PREFIXES = [
  '/tenant',
  '/about',
  '/courses',
  '/contact',
  '/germany',
  '/uk',
  '/pathways',
  '/apply',
  '/blog',
  '/verify',
];

export function isSiteUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(SITE_ACCESS_KEY) === 'granted';
}

export function unlockSite(code: string): boolean {
  if (code.trim().toLowerCase() !== SITE_ACCESS_CODE) return false;
  window.localStorage.setItem(SITE_ACCESS_KEY, 'granted');
  return true;
}

export function isGatedPath(pathname: string): boolean {
  return GATED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
