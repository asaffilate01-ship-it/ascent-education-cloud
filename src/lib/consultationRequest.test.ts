import {describe,it,expect} from 'vitest';
import {consultationPrefill,consultationContactUrl,normaliseConsultation,normalisePreparation,defaultConsultation} from './consultationRequest';
describe('consultation request',()=>{
 const params=new URL(consultationContactUrl,'https://example.invalid').searchParams;
 it('carries recognised preferences into a reviewable enquiry',()=>{
  const result=consultationPrefill(params,{consultation:{...defaultConsultation,destination:'germany',goal:'top-up',format:'jhelum',window:'afternoon'},prepared:['course','budget']});
  expect(result?.subject).toBe('Admissions Enquiry');
  expect(result?.message).toContain('Germany');
  expect(result?.message).toContain('Degree top-up');
  expect(result?.message).toContain('In person in Jhelum');
  expect(result?.message).toContain('Afternoon (Pakistan time)');
  expect(result?.message).toContain('not a confirmed appointment');
 });
 it('rejects unrecognised preferences and private text',()=>{
  expect(normaliseConsultation({destination:'invalid',goal:'passport number 123'})).toEqual(defaultConsultation);
  expect(normalisePreparation(['course','course','private text'])).toEqual(['course']);
  const message=consultationPrefill(params,{consultation:{education:'personal data'},prepared:['private data']})?.message;
  expect(message).not.toContain('personal data');
  expect(message).not.toContain('private data');
 });
 it('supports a reload without navigation state and ignores unrelated requests',()=>{
  expect(consultationPrefill(params,null)?.message).toContain('Please help me choose');
  expect(consultationPrefill(new URLSearchParams('request=other'),{})).toBeNull();
  expect(consultationContactUrl).not.toContain('destination=');
 });
});
