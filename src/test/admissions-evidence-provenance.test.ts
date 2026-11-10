import {describe,it,expect} from 'vitest';
import {admissionReadiness} from '@/components/admissions/AdmissionsJourney';

const application={
 id:'case-1',tenant_id:'centre-a',student_name:'Example learner',email:'learner@example.invalid',
 stage:'deposit_paid',user_id:'student-a',programme_id:'programme-a',programme_name:'Computing',
 intake:'2027',document_checklist:null,
};
const state=()=>({
 kyc:[] as Array<{id:string;document_type:string;status:string;verified_at:string|null;expiry_date:string|null}>,
 enrolments:[] as Array<{id:string;programme_id:string;application_id:string|null;status:string}>,
 signatures:[] as Array<{id:string;document_type:string;signed_at:string}>,
 invoices:[] as Array<{id:string;amount:number;paid:number;status:string;sponsor_amount:number|null;sponsor_paid:number|null;sponsor_reference:string|null}>,
 modules:[] as Array<{id:string;title:string;programme_id:string;lecturer_id:string|null}>,
 lectures:[] as Array<{id:string;module_id:string;day_of_week:number;start_time:string;end_time:string;room:string|null;is_active:boolean}>,
});
const item=(rows:ReturnType<typeof admissionReadiness>,key:string)=>rows.find(x=>x.key===key)!;

describe('admissions source evidence integrity',()=>{
 it('does not promote unrelated learner-level invoices to funding or payment approval',()=>{
  const s=state();
  s.invoices.push({id:'invoice-for-different-purpose',amount:150,paid:150,status:'paid',
    sponsor_amount:null,sponsor_paid:null,sponsor_reference:null});
  const checks=admissionReadiness(application,s);
  const funding=item(checks,'funding');
  expect(funding.status).toBe('manual');
  expect(funding.detail).toContain('no application link');
  expect(funding.detail).toContain('do not prove funding approval or payment settlement');
  expect(funding.detail).toContain('Finance must verify');
 });
 it('does not infer offer acceptance from an unrelated signed document',()=>{
  const s=state();s.signatures=[{id:'other-form',document_type:'library-policy',signed_at:'2026-11-01T11:00:00Z'}];
  const offer=item(admissionReadiness(application,s),'offer');
  expect(offer.status).toBe('manual');
  expect(offer.detail).toContain('not linked to this application');
  expect(offer.detail).toContain('formal offer and its acceptance');
 });
 it('requires a dated, current verified identity document, not a status string alone',()=>{
  const s=state();
  const validDay=new Date(Date.now()-86400000).toISOString(),today=new Date(Date.now()).toISOString().slice(0,10);
  s.kyc=[{id:'k1',document_type:'national_id',status:'verified',verified_at:null,expiry_date:null}];
  expect(item(admissionReadiness(application,s),'identity').status).toBe('review');
  s.kyc[0].verified_at=new Date(Date.now()+86400000).toISOString();
  expect(item(admissionReadiness(application,s),'identity').status).toBe('review');
  s.kyc[0].verified_at=validDay;s.kyc[0].expiry_date='2020-01-01';
  expect(item(admissionReadiness(application,s),'identity').status).toBe('review');
  s.kyc[0].expiry_date=today;
  expect(item(admissionReadiness(application,s),'identity').status).toBe('recorded');
 });
 it('does not turn another application enrolment or an inactive record into this applicant access',()=>{
  const s=state();
  s.enrolments=[{id:'e1',programme_id:'programme-a',application_id:'other-case',status:'active'}];
  expect(item(admissionReadiness(application,s),'enrolment').status).toBe('review');
  s.enrolments=[{id:'e2',programme_id:'programme-a',application_id:'case-1',status:'withdrawn'}];
  expect(item(admissionReadiness(application,s),'enrolment').status).toBe('review');
  s.enrolments=[{id:'e3',programme_id:'programme-a',application_id:'case-1',status:'active'}];
  expect(item(admissionReadiness(application,s),'enrolment').status).toBe('recorded');
 });
 it('keeps all nine stages visible and leaves awarding-body eligibility and ID issue for humans',()=>{
  const checks=admissionReadiness(application,state());
  expect(checks).toHaveLength(9);
  expect(item(checks,'eligibility').status).toBe('manual');
  expect(item(checks,'card').status).toBe('manual');
  expect(item(checks,'funding').status).toBe('manual');
  expect(item(checks,'offer').status).toBe('manual');
 });
});
