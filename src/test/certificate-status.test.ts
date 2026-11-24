import {describe,it,expect} from 'vitest';
import {normaliseCertificateReference,readCertificateStatus,verificationMessage} from '@/lib/certificateStatus';
describe('privacy-preserving certificate status',()=>{
 const ref='CERT-2026-001234';
 it('normalises exact references without accepting wildcard or personal-data searches',()=>{expect(normaliseCertificateReference(' cert-2026-001234 ')).toBe(ref);for(const bad of ['','AB','A B','A%12','A*12','A'.repeat(81),'https://example.test/cert'])expect(normaliseCertificateReference(bad)).toBeNull();});
 it('accepts only the exact three-field status receipt and actual dates',()=>{const good={certificate_number:ref,status:'valid',checked_on:'2026-11-24'};expect(readCertificateStatus(good,ref)).toEqual(good);for(const bad of [{...good,student_name:'Private name'},{...good,grade:'A'},{...good,status:'unknown'},{...good,checked_on:'2026-02-30'},{...good,certificate_number:'OTHER'}])expect(()=>readCertificateStatus(bad,ref)).toThrow();});
 it('distinguishes non-valid states and never calls a record independent proof',()=>{for(const status of ['revoked','expired','review_required','not_found'] as const)expect(verificationMessage[status].title).not.toBe(verificationMessage.valid.title);expect(verificationMessage.valid.detail).toContain('not independent confirmation');});
});
