import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.1';
import { whatsappDecision, normalizeWhatsAppText } from '../_shared/unipathway-whatsapp.ts';

const plain = (body: string, status = 200) => new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
async function validSignature(raw: string, header: string | null, secret: string): Promise<boolean> {
  if (!header || !/^sha256=[0-9a-f]{64}$/i.test(header)) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const actual = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)));
  const expected = header.slice(7).match(/.{2}/g)!.map(part => parseInt(part, 16));
  let mismatch = 0;
  for (let i = 0; i < actual.length; i++) mismatch |= actual[i] ^ expected[i];
  return mismatch === 0;
}
Deno.serve(async req => {
  const verifyToken = Deno.env.get('UNIPATHWAY_WA_VERIFY_TOKEN');
  const appSecret = Deno.env.get('UNIPATHWAY_WA_APP_SECRET');
  const phoneId = Deno.env.get('UNIPATHWAY_WA_PHONE_NUMBER_ID');
  const tenantId = Deno.env.get('UNIPATHWAY_WA_TENANT_ID');
  if (!verifyToken || !appSecret || !phoneId || !tenantId) return plain('Not configured', 503);
  if (req.method === 'GET') {
    const u = new URL(req.url);
    return u.searchParams.get('hub.mode') === 'subscribe' &&
      u.searchParams.get('hub.verify_token') === verifyToken &&
      u.searchParams.get('hub.challenge') !== null
      ? plain(u.searchParams.get('hub.challenge')!) : plain('Forbidden', 403);
  }
  if (req.method !== 'POST') return plain('Method not allowed', 405);
  const raw = await req.text();
  if (raw.length > 256_000) return plain('Payload too large', 413);
  if (!await validSignature(raw, req.headers.get('x-hub-signature-256'), appSecret)) return plain('Unauthorized', 401);
  let payload: any;
  try { payload = JSON.parse(raw); } catch { return plain('Invalid JSON', 400); }
  if (payload?.object !== 'whatsapp_business_account') return plain('OK');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const url = Deno.env.get('SUPABASE_URL');
  if (!serviceKey || !url) return plain('Storage unavailable', 503);
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages' || change.value?.metadata?.phone_number_id !== phoneId) continue;
      for (const message of change.value?.messages ?? []) {
        if (typeof message.id !== 'string' || typeof message.from !== 'string' ||
            !/^\d{7,18}$/.test(message.from)) continue;
        const body = normalizeWhatsAppText(message);
        // Do not store unsupported media or sensitive attachments in this first release.
        if (body === null) continue;
        const { data: conversation, error: conversationError } = await db
          .from('uni_whatsapp_conversations')
          .upsert({ tenant_id: tenantId, phone_number_id: phoneId, wa_id: message.from },
                  { onConflict: 'tenant_id,phone_number_id,wa_id' })
          .select('id,automation_paused').single();
        if (conversationError || !conversation) return plain('Storage unavailable', 503);
        const { data: inserted, error: insertError } = await db
          .from('uni_whatsapp_messages')
          .upsert({ conversation_id: conversation.id, provider_message_id: message.id,
                    direction: 'inbound', body_text: body },
                  { onConflict: 'provider_message_id', ignoreDuplicates: true })
          .select('id');
        if (insertError) return plain('Storage unavailable', 503);
        if (!inserted?.length || conversation.automation_paused) continue;
        const decision = whatsappDecision(body);
        if (/^\s*(human|agent|staff|person|representative)\s*$/i.test(body) || decision.kind === 'handoff') {
          await db.from('uni_whatsapp_conversations')
            .update({ automation_paused: true, status: 'needs_staff' }).eq('id', conversation.id);
          continue;
        }
        // Only non-sensitive public FAQ responses, off by default until Meta and hosted acceptance.
        if (Deno.env.get('UNIPATHWAY_WA_AUTO_REPLY_ENABLED') !== 'true') continue;
        const token = Deno.env.get('UNIPATHWAY_WA_ACCESS_TOKEN');
        if (!token) continue;
        const result = await fetch(`https://graph.facebook.com/${Deno.env.get('UNIPATHWAY_WA_GRAPH_VERSION') || 'v23.0'}/${phoneId}/messages`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messaging_product: 'whatsapp', to: message.from, type: 'text',
            text: { body: decision.body } })
        });
        if (result.ok) {
          const sent = await result.json();
          if (sent.messages?.[0]?.id) {
            await db.from('uni_whatsapp_messages').insert({
              conversation_id: conversation.id, provider_message_id: sent.messages[0].id,
              direction: 'outbound', body_text: decision.body
            });
          }
        } else {
          await db.from('uni_whatsapp_conversations').update({ status: 'needs_staff' }).eq('id', conversation.id);
        }
      }
    }
  }
  return plain('OK');
});
