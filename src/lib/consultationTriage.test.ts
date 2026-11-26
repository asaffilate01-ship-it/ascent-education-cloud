import {describe,it,expect} from 'vitest';
import {parseConsultationLead,consultationTriage} from './consultationTriage';
import {consultationPrefill,defaultConsultation} from './consultationRequest';
const message=consultationPrefill(new URLSearchParams('request=consultation'),{consultation:{...defaultConsultation,destination:'germany',format:'online',window:'afternoon'},preferredDate:'2026-12-01'},new Date('2026-11-25T09:00:00Z'))!.message;
const lead={id:'lead-1',tenant_id:'centre-a',source:'contact_form',notes:'Subject: Admissions Enquiry\n\nApplicant message: '+message+'\n\nPrivacy notice acknowledged: yes',stage:'lead',student_name:'Example Applicant',counsellor:null};
describe('consultation triage',()=>{
 it('recognises both existing contact formats and extracts explicit preferences',()=>{
  const expected={destination:'Germany',format:'Online consultation',window:'Afternoon (Pakistan time)',preferredDate:'2026-12-01'};
  expect(parseConsultationLead(lead)).toEqual(expected);
  expect(parseConsultationLead({...lead,notes:'Subject: Admissions Enquiry\n\n'+message})).toEqual(expected);
 });
 it('does not mistake arbitrary notes or another lead source for a consultation request',()=>{
  expect(parseConsultationLead({...lead,source:'Website'})).toBeNull();
  expect(parseConsultationLead({...lead,notes:'Subject: Course Enquiry\n\nPlease help me.\n'+message})).toBeNull();
  expect(parseConsultationLead({...lead,notes:null})).toBeNull();
 });
 it('rejects unknown, repeated or impossible preferences without denying the enquiry',()=>{
  const result=parseConsultationLead({...lead,notes:lead.notes.replace('Online consultation','Unverified video link').replace('2026-12-01','2026-02-30')+'\nPreferred destination: Italy'});
  expect(result).toMatchObject({destination:null,format:null,preferredDate:null});
 });
 it('includes only active early-stage requests in the current centre',()=>{
  const queue=consultationTriage([lead,{...lead,id:'foreign',tenant_id:'centre-b'},{...lead,id:'closed',stage:'lost'},{...lead,id:'later',stage:'contacted',notes:lead.notes.replace('2026-12-01','2026-12-05')}],'centre-a');
  expect(queue.map(row=>row.application.id)).toEqual(['lead-1','later']);
  expect(consultationTriage([lead],'')).toEqual([]);
 });
});
