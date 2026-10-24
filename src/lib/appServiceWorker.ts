import { isNativeApp } from './native';
type WorkerContext = {
  production: boolean;
  framed: boolean;
  hostname: string;
  search: string;
};

export function canRegisterAppWorker(context: WorkerContext): boolean {
  const host = context.hostname.toLowerCase();
  const preview = host.startsWith('id-preview--') || host.startsWith('preview--') ||
    ['lovableproject.com', 'lovableproject-dev.com', 'beta.lovable.dev'].some(
      zone => host === zone || host.endsWith(`.${zone}`),
    );
  return context.production && !context.framed && !preview &&
    new URLSearchParams(context.search).get('sw') !== 'off';
}

export async function initialiseAppWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const allowed = canRegisterAppWorker({
      production: import.meta.env.PROD && !isNativeApp(),
      framed: window.self !== window.top,
      hostname: window.location.hostname,
      search: window.location.search,
    });
    if (!allowed) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        const worker = registration.active ?? registration.waiting ?? registration.installing;
        if (!worker || new URL(worker.scriptURL).pathname !== '/sw.js') continue;
        await registration.unregister();
        if ('caches' in window) {
          const names = await caches.keys();
          await Promise.allSettled(names.filter(name =>
            /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name) &&
            name.endsWith(registration.scope),
          ).map(name => caches.delete(name)));
        }
      }
      return;
    }
    const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
    await registration.update();
  } catch (error) {
    // Offline support must never stop the page from opening.
    console.warn('App offline support unavailable', error);
  }
}