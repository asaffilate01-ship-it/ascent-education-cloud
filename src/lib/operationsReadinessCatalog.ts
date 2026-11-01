/**
 * Evidence-first readiness catalogue for UniPathway.
 * These are centre check prompts, never a claim that a regulator/board
 * requires an identical form for every programme or has approved this site.
 * Individual authority requirements must be re-verified against current
 * qualification specifications, country and session.
 */
export type ReadinessFamily='UK diplomas'|'International schools'|'Pakistan boards'|'Vocational Pakistan'|'Language learning'|'Technology & labs'|'Centre operations';
export type ReadinessTrack={
 key:string;label:string;family:ReadinessFamily;authority:string;
 officialUrl:string;workspace:string;scope:string;requirements:readonly {category:string;title:string;description:string;priority:'critical'|'high'|'medium'}[];
};
type Check=ReadinessTrack['requirements'][number];
const requirement=(category:string,title:string,description:string,priority:Check['priority']='high'):Check=>({category,title,description,priority});
const approval=(name:string)=>requirement('centre_approval','Verify '+name+' centre / qualification scope','Record the awarding body, programme-specific terms, authorised assessment route, written evidence and renewal period. A teaching course is not external examination approval.','critical');
const spec=()=>requirement('assessment','Current syllabus and assessment version','Check the official source, qualification/subject code, edition or exam series, unit outcomes and permitted materials.','critical');
const quality=()=>requirement('iqa','Staff competence and independent quality review','Verify teacher/assessor credentials where required, moderation, conflicts, appeals, reasonable adjustments and learner evidence.','high');
const materials=()=>requirement('policies','Rights and teaching resources','Check publisher licences for downloads, private materials, mark schemes and recordings; link to official portals when copying is not permitted.','high');
const safety=()=>requirement('safeguarding','Local safety and accessibility','Confirm learner welfare, accessible facilities, staff safeguarding, practical supervision, data privacy and incident procedures.','high');
const learning=(name:string)=>[
 requirement('assessment',name+' lesson and practice design','Define entry level, objectives, learner practice, feedback, assessment evidence, accessible content and human review.','high'),
 materials(),safety()
] as const;
const uk=(key:string,label:string,authority:string,url:string):ReadinessTrack=>({
 key,label,family:'UK diplomas',authority,officialUrl:url,workspace:'/director/course-content',
 scope:'Qualification-specific centre recognition, unit delivery and internal/external quality conditions must be independently checked.',
 requirements:[approval(label),spec(),quality(),materials(),safety()]
});
const school=(key:string,label:string,authority:string,url:string):ReadinessTrack=>({
 key,label,family:key.startsWith('bise')||key==='fbise'||key==='aku-eb'?'Pakistan boards':'International schools',
 authority,officialUrl:url,workspace:'/director/course-content',
 scope:'Preparation and mock teaching are separate from official exam entry, authorised exam delivery or certificate issuance.',
 requirements:[approval(label+' registration or exam-entry route'),spec(),requirement('assessment','Board-specific paper and practical components','Confirm exact board, syllabus code, annual examination series, paper weightings, practical equipment and supervised mocks.'),materials(),safety()]
});
export const READINESS_TRACKS:readonly ReadinessTrack[]=[
 uk('OTHM','OTHM','OTHM','https://othm.org.uk/'),
 uk('QUALIFI','Qualifi','Qualifi','https://qualifi.net/become-an-approved-centre/'),
 uk('ATHE','ATHE','ATHE','https://athe.co.uk/become-an-athe-centre/'),
 uk('IAB','IAB accounting','IAB','https://www.iab.org.uk/'),
 uk('PEARSON_BTEC','Pearson BTEC','Pearson','https://qualifications.pearson.com/en/forms/sign-up-to-teach.html'),
 school('PEARSON_EDEXCEL','Pearson Edexcel international GCSE / A level','Pearson','https://qualifications.pearson.com/en/forms/sign-up-to-teach.html'),
 school('CAMBRIDGE','Cambridge International IGCSE / O / AS / A','Cambridge International','https://www.cambridgeinternational.org/'),
 school('FBISE','FBISE SSC and HSSC','FBISE','https://fbise.edu.pk/'),
 school('BISE_RAWALPINDI','BISE Rawalpindi SSC / HSSC','BISE Rawalpindi','https://biserawalpindi.edu.pk/'),
 school('BISE_LAHORE','BISE Lahore SSC / HSSC','BISE Lahore','https://www.biselahore.com/'),
 school('BISE_OTHER','Other Pakistan BISE boards','Relevant named BISE','https://ibcc.edu.pk/'),
 school('AKU_EB','AKU-EB examinations','Aga Khan University Examination Board','https://examinationboard.aku.edu/'),
 {
  key:'NAVTTC',label:'NAVTTC registration and NVQF vocational pathways',family:'Vocational Pakistan',authority:'NAVTTC / relevant accredited QAB',
  officialUrl:'https://navttc.gov.pk/registration/',workspace:'/funded-courses',
  scope:'Institute registration, accreditation, qualification assessment and funded training contracts are distinct; verify each status.',
  requirements:[approval('NAVTTC institute registration'),requirement('centre_approval','NAC-TVS / QAB affiliation evidence','Check relevant approval and named qualification awarding/assessment body; registration alone does not confer accredited vocational awards.','critical'),spec(),requirement('assessment','Practical labs and CBT&A assessor readiness','Record approved trade standards, equipment, learner safety, certified assessors and practical assessment controls.','critical'),safety()]
 },
 {
  key:'PSDF',label:'Punjab Skills Development Fund opportunities',family:'Vocational Pakistan',authority:'PSDF',
  officialUrl:'https://www.psdf.org.pk/',workspace:'/director/funding',
  scope:'Funding calls and contract eligibility must be checked against the latest published PSDF requirements.',
  requirements:[requirement('centre_approval','Current PSDF tender and eligibility','Keep the actual programme notice, delivery location, legal capacity and signed award/contract evidence.','critical'),requirement('policies','Attendance, disbursement and audit controls','Validate cohort attendance, learner identity, completion evidence, monitoring and permitted funding reconciliation.'),safety()]
 },
 {
  key:'PBTE',label:'Punjab Board of Technical Education',family:'Vocational Pakistan',authority:'PBTE / relevant QAB',
  officialUrl:'https://navttc.gov.pk/affiliation/',workspace:'/director/course-content',
  scope:'Verify the exact trade, centre affiliation and authorised assessment or certification body.',
  requirements:[approval('trade-specific affiliation'),spec(),quality(),safety()]
 },
 {
  key:'IELTS',label:'IELTS Academic and General preparation',family:'Language learning',authority:'IELTS / British Council partner routes',
  officialUrl:'https://www.britishcouncil.pk/partnerships/ielts-partnership-programme',workspace:'/director/ielts',
  scope:'Teaching preparation, registration partnerships and exam/test-centre operations have separate approvals; one does not imply another.',
  requirements:[...learning('IELTS skills and band feedback'),requirement('assessment','Speaking, listening and timed mock control','Review audio equipment, consent for recordings, examiner-style feedback, accessibility and human moderation.'),approval('IELTS registration or exam-centre status if claimed')]
 },
 {
  key:'LANGUAGES',label:'English, German, French, Italian, Spanish and Arabic',family:'Language learning',authority:'CEFR / relevant external examination provider',
  officialUrl:'https://www.coe.int/en/web/common-european-framework-reference-languages',workspace:'/director/ielts',
  scope:'CEFR teaching levels and external Goethe, telc, TestDaF, DELF, DELE and other exam entries are different services.',
  requirements:[...learning('Language CEFR progression'),requirement('assessment','Level, oral assessment and feedback','Track each language/level, instructor proficiency, supervised oral practice, marking guidance and learner progression.'),approval('external language exam entries where advertised')]
 },
 {
  key:'LANGUAGE_LAB',label:'Language lab and recorded practice',family:'Language learning',authority:'UniPathway teaching / Microsoft 365 as configured',
  officialUrl:'https://www.britishcouncil.pk/',workspace:'/director/microsoft-education',
  scope:'Language-lab resources, Teams recordings, permissions and teacher moderation require verification before live delivery.',
  requirements:[requirement('centre_approval','Lab capacity and acoustic equipment','Verify headsets, microphones, teacher station, safe accessible desks, connectivity, backups and supervised sessions.','critical'),requirement('policies','Audio/video recording consent and retention','Confirm consent, purpose, private access, deletion/retention, copyright and learner appeal process.','critical'),requirement('assessment','Speaking/listening drills and recording playback','Check authored practice, oral rubric, group timing, staff feedback and recording access.'),safety()]
 },
 {
  key:'TECH',label:'Programming, data, AI and software training',family:'Technology & labs',authority:'UniPathway and selected external vendors',
  officialUrl:'https://aws.amazon.com/training/',workspace:'/director/course-content',
  scope:'Teaching project completion is not an AWS, Microsoft, CompTIA, Cisco or other vendor certificate.',
  requirements:[...learning('Programming and project portfolio'),requirement('assessment','Secure source code and assessment environments','Verify isolated repositories, learner intellectual-property permissions, reproducibility and independent marking.'),quality()]
 },
 {
  key:'TECH_LAB',label:'Cloud, cyber and virtual lab provisioning',family:'Technology & labs',authority:'UniPathway managed labs / AWS / Azure / GitHub',
  officialUrl:'https://aws.amazon.com/training/awsacademy/',workspace:'/director/managed-labs',
  scope:'A configured lab curriculum does not establish an available provider account, safe VM, active gateway, cloud budget or student launch rights.',
  requirements:[requirement('centre_approval','Provider tenant and funding caps','Confirm actual authorised provider account, approved capacity, budgets, shutdown timers and test environment.','critical'),requirement('assessment','Student isolation, access and lab assessment','Prove centre, session and student access boundaries, lab image security, browser sandboxing and graded evidence.','critical'),requirement('policies','Data retention, logs and incident response','Document private workspaces, audit logs, network restrictions, key management and incident recovery.'),safety()]
 },
 {
  key:'CENTRE_OPERATIONS',label:'Centre safety, compliance and quality operations',family:'Centre operations',authority:'UniPathway / competent local authority',
  officialUrl:'https://navttc.gov.pk/registration/',workspace:'/director/readiness',
  scope:'Internal review only; no provider accreditation or government permission is inferred.',
  requirements:[requirement('centre_approval','Centre lease and operating conditions','Review authorised premises, capacity, fire and electrical safety, accessibility and lawful operations.','critical'),requirement('policies','Governance, privacy, complaints and safeguarding','Confirm staff contracts, risk assessments, parental/learner consent, records retention and accessible complaints.'),requirement('ongoing_quality','Centre QA and lesson observations','Check attendance correction, lecturer support, student feedback, independent assessments and corrective actions.')]
 }
];
export const READINESS_FAMILIES=[...new Set(READINESS_TRACKS.map(x=>x.family))];
export const byKey=new Map(READINESS_TRACKS.map(t=>[t.key,t]));
export type RecordedCompliance={id:string;tenant_id:string;awarding_body:string;category:string;item_title:string;item_description:string|null;is_completed:boolean;evidence_notes:string|null;evidence_url:string|null;due_date:string|null;priority:string;updated_at:string};
export function matchRequirements(track:ReadinessTrack,rows:readonly RecordedCompliance[],tenantId:string){
 const selected=rows.filter(r=>r.tenant_id===tenantId&&r.awarding_body===track.key);
 return track.requirements.map(r=>({...r,record:selected.find(x=>x.category===r.category&&x.item_title===r.title)||null}));
}
export function trackInternalEvidenceCount(track:ReadinessTrack,rows:readonly RecordedCompliance[],tenantId:string){
 const refs=matchRequirements(track,rows,tenantId);
 const recorded=refs.filter(x=>x.record);
 const complete=recorded.filter(x=>x.record?.is_completed&&!!x.record.evidence_notes?.trim());
 return {requirements:refs.length,recorded:recorded.length,evidenced:complete.length,missing:refs.length-recorded.length};
}
