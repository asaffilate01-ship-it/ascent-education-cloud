import {describe,it,expect} from 'vitest';
import {evidenceExtension,evidenceMaxBytes,latestOwnEvidence,requiredEvidenceProgress,maySubmitEvidence,studentEvidence,lecturerEvidence,type EvidenceRecord} from '@/lib/onboardingEvidence';
const record:EvidenceRecord={id:'a',user_id:'user',tenant_id:'centre',document_type:'passport',status:'verified',created_at:'2026-11-20T10:00:00Z',file_name:'identity.pdf',rejection_reason:null};
describe('onboarding evidence',()=>{
 it('accepts bounded document formats and rejects mismatched MIME, empty and oversized files',()=>{
  expect(evidenceExtension({name:'Transcript.PDF',size:100,type:'application/pdf'})).toBe('pdf');
  expect(evidenceExtension({name:'qualification.docx',size:100,type:''})).toBe('docx');
  for(const file of [{name:'x.pdf',size:0,type:'application/pdf'},{name:'x.pdf',size:evidenceMaxBytes+1,type:'application/pdf'},{name:'x.pdf',size:100,type:'text/html'},{name:'x.exe',size:100,type:''},{name:'pdf',size:100,type:''}])expect(evidenceExtension(file)).toBeNull();
 });
 it('isolates user and tenant, keeps the latest record and never treats a pending upload as verified',()=>{
  const latest=latestOwnEvidence([record,{...record,id:'peer',user_id:'other',status:'verified',created_at:'2026-11-22T10:00:00Z'},{...record,id:'foreign',tenant_id:'elsewhere',created_at:'2026-11-23T10:00:00Z'},{...record,id:'new',status:'pending',created_at:'2026-11-21T10:00:00Z'}],'user','centre');
  expect(latest.get('passport')?.id).toBe('new');
  expect(requiredEvidenceProgress(studentEvidence,latest)).toEqual({required:3,received:1,verified:0});
  expect(requiredEvidenceProgress(lecturerEvidence,latest)).toEqual({required:6,received:1,verified:0});
 });
 it('allows initial submissions and reviewed replacements without overwriting approved or pending evidence',()=>{
  expect(maySubmitEvidence(undefined)).toBe(true);expect(maySubmitEvidence('rejected')).toBe(true);expect(maySubmitEvidence('expired')).toBe(true);
  for(const status of ['verified','pending','uploaded','unknown'])expect(maySubmitEvidence(status)).toBe(false);
 });
});
