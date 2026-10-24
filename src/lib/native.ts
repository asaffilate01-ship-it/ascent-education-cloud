import { Capacitor } from '@capacitor/core';
export const isNativeApp = () => Capacitor.isNativePlatform();
export const nativePlatform = () => Capacitor.getPlatform();
export const APP_DEEP_LINK_SCHEME = 'unipathway://';
export const NATIVE_AUTH_CALLBACK = 'unipathway://auth/callback';
export function nativeAuthCode(raw: string): { code: string; recovery: boolean } | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'unipathway:' || url.hostname !== 'auth' || url.pathname !== '/callback' || url.username || url.password || url.port || url.hash || url.searchParams.has('error') || url.searchParams.getAll('code').length !== 1) return null;
    const code = url.searchParams.get('code');
    if (!code || code.length > 2048) return null;
    return { code, recovery: url.searchParams.get('flow') === 'recovery' };
  } catch { return null; }
}
