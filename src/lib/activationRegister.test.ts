import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {activationDefinitions,describeActivationState,type ActivationInputs,type ActivationKey} from './activationRegister';
const status=(inputs:ActivationInputs,key:ActivationKey)=>describeActivationState(inputs).find(row=>row.definition.key===key)!;
describe('production activation register',()=>{
 it('distinguishes missing, explicitly disabled and malformed switches',()=>{
  const key='VITE_UNIPATHWAY_STUDENT_PLANS_ENABLED';
  expect(status({},key).state).toBe('not_set');
  expect(status({[key]:'false'},key).state).toBe('off');
  for(const invalid of [true,'TRUE','1',' true ','enabled'])expect(status({[key]:invalid},key).state).toBe('invalid');
  expect(status({[key]:'true'},key).state).toBe('enabled_unverified');
 });
 it('requires physical security before visitor writes or facilities access',()=>{
  const inputs={VITE_UNIPATHWAY_PHYSICAL_VISITOR_WRITES_ENABLED:'true',VITE_UNIPATHWAY_FACILITIES_REGISTER_ENABLED:'true'} as const;
  for(const key of ['VITE_UNIPATHWAY_PHYSICAL_VISITOR_WRITES_ENABLED','VITE_UNIPATHWAY_FACILITIES_REGISTER_ENABLED'] as const){
   expect(status(inputs,key)).toMatchObject({state:'blocked',blockers:['VITE_UNIPATHWAY_PHYSICAL_SECURITY_ENABLED']});
   expect(status({...inputs,VITE_UNIPATHWAY_PHYSICAL_SECURITY_ENABLED:'true'},key).state).toBe('enabled_unverified');
  }
 });
 it('requires both physical security and facilities reads before facilities writes',()=>{
  const key='VITE_UNIPATHWAY_FACILITIES_WRITES_ENABLED';
  const inputs={[key]:'true'};
  expect(status(inputs,key)).toMatchObject({state:'blocked',blockers:['VITE_UNIPATHWAY_PHYSICAL_SECURITY_ENABLED','VITE_UNIPATHWAY_FACILITIES_REGISTER_ENABLED']});
  expect(status({...inputs,VITE_UNIPATHWAY_FACILITIES_REGISTER_ENABLED:'true'},key).state).toBe('blocked');
  expect(status({...inputs,VITE_UNIPATHWAY_PHYSICAL_SECURITY_ENABLED:'true',VITE_UNIPATHWAY_FACILITIES_REGISTER_ENABLED:'true'},key).state).toBe('enabled_unverified');
 });
 it('requires a configured public site key and never serialises its value',()=>{
  const key='VITE_UNIPATHWAY_SECURE_CONTACT_ENABLED';
  expect(status({[key]:'true'},key)).toMatchObject({state:'blocked',blockers:['VITE_TURNSTILE_SITE_KEY']});
  expect(status({[key]:'true',VITE_TURNSTILE_SITE_KEY:'  '},key).state).toBe('blocked');
  expect(status({[key]:'true',VITE_TURNSTILE_SITE_KEY:'test-only-site-key'},key).state).toBe('enabled_unverified');
  expect(JSON.stringify(describeActivationState({[key]:'true',VITE_TURNSTILE_SITE_KEY:'test-only-site-key'}))).not.toContain('test-only-site-key');
 });
 it('has unique reviewed keys, valid prerequisite references and default-off example declarations',()=>{
  const keys=activationDefinitions.map(d=>d.key);
  expect(new Set(keys).size).toBe(keys.length);
  for(const item of activationDefinitions)for(const prerequisite of item.requires)expect(keys).toContain(prerequisite);
  const example=readFileSync(resolve(__dirname,'../../.env.example'),'utf8');
  for(const key of keys)expect(example.split('\n').filter(line=>line.startsWith(key+'='))).toEqual([key+'=false']);
  expect(example.split('\n').some(line=>line.startsWith('VITE_TURNSTILE_SITE_KEY='))).toBe(true);
 });
});
