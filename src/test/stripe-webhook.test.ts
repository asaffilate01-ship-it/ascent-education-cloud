// @vitest-environment node
import {webcrypto} from 'node:crypto';
import {beforeEach, afterEach, describe, expect, it, vi} from 'vitest';
import {verifyStripeSignature, stripeInvoicePayment} from '../../supabase/functions/_shared/stripe-webhook';
const fixture = vi.hoisted(() => ({rpc: vi.fn()}));
vi.mock('https://esm.sh/@supabase/supabase-js@2', () => ({createClient: () => fixture}));
let handler: (req: Request) => Promise<Response>;
let env: Record<string, string>;
const id = '50000000-0000-4000-8000-000000000001';
const event = () => ({id: 'evt_test1', livemode: false, type: 'payment_intent.succeeded', data: {object: {
  id: 'pi_test1', object: 'payment_intent', status: 'succeeded', amount: 10000, amount_received: 2500, currency: 'pkr',
  metadata: {invoice_id: id, tenant_id: id, paid_by: id},
}}});
async function signature(body: string, timestamp = Math.floor(Date.now() / 1000)) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode('test-secret'), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${body}`)));
  return `t=${timestamp},v1=${Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')}`;
}
async function call(value: unknown = event()) {
  const body = JSON.stringify(value);
  return handler(new Request('https://example.test', {method: 'POST', body, headers: {'stripe-signature': await signature(body)}}));
}
beforeEach(async () => {
  vi.stubGlobal('crypto', webcrypto);
  env = {STRIPE_WEBHOOK_SECRET: 'test-secret', STRIPE_WEBHOOK_MODE: 'test', SUPABASE_URL: 'https://example.test', SUPABASE_SERVICE_ROLE_KEY: 'fixture'};
  vi.stubGlobal('Deno', {env: {get: (key: string) => env[key]}, serve: (fn: typeof handler) => {handler = fn;}});
  fixture.rpc.mockReset().mockResolvedValue({data: {status: 'recorded'}, error: null});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  if (!handler) await import(/* @vite-ignore */ '../../supabase/functions/' + 'webhook-stripe/index.ts');
});
afterEach(() => {vi.unstubAllGlobals(); vi.restoreAllMocks();});
describe('Stripe raw event signatures', () => {
  it('accepts a valid signature during secret rotation', async () => {
    const body = JSON.stringify(event());
    expect(await verifyStripeSignature(body, `v1=${'0'.repeat(64)},${await signature(body)}`, 'test-secret')).toBe(true);
  });
  it('rejects altered payloads, missing signatures and malformed timestamps', async () => {
    const sig = await signature('body');
    for (const header of [null, 't=no,v1=bad', `${sig},t=123`, sig.replace('t=', 't=+'), 't=123']) {
      expect(await verifyStripeSignature('body', header, 'test-secret')).toBe(false);
    }
    expect(await verifyStripeSignature('modified', sig, 'test-secret')).toBe(false);
  });
  it.each([-301, 301])('rejects timestamps %s seconds outside the window', async delta => {
    const now = Date.now();
    expect(await verifyStripeSignature('body', await signature('body', Math.floor(now / 1000) + delta), 'test-secret', now)).toBe(false);
  });
});
describe('Stripe invoice webhook', () => {
  it('uses received amount and authenticated event metadata in one ledger RPC', async () => {
    expect((await call()).status).toBe(200);
    expect(fixture.rpc).toHaveBeenCalledExactlyOnceWith('record_unipathway_stripe_payment', {
      p_event_id: 'evt_test1', p_intent_id: 'pi_test1', p_invoice_id: id, p_tenant_id: id, p_student_id: id,
      p_amount_minor: 2500, p_currency: 'pkr', p_live: false,
    });
  });
  it('acknowledges a database-confirmed duplicate', async () => {
    fixture.rpc.mockResolvedValue({data: {status: 'duplicate'}, error: null});
    expect(await (await call()).json()).toEqual({received: true, status: 'duplicate'});
  });
  it('requires configured mode and rejects cross-mode events', async () => {
    env.STRIPE_WEBHOOK_MODE = '';
    expect((await call()).status).toBe(503);
    env.STRIPE_WEBHOOK_MODE = 'live';
    expect((await call()).status).toBe(400);
    expect(fixture.rpc).not.toHaveBeenCalled();
  });
  it('rejects unsupported methods and unsigned requests', async () => {
    expect((await handler(new Request('https://example.test'))).status).toBe(405);
    expect((await handler(new Request('https://example.test', {method: 'POST', body: '{}'}))).status).toBe(400);
    expect(fixture.rpc).not.toHaveBeenCalled();
  });
  it.each(['currency', 'amount', 'tenant', 'status'])('rejects invalid invoice %s', async field => {
    const value = event();
    if (field === 'currency') value.data.object.currency = 'usd';
    if (field === 'amount') value.data.object.amount_received = 1.5;
    if (field === 'tenant') value.data.object.metadata.tenant_id = 'invalid';
    if (field === 'status') value.data.object.status = 'processing';
    expect((await call(value)).status).toBe(400);
    expect(fixture.rpc).not.toHaveBeenCalled();
  });
  it('ignores unrelated provider events and subscription payments', async () => {
    const value = event(); value.type = 'payment_intent.payment_failed';
    expect(await (await call(value)).json()).toEqual({received: true, ignored: true});
    value.type = 'payment_intent.succeeded'; value.data.object.metadata.invoice_id = '';
    expect(stripeInvoicePayment(value)).toBeNull();
    expect(fixture.rpc).not.toHaveBeenCalled();
  });
  it.each(['error', 'empty', 'throw'])('preserves retry when the ledger returns %s', async kind => {
    if (kind === 'throw') fixture.rpc.mockRejectedValue(new Error('private detail'));
    else fixture.rpc.mockResolvedValue({data: null, error: kind === 'error' ? {code: '23514', message: 'private detail'} : null});
    const response = await call();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private detail');
  });
});
