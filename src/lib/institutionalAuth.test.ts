import {describe,it,expect} from 'vitest';
import {institutionalEmail,institutionalAssurance,INSTITUTIONAL_MIN_PASSWORD} from './institutionalAuth';
describe('institutional access requirements',()=>{
 it('accepts only the exact institutional domain',()=>{
  expect(institutionalEmail(' Example.Student@UniPathway.PK ')).toBe('example.student@unipathway.pk');
  for(const invalid of ['student@gmail.com','user@unipathway.edu.pk','user@sub.unipathway.pk','user@unipathway.pk.example.org','user@@unipathway.pk','a..b@unipathway.pk','user@unupathway.pk','@unipathway.pk',null])expect(institutionalEmail(invalid)).toBeNull();
 });
 it('requires a confirmed email and native AAL2',()=>{
  expect(institutionalAssurance('student@unipathway.pk',true,'aal2')).toBe(true);
  for(const level of ['aal1',null,undefined,'email'])expect(institutionalAssurance('student@unipathway.pk',true,level)).toBe(false);
  expect(institutionalAssurance('student@unipathway.pk',false,'aal2')).toBe(false);
  expect(institutionalAssurance('student@example.com',true,'aal2')).toBe(false);
  expect(INSTITUTIONAL_MIN_PASSWORD).toBeGreaterThanOrEqual(12);
 });
});
