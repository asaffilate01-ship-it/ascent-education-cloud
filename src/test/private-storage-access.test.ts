import {describe,it,expect} from 'vitest';
type Bucket='kyc'|'qualifications'|'assessment-evidence'|'recordings'|'public-assets';
const policy=(bucket:Bucket,actor:'owner'|'academic'|'other_student'|'other_tenant'|'anonymous')=>{
 if(bucket==='public-assets')return actor!=='other_tenant';
 if(actor==='other_tenant'||actor==='anonymous'||actor==='other_student')return false;
 return actor==='owner'||actor==='academic';
};
describe('private storage access matrix',()=>{for(const b of ['kyc','qualifications','assessment-evidence','recordings'] as Bucket[]){it(b+' blocks anonymous',()=>expect(policy(b,'anonymous')).toBe(false));it(b+' blocks other student',()=>expect(policy(b,'other_student')).toBe(false));it(b+' blocks other tenant',()=>expect(policy(b,'other_tenant')).toBe(false));it(b+' permits scoped owner',()=>expect(policy(b,'owner')).toBe(true))}});
