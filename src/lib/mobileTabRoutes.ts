/** Route helpers for public and authenticated mobile/tabbed navigation. */
const courseRoots=['study','education-centre','scholarships','school-partners','university-progression','tech-academy','finance-academy','beauty-aesthetics','creative-crafts','qualifications','funded-courses','german-preparation','careers','student-support','courses','tuition','employer-learning','ielts-preparation','pakistan'];
const abroadRoots=['international-study','europe','pathways','germany','uk','usa','canada','australia'];
const publicRoots=new Set([...courseRoots,...abroadRoots,'about','contact','blog','privacy','terms','cookies','disclaimer','login','register','forgot-password','reset-password','apply','verify']);
const clean=(p:string)=>p.replace(/\/+$/,'')||'/';
const root=(p:string)=>clean(p).split('/')[1]||'';
const tenantPublic=(p:string)=>/^\/tenant\/[a-z0-9-]+(?:\/(?:courses|about|contact|germany|uk|pathways|apply)(?:\/[^/]+)?)?$/.test(clean(p));
export const isPublicMobilePath=(path:string)=>clean(path)==='/'||publicRoots.has(root(path))||tenantPublic(path)||clean(path)==='/wellbeing/anonymous';

export const isMobileTabActive=(target:string,current:string):boolean=>{
 target=clean(target);current=clean(current);
 if(target==='/')return current==='/'||/^\/tenant\/[^/]+$/.test(current);
 if(target==='/study')return courseRoots.includes(root(current))||/^\/tenant\/[^/]+\/courses(?:\/|$)/.test(current);
 if(target==='/pathways'||target==='/international-study')return abroadRoots.includes(root(current))||/^\/tenant\/[^/]+\/(?:pathways|uk|germany)(?:\/|$)/.test(current);
 if(target==='/apply')return root(current)==='apply'||/^\/tenant\/[^/]+\/apply(?:\/|$)/.test(current);
 if(target==='/login')return ['login','register','forgot-password','reset-password'].includes(root(current));
 if(target==='/contact')return /^\/tenant\/[^/]+\/contact(?:\/|$)/.test(current)||current==='/contact';
 return current===target||current.startsWith(target+'/');
};

// Exact tab destinations win; aliases express the current task, not access rights.
// Never highlight a role home merely because every page shares its URL prefix.
const aliases:Record<string,Record<string,readonly string[]>>={
 student:{
  '/student/courses':['/student/module','/student/lessons','/student/library','/student/materials','/student/lesson-archive','/student/learning-plan','/student/labs','/student/managed-labs','/student/ielts','/student/classroom','/student/timeline','/student/downloads','/student/microsoft','/labs/tech','/labs/language'],
  '/student/assignments':['/student/quizzes'],
  '/student/grades':['/student/gradebook','/student/appeals'],
  '/student/wellbeing':['/student/support','/student/family-sharing'],
 },
 lecturer:{
  '/lecturer/teaching':['/lecturer/module','/lecturer/lessons','/lecturer/materials','/lecturer/course-content','/lecturer/learning-plans','/lecturer/assessments','/lecturer/marking','/lecturer/gradebook','/lecturer/quizzes','/lecturer/lesson-archive','/lecturer/labs','/lecturer/managed-labs','/labs/teach','/labs/tech','/labs/language'],
  '/lecturer/classroom':['/lecturer/class-scheduler','/lecturer/class-release','/lecturer/whiteboards','/classroom/teaching','/classroom/whiteboard','/classroom/discussion'],
  '/lecturer/students':['/lecturer/attendance','/lecturer/attendance-corrections','/lecturer/report-cards','/lecturer/guardian-support'],
  '/messaging':['/lecturer/messages'],
 },
 parent_guardian:{'/parent/progress':['/parent/learning','/parent/attendance','/parent/schedule']},
 centre_director:{'/director/staff':['/director/staff-access']},
 finance_officer:{'/finance/invoices':['/finance/payments']},
 assessor:{'/assessor':['/assessor/queue']},
};
export function activeDashboardTab(role:string,paths:readonly string[],current:string):string|undefined{
 current=clean(current);
 const exact=paths.find(p=>clean(p)===current);
 if(exact)return exact;
 const matches=(p:string)=>current===p||current.startsWith(p+'/');
 const nested=paths.filter(p=>p.split('/').filter(Boolean).length>1&&matches(clean(p))).sort((a,b)=>b.length-a.length)[0];
 if(nested)return nested;
 const allowed=aliases[role]||{};
 return paths.find(p=>allowed[p]?.some(matches));
}
