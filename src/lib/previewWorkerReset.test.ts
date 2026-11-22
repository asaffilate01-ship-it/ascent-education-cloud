import { describe, expect, it, vi } from 'vitest';
import { previewWorkerReset, previewWorkerResetMiddleware } from './previewWorkerReset';

function run(url: string) {
  const res = { statusCode: 0, headers: {} as Record<string, string>, body: '', setHeader(n: string, v: string) { this.headers[n] = v; }, end(b: string) { this.body = b; } };
  const next = vi.fn();
  previewWorkerResetMiddleware({ url }, res, next);
  return { res, next };
}

describe('preview worker reset', () => {
  it.each(['/sw.js', '/dev-sw.js?dev-sw', '/service-worker.js'])('answers %s with a self-removing worker', url => {
    const { res, next } = run(url);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.headers['Cache-Control']).toBe('no-store');
    expect(res.body).toContain('self.registration.unregister()');
    expect(res.body).toContain('caches.delete');
  });
  it('leaves every other address to the app', () => {
    expect(run('/').next).toHaveBeenCalled();
    expect(run('/index').next).toHaveBeenCalled();
  });
  it('only runs on the preview dev server, never in the published build', () => {
    expect(previewWorkerReset().apply).toBe('serve');
  });
});
