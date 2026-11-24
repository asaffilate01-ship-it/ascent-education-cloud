export type EvidenceRequirement={type:string;label:string;description:string;required:boolean};
export const studentEvidence:readonly EvidenceRequirement[]=[
 {type:'passport',label:'CNIC / B-form / Juvenile Card / Passport',description:'Identity document appropriate for your age and circumstances.',required:true},
 {type:'selfie',label:'Identity photograph (where required)',description:'Only provide when requested by authorised staff; guardian-led checks apply to minors.',required:false},
 {type:'transcript',label:'Academic transcripts',description:'Entry-relevant academic records.',required:true},
 {type:'qualification',label:'Qualification certificates',description:'Entry-relevant degree, diploma or school certificates.',required:true},
 {type:'english_cert',label:'English language certificate',description:'IELTS, PTE or equivalent, where relevant.',required:false},
 {type:'work_experience',label:'Work experience letters',description:'Relevant employer references or experience certificates.',required:false},
 {type:'reference_letter',label:'Academic references',description:'Reference letters, where applicable.',required:false},
];
export const lecturerEvidence:readonly EvidenceRequirement[]=[
 {type:'passport',label:'CNIC / Passport / National ID',description:'Government-issued identification.',required:true},
 {type:'qualification',label:'Teaching qualification',description:'Relevant teaching certificate or equivalent evidence.',required:true},
 {type:'degree_certificate',label:'Academic qualification certificates',description:'Relevant academic or professional qualifications.',required:true},
 {type:'cv',label:'Curriculum vitae',description:'Teaching and industry experience.',required:true},
 {type:'dbs_check',label:'Police clearance / safeguarding evidence',description:'Applicable safeguarding evidence; requirements are confirmed by the centre.',required:true},
 {type:'right_to_work',label:'Right to work evidence',description:'Applicable work or residency documentation.',required:true},
];
export const acceptedEvidenceExtensions=['pdf','doc','docx','jpg','jpeg','png'] as const;
const acceptedTypes:Record<string,string[]>={pdf:['application/pdf'],doc:['application/msword'],docx:['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],jpg:['image/jpeg'],jpeg:['image/jpeg'],png:['image/png']};
export const evidenceMaxBytes=20*1024*1024;
export function evidenceExtension(file:{name:string;size:number;type:string}):string|null{
 const ext=(file.name.split('.').pop()||'').toLowerCase();
 return file.name.includes('.')&&acceptedEvidenceExtensions.includes(ext as typeof acceptedEvidenceExtensions[number])&&Number.isSafeInteger(file.size)&&file.size>0&&file.size<=evidenceMaxBytes&&(!file.type||file.type==='application/octet-stream'||acceptedTypes[ext].includes(file.type))?ext:null;
}
export type EvidenceRecord={id:string;user_id:string;tenant_id:string|null;document_type:string;status:string;created_at:string;file_name:string|null;rejection_reason:string|null};
export function latestOwnEvidence(rows:readonly EvidenceRecord[],userId:string,tenantId:string){
 const latest=new Map<string,EvidenceRecord>();
 for(const r of rows){
  if(r.user_id!==userId||r.tenant_id!==tenantId)continue;
  if(!r.id||!r.document_type||!Number.isFinite(Date.parse(r.created_at)))throw Error('Unverified document metadata');
  const old=latest.get(r.document_type);
  if(!old||Date.parse(r.created_at)>Date.parse(old.created_at)||(Date.parse(r.created_at)===Date.parse(old.created_at)&&r.id>old.id))latest.set(r.document_type,r);
 }
 return latest;
}
export function requiredEvidenceProgress(requirements:readonly EvidenceRequirement[],latest:ReadonlyMap<string,EvidenceRecord>){
 const required=requirements.filter(r=>r.required);
 return {required:required.length,verified:required.filter(r=>latest.get(r.type)?.status==='verified').length,received:required.filter(r=>['verified','pending','uploaded'].includes(latest.get(r.type)?.status||'')).length};
}
export function maySubmitEvidence(status:string|undefined){
 return status===undefined||status==='rejected'||status==='expired';
}
