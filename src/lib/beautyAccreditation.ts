/** CIBTAC titles, codes and regulated qualification references from their official
 * Beauty Therapy, Nails, Make-up and Advanced Aesthetics listings, reviewed 18 Oct 2026.
 * Public exposure does NOT mean UniPathway has CIBTAC approval, course availability,
 * insurance, licensed equipment, or authority to certify students.
 */
export type BeautyLevel = 2 | 3 | 4;
export type BeautyArea = 'Beauty therapy' | 'Make-up' | 'Nails' | 'Advanced aesthetics';
export type BeautyQualification = {
  code:string; name:string; level:BeautyLevel; qan:string;
  area:BeautyArea; source:string; supervisedPractice:boolean; advanced:boolean;
};
const beauty='https://www.cibtac.com/Qualifications/Beauty/Beauty-Therapy';
const makeup='https://www.cibtac.com/Qualifications/Beauty/Make-Up';
const nails='https://cibtac.com/Qualifications/Beauty/Nails';
const aesthetics='https://www.cibtac.com/Qualifications/Advanced-Aesthetics';

export const cibtacQualifications:BeautyQualification[] = [
  {code:'CBA04',name:'CIBTAC Level 2 Award in Facial Skincare',level:2,qan:'600/8651/8',area:'Beauty therapy',source:beauty,supervisedPractice:true,advanced:false},
  {code:'CBD02',name:'CIBTAC Level 2 Diploma in Beauty Therapy Services',level:2,qan:'603/2234/2',area:'Beauty therapy',source:beauty,supervisedPractice:true,advanced:false},
  {code:'CBA10',name:'CIBTAC Level 2 Award in Infection Prevention & Control',level:2,qan:'603/7330/1',area:'Beauty therapy',source:beauty,supervisedPractice:false,advanced:false},
  {code:'CBD06',name:'CIBTAC Level 2 Diploma in Eyebrow and Eyelash Specialist Treatments',level:2,qan:'610/1437/0',area:'Beauty therapy',source:beauty,supervisedPractice:true,advanced:false},
  {code:'CNC02',name:'CIBTAC Level 2 Certificate in Nail Services',level:2,qan:'603/2305/X',area:'Nails',source:nails,supervisedPractice:true,advanced:false},
  {code:'CMA04',name:'CIBTAC Level 2 Award in Providing Make-Up Application',level:2,qan:'601/8070/5',area:'Make-up',source:makeup,supervisedPractice:true,advanced:false},
  {code:'CBC04',name:'CIBTAC Level 3 Certificate in Body Massage',level:3,qan:'603/1952/5',area:'Beauty therapy',source:beauty,supervisedPractice:true,advanced:false},
  {code:'CBD03',name:'CIBTAC Level 3 Diploma in Beauty Therapy',level:3,qan:'601/8423/1',area:'Beauty therapy',source:beauty,supervisedPractice:true,advanced:false},
  {code:'CNC01',name:'CIBTAC Level 3 Certificate in Nail Technology',level:3,qan:'610/3553/1',area:'Nails',source:nails,supervisedPractice:true,advanced:false},
  {code:'CMC03',name:'CIBTAC Level 3 Certificate in Fashion and Photographic Make-Up',level:3,qan:'603/2351/6',area:'Make-up',source:makeup,supervisedPractice:true,advanced:false},
  {code:'CMD01',name:'CIBTAC Level 3 Diploma in Fashion, Photographic and Media Make-up',level:3,qan:'603/2445/4',area:'Make-up',source:makeup,supervisedPractice:true,advanced:false},
  {code:'CSDA01',name:'CIBTAC Level 4 Award in Core Knowledge for Aesthetic Practice',level:4,qan:'603/0155/7',area:'Advanced aesthetics',source:aesthetics,supervisedPractice:false,advanced:true},
  {code:'CSDA02',name:'CIBTAC Level 4 Award in Advanced Skin Science',level:4,qan:'603/0157/0',area:'Advanced aesthetics',source:aesthetics,supervisedPractice:false,advanced:true},
  {code:'CSDA03',name:'CIBTAC Level 4 Award in Skin Health Assessment for Aesthetic Practitioners',level:4,qan:'603/0158/2',area:'Advanced aesthetics',source:aesthetics,supervisedPractice:true,advanced:true},
  {code:'CAAA02',name:'CIBTAC Level 4 Award in Microneedling Treatments',level:4,qan:'603/5252/8',area:'Advanced aesthetics',source:aesthetics,supervisedPractice:true,advanced:true},
  {code:'CAAA01',name:'CIBTAC Level 4 Award in Skin Peeling Treatments',level:4,qan:'603/5211/5',area:'Advanced aesthetics',source:aesthetics,supervisedPractice:true,advanced:true},
  {code:'CSDD05',name:'CIBTAC Level 4 Diploma in Advanced Skin Studies and Aesthetic Practice',level:4,qan:'603/7113/4',area:'Advanced aesthetics',source:aesthetics,supervisedPractice:true,advanced:true},
  {code:'CAAA05',name:'CIBTAC Level 4 Award in Dermaplaning Treatments',level:4,qan:'610/4439/8',area:'Advanced aesthetics',source:aesthetics,supervisedPractice:true,advanced:true},
];

