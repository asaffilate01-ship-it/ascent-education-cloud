import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { whatsappDecision, normalizeWhatsAppText } from './unipathway-whatsapp.ts';

Deno.test('FAQ greeting is public-only', () => {
  assertEquals(whatsappDecision('Hello').kind, 'reply');
  assertEquals(whatsappDecision('IELTS').kind, 'reply');
  assertEquals(whatsappDecision('ACCA').kind, 'reply');
});
Deno.test('private, sensitive and unknown subjects require human handoff', () => {
  for (const message of ['my fee is due', 'my child was absent', 'student grades',
    'refund request', 'safeguarding', 'password', 'stop', 'HUMAN', 'unrecognized text', 'میری فیس']) {
    assertEquals(whatsappDecision(message).kind, 'handoff', message);
  }
});
Deno.test('text ingestion truncates and rejects unsupported media', () => {
  assertEquals(normalizeWhatsAppText({type:'text',text:{body:'Hi'}}), 'Hi');
  assertEquals(normalizeWhatsAppText({type:'image',image:{id:'x'}}), null);
  assertEquals(normalizeWhatsAppText({type:'text',text:{body:23}}), null);
  assertEquals(normalizeWhatsAppText({type:'text',text:{body:'x'.repeat(5000)}})?.length, 4000);
});
