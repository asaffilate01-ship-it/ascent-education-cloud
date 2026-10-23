import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {verifyStripeSignature, stripeInvoicePayment} from '../_shared/stripe-webhook.ts';

Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}});
  if (req.method !== 'POST') return json({error: 'Use POST'}, 405);
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const mode = Deno.env.get('STRIPE_WEBHOOK_MODE');
  const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret || !url || !key || !['test', 'live'].includes(mode || '')) return json({error: 'Webhook configuration unavailable'}, 503);
  let body: string;
  try {body = await req.text();} catch {return json({error: 'Invalid request'}, 400);}
  if (body.length > 1024 * 1024) return json({error: 'Request too large'}, 413);
  if (!await verifyStripeSignature(body, req.headers.get('stripe-signature'), secret)) return json({error: 'Invalid signature'}, 400);
  let payment;
  try {
    const event = JSON.parse(body);
    if (!event || typeof event !== 'object' || event.livemode !== (mode === 'live')) return json({error: 'Wrong event mode'}, 400);
    payment = stripeInvoicePayment(event);
  } catch {return json({error: 'Invalid invoice event'}, 400);}
  if (!payment) return json({received: true, ignored: true});
  try {
    const db = createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}});
    const {data, error} = await db.rpc('record_unipathway_stripe_payment', payment);
    if (error || !['recorded', 'duplicate'].includes(data?.status)) {
      // A non-2xx preserves Stripe retries. Never acknowledge a failed ledger write.
      console.error('Stripe invoice reconciliation failed', {event_id: payment.p_event_id, code: error?.code || 'invalid_receipt'});
      return json({error: 'Invoice reconciliation requires retry or finance review'}, 503);
    }
    return json({received: true, status: data.status});
  } catch {return json({error: 'Invoice reconciliation unavailable'}, 503);}
});
