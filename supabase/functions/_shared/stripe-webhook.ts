// Snapshot event signatures use the exact raw request bytes, not re-serialized JSON.
export async function verifyStripeSignature(body: string, header: string | null, secret: string, now = Date.now()) {
  if (!header) return false;
  const parts = header.split(',').map(value => value.trim());
  const timestamps = parts.filter(value => value.startsWith('t='));
  if (timestamps.length !== 1 || !/^t=\d+$/.test(timestamps[0])) return false;
  const timestamp = Number(timestamps[0].slice(2));
  if (!Number.isSafeInteger(timestamp) || Math.abs(Math.floor(now / 1000) - timestamp) > 300) return false;
  const signatures = parts.filter(value => /^v1=[a-f0-9]{64}$/i.test(value)).map(value => value.slice(3));
  if (!signatures.length) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['verify']);
  for (const signature of signatures) {
    const bytes = Uint8Array.from(signature.match(/../g)!, pair => parseInt(pair, 16));
    if (await crypto.subtle.verify('HMAC', key, bytes, encoder.encode(`${timestamp}.${body}`))) return true;
  }
  return false;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function stripeInvoicePayment(event: Record<string, any>) {
  const pi = event.data?.object;
  if (typeof event.id !== 'string' || !/^evt_[A-Za-z0-9]+$/.test(event.id) || typeof event.livemode !== 'boolean') throw new Error('Invalid event');
  if (event.type !== 'payment_intent.succeeded') return null;
  // A shared Stripe account can also deliver unrelated subscription payments.
  if (!pi?.metadata?.invoice_id) return null;
  if (pi.object !== 'payment_intent' || pi.status !== 'succeeded' || !/^pi_[A-Za-z0-9]+$/.test(pi.id) ||
      !Number.isSafeInteger(pi.amount_received) || pi.amount_received <= 0 || pi.currency !== 'pkr' ||
      !uuid.test(pi.metadata.invoice_id) || !uuid.test(pi.metadata.tenant_id) || !uuid.test(pi.metadata.paid_by)) throw new Error('Invalid invoice payment');
  return {p_event_id: event.id, p_intent_id: pi.id, p_invoice_id: pi.metadata.invoice_id, p_tenant_id: pi.metadata.tenant_id,
    p_student_id: pi.metadata.paid_by, p_amount_minor: pi.amount_received, p_currency: pi.currency, p_live: event.livemode};
}