export type ProposedShortCourse = {id:string;name:string;subject:string;length:'Short course'|'Workshop';practice:boolean};
export const cpdCandidateCourses:ProposedShortCourse[]=[
  {id:'bridal-makeup',name:'Bridal & Occasion Make-Up',subject:'Make-up',length:'Short course',practice:true},
  {id:'nail-hygiene',name:'Nail Hygiene & Client Safety',subject:'Nails',length:'Workshop',practice:true},
  {id:'salon-infection-control',name:'Salon Infection Control & Sanitation',subject:'Safety',length:'Short course',practice:true},
  {id:'beauty-business',name:'Beauty Salon Business & Customer Care',subject:'Business',length:'Short course',practice:false},
  {id:'social-marketing',name:'Digital Marketing for Beauty Professionals',subject:'Business',length:'Workshop',practice:false},
  {id:'facial-consultation',name:'Facial Consultation & Product Knowledge',subject:'Beauty',length:'Short course',practice:true},
  {id:'beauty-portfolio',name:'Beauty Photography & Professional Portfolio',subject:'Creative',length:'Workshop',practice:false},
];
export type AcademyAccreditationScheme='cibtac_centre'|'cpduk_provider'|'cibtac_endorsed';
export const academyAccreditationSchemes=[
  {id:'cibtac_centre' as const,name:'CIBTAC Centre Accreditation',organisation:'CIBTAC',url:'https://cibtac.com/Centres/Become-a-Centre',contact:'accreditation@cibtac.com',description:'Centre approval and permission to teach selected regulated CIBTAC qualifications.',checklist:['Proposed qualification list and entry conditions','Trainer and assessor competence','Dedicated safe and accessible practical rooms','Treatment equipment and infection prevention','Learner welfare and consent policies','Internal QA, assessments, verifications and records','Centre visit, awarding-body agreement and approval evidence']},
  {id:'cpduk_provider' as const,name:'CPD UK Provider Accreditation',organisation:'The CPD Certification Service',url:'https://www.cpduk.co.uk/become-accredited',contact:null,description:'Organisation membership and individual CPD course review, separate from regulated qualifications.',checklist:['Proposed course inventory and learner profiles','Learning objectives, syllabus and hours','Trainer qualifications and source references','Assessment and evaluation arrangements','Attendance, certification and feedback procedure','Submit individual courses to CPD UK for assessment','Retain confirmed certificate, course ID, use permissions and expiry']},
  {id:'cibtac_endorsed' as const,name:'CIBTAC Endorsed Training (optional)',organisation:'CIBTAC',url:'https://cibtac.com/Endorsed',contact:'endorsed@cibtac.com',description:'Separate CIBTAC endorsement route for eligible product, equipment or treatment-focused continuing training.',checklist:['Separate training syllabus and learner outcomes','Industry demand and trainer competence','Equipment and safe practical assessment','Endorsement agreement and approved materials']},
];
export type AcademyAccreditationStatus='research'|'evidence'|'submitted'|'review'|'approved'|'declined'|'expired';
export const accreditationStages:AcademyAccreditationStatus[]=['research','evidence','submitted','review','approved','declined','expired'];
export function mayAdvertiseAward(status:AcademyAccreditationStatus, hasEvidence:boolean, expiresOn?:string|null, today=new Date()):boolean {
  return status==='approved' && hasEvidence && (!expiresOn || new Date(expiresOn+'T23:59:59Z').getTime()>=today.getTime());
}
