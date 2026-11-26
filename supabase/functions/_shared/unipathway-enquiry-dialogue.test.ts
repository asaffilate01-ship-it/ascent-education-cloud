import {assertEquals,assert} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {enquiryTurn,START,type EnquiryState} from './unipathway-enquiry-dialogue.ts';
function say(state:EnquiryState|null,message:string){return enquiryTurn(state,message)}
Deno.test('English school enquiry collects board, grade, subjects, mode and Pakistan-time preference',()=>{
  let t=say(START,'1');assertEquals(t.state.step,'relationship');
  t=say(t.state,'2');assertEquals(t.state.relationship,'parent');
  t=say(t.state,'1');assertEquals(t.state.programme,'school_tuition');
  t=say(t.state,'2');assertEquals(t.state.board,'cambridge_igcse');
  t=say(t.state,'11');assertEquals(t.state.grade,'11');
  t=say(t.state,'Physics and Maths');assertEquals(t.state.subjects,'Physics and Maths');
  t=say(t.state,'1');assertEquals(t.state.mode,'jhelum');
  t=say(t.state,'weekdays after 4pm');assertEquals(t.state.step,'consent');
  t=say(t.state,'YES');assertEquals(t.state.contactConsent,true);
  assertEquals(t.state.step,'complete');assert(t.complete);
});
Deno.test('Urdu conversation and decline of follow-up',()=>{
  let t=say(START,'2');assertEquals(t.state.language,'ur');
  t=say(t.state,'1');t=say(t.state,'3');t=say(t.state,'3');
  t=say(t.state,'evenings');t=say(t.state,'NO');
  assertEquals(t.state.contactConsent,false);assert(t.complete);
  assert(t.reply.includes('شکریہ'));
});
Deno.test('Invalid grade does not progress; future courses require staff',()=>{
  let t=say(START,'1');t=say(t.state,'1');t=say(t.state,'1');t=say(t.state,'1');
  const bad=say(t.state,'8');assertEquals(bad.state.step,'grade');
  t=say(START,'1');t=say(t.state,'1');t=say(t.state,'6');
  assertEquals(t.state.step,'phase2_interest');
  t=say(t.state,'1');assert(t.handoff);assertEquals(t.state.phase2Interest,'beauty_aesthetics');
  assertEquals(t.state.programme,'future_interest');
});
Deno.test('Sensitive and STOP requests stop automation',()=>{
 const t=say({step:'subjects',language:'en',programme:'school_tuition'},'my child has a medical emergency');
 assert(t.handoff);assertEquals(t.state.step,'subjects');
 const stop=say(START,'STOP');assert(stop.handoff);
 assertEquals(stop.state.contactConsent,false);
});
