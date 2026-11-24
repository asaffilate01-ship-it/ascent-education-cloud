export type VerificationStatus='valid'|'revoked'|'expired'|'review_required'|'not_found';
export type CertificateStatusReceipt={certificate_number:string;status:VerificationStatus;checked_on:string};
export function normaliseCertificateReference(value:string):string|null{
 const s=value.trim().toUpperCase();return /^[A-Z0-9][A-Z0-9._/-]{2,79}$/.test(s)?s:null;
}
const statuses:readonly VerificationStatus[]=['valid','revoked','expired','review_required','not_found'];
function date(value:unknown):value is string{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const n=Date.parse(value+'T00:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===value;
}
export function readCertificateStatus(raw:unknown,reference:string):CertificateStatusReceipt{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid status receipt');
 const r=raw as Record<string,unknown>;
 if(Object.keys(r).length!==3||r.certificate_number!==reference||normaliseCertificateReference(reference)!==reference||typeof r.status!=='string'||!statuses.includes(r.status as VerificationStatus)||!date(r.checked_on))throw Error('Invalid status receipt');
 return {certificate_number:reference,status:r.status as VerificationStatus,checked_on:r.checked_on};
}
export const verificationMessage:Record<VerificationStatus,{title:string;detail:string}>={
 valid:{title:'Record marked valid',detail:'The UniPathway register currently marks this certificate reference as valid. This is not independent confirmation of the holder’s identity, qualification or awarding-body recognition.'},
 revoked:{title:'Certificate record revoked',detail:'Do not rely on this record as a current valid certificate. Contact the issuing institution for clarification.'},
 expired:{title:'Certificate record expired',detail:'This reference is not currently valid in the register. Confirm renewal or replacement with the issuing institution.'},
 review_required:{title:'Record requires review',detail:'The register cannot confirm current validity. Ask the issuing institution to review the record.'},
 not_found:{title:'No matching certificate record',detail:'Check the exact reference and contact the issuing institution if it still cannot be found. A missing record is not proof of fraud.'},
};
