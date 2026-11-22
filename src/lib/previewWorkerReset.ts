// Older releases registered an offline worker that served a saved copy of the
// whole site. In the editor preview the dev server has no worker file, so the
// browser could never replace it and kept showing that old copy. Answering the
// worker addresses with a self-removing worker lets every stale copy clear itself.

export const PREVIEW_WORKER_PATHS = ['/sw.js', '/dev-sw.js', '/service-worker.js'];

export const PREVIEW_WORKER_RESET_SCRIPT = `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    windows.forEach((client) => client.navigate(client.url));
  })());
});
`;

type Req = { url?: string };
type Res = { statusCode: number; setHeader(name: string, value: string): void; end(body: string): void };

export function previewWorkerResetMiddleware(req: Req, res: Res, next: () => void) {
  const path = (req.url ?? '').split('?')[0];
  if (!PREVIEW_WORKER_PATHS.includes(path)) return next();
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Service-Worker-Allowed', '/');
  res.end(PREVIEW_WORKER_RESET_SCRIPT);
}

/** Dev-server only: production keeps the real offline worker built by the PWA plugin. */
export function previewWorkerReset() {
  return {
    name: 'unipathway-preview-worker-reset',
    apply: 'serve' as const,
    configureServer(server: { middlewares: { use(fn: typeof previewWorkerResetMiddleware): void } }) {
      server.middlewares.use(previewWorkerResetMiddleware);
    },
  };
}
