import {describe,it,expect} from 'vitest';
import {internationalAdviceTopics,internationalAdviceUrl,internationalAdvicePrefill} from './internationalAdvice';
describe('international advice enquiries',()=>{
 it('round trips every published advice topic into the existing contact form',()=>{
  for(const topic of internationalAdviceTopics){
   const url=new URL(internationalAdviceUrl(topic.id),'https://example.invalid');
   expect(url.pathname).toBe('/contact');
   expect(url.hash).toBe('#contact-form');
   expect(internationalAdvicePrefill(url.searchParams)).toMatchObject({title:topic.title,subject:topic.subject});
   expect(internationalAdvicePrefill(url.searchParams)?.message).toContain(topic.message);
  }
 });
 it('rejects unknown topics and does not incorporate untrusted message text',()=>{
  expect(internationalAdvicePrefill(new URLSearchParams('advice=unknown'))).toBeNull();
  const result=internationalAdvicePrefill(new URLSearchParams('advice=career&message=untrusted&name=personal'));
  expect(result?.message).not.toContain('untrusted');
  expect(result?.message).not.toContain('personal');
 });
});
