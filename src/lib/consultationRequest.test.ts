import {describe,it,expect} from 'vitest';
import {consultationPrefill,consultationContactUrl,normaliseConsultation,normalisePreparation,defaultConsultation,consultationDateBounds,normaliseConsultationDate,consultationAcademicGuidance} from './consultationRequest';
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

describe('consultation calendar preferences and academic preparation',()=>{
 const now=new Date('2026-11-25T20:00:00Z');
 it('uses the Pakistan calendar and validates date boundaries',()=>{
  expect(consultationDateBounds(now)).toEqual({min:'2026-11-26',max:'2027-02-24'});
  expect(normaliseConsultationDate('2026-11-25',now)).toBe('');
  expect(normaliseConsultationDate('2026-11-26',now)).toBe('2026-11-26');
  expect(normaliseConsultationDate('2027-02-24',now)).toBe('2027-02-24');
  expect(normaliseConsultationDate('2027-02-25',now)).toBe('');
  expect(normaliseConsultationDate('2026-12-32',now)).toBe('');
 });
 it('carries a valid preference without claiming a confirmed booking',()=>{
  const params=new URLSearchParams('request=consultation');
  const result=consultationPrefill(params,{consultation:defaultConsultation,preferredDate:'2026-12-01'},now);
  expect(result?.message).toContain('Preferred meeting date (Pakistan time): 2026-12-01');
  expect(result?.message).toContain('not a confirmed appointment');
  expect(consultationPrefill(params,{preferredDate:'2026-11-25'},now)?.message).not.toContain('Preferred meeting date');
 });
 it('gives tailored preparation guidance without deciding eligibility',()=>{
  const topUp=consultationAcademicGuidance({goal:'top-up',destination:'uk'});
  expect(topUp.question).toContain('not automatic');
  expect(topUp.guide?.url).toBe('/international-study/uk');
  expect(consultationAcademicGuidance({goal:'postgraduate',education:'secondary'}).additional).toContain('individual review');
  expect(consultationAcademicGuidance({destination:'unknown',goal:'invalid'}).guide).toBeNull();
 });
});
