import {describe,it,expect} from 'vitest';
import {courseworkQueueState,formatPakistanAcademicDate} from '@/lib/assessment/courseworkQueue';
const brief={submission_cutoff:'2026-12-01T12:00:00Z',max_attempts:2};
const at=Date.parse('2026-11-01T00:00:00Z');
describe('student coursework task classification',()=>{
 it('shows newly available work as action, not fabricated completion',()=>{
  expect(courseworkQueueState(brief,[],false,at)).toEqual({stage:'action',maySubmit:true});
 });
 it('keeps submitted but unreleased work awaiting review without exposing provisional grades',()=>{
  expect(courseworkQueueState(brief,[{status:'submitted'}],false,at)).toEqual({stage:'review',maySubmit:false});
  expect(courseworkQueueState(brief,[{status:'marked'}],false,at)).toEqual({stage:'review',maySubmit:false});
 });
 it('keeps approved feedback distinct from the submission queue',()=>{
  expect(courseworkQueueState(brief,[{status:'released'}],true,at)).toEqual({stage:'released',maySubmit:false});
 });
 it('recognises a marker-requested revision while preserving previous released feedback',()=>{
  expect(courseworkQueueState(brief,[{status:'resubmission_requested'}],true,at)).toEqual({stage:'action',maySubmit:true});
 });
 it('fails closed for expired/invalid cutoffs and exhausted attempts',()=>{
  expect(courseworkQueueState(brief,[],false,Date.parse('2026-12-02T00:00:00Z'))).toEqual({stage:'closed',maySubmit:false});
  expect(courseworkQueueState({...brief,submission_cutoff:'invalid'},[],false,at).maySubmit).toBe(false);
  expect(courseworkQueueState({...brief,max_attempts:0},[],false,at).maySubmit).toBe(false);
  expect(courseworkQueueState(brief,[{status:'resubmission_requested'},{status:'submitted'}],false,at).maySubmit).toBe(false);
 });
 it('renders a Pakistan-local deadline independently of the device timezone',()=>{
  const shown=formatPakistanAcademicDate('2026-10-31T19:00:00Z');
  expect(shown).toContain('01 Nov 2026');
  expect(shown).toContain('00:00');
  expect(shown).toContain('PKT');
  expect(formatPakistanAcademicDate('invalid')).toBe('Date unavailable');
 });
});
