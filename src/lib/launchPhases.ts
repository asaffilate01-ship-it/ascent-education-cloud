/** Public planning schedule only; actual availability requires confirmed course offers. */
export type LaunchPhase = 1 | 2;

export const launchPhaseLabel: Record<LaunchPhase, string> = {
  1: 'Phase 1 · January 2027 planned',
  2: 'Phase 2 · Future intake / register interest',
};

/** Classes 9–12 tuition offered at Phase 1 launch. */
export const tuitionLaunch = {
  classes: 'Classes 9–12',
  subjectGroups: [
    { group: 'Sciences', subjects: ['Physics', 'Chemistry', 'Biology'] },
    { group: 'Mathematics', subjects: ['Mathematics'] },
    { group: 'English', subjects: ['English'] },
    { group: 'Technology', subjects: ['Computer Science', 'ICT'] },
    { group: 'Commerce', subjects: ['Accounting', 'Business Studies', 'Economics', 'Commerce'] },
  ],
  pakistanBoards: [
    { id: 'FBISE', label: 'Federal Board (FBISE)' },
    { id: 'Punjab_BISE', label: 'Punjab boards (BISE)' },
    { id: 'Sindh_BISE', label: 'Sindh boards (BISE / BIEK)' },
    { id: 'KPK_BISE', label: 'Khyber Pakhtunkhwa boards (BISE)' },
    { id: 'Balochistan_BISE', label: 'Balochistan Board (BISE Quetta)' },
    { id: 'AJK_BISE', label: 'Azad Jammu & Kashmir Board (AJK BISE)' },
  ],
  internationalBoards: [
    { id: 'Cambridge', label: 'Cambridge International — IGCSE, O Level, AS & A Level' },
    { id: 'Edexcel', label: 'Pearson Edexcel — International GCSE & International A Level' },
  ],
  stages: [
    { title: 'Matric / SSC — Classes 9–10', detail: 'Science group subjects for Federal and all provincial board papers, with past papers and practical preparation.' },
    { title: 'Intermediate / HSSC — Classes 11–12', detail: 'FSc Pre-Medical, FSc Pre-Engineering, ICS and ICom for Federal and all provincial board examinations.' },
    { title: 'IGCSE / O Level — Classes 9–10', detail: 'Cambridge IGCSE and O Level, and Pearson Edexcel International GCSE, including commerce subjects.' },
    { title: 'AS & A Level — Classes 11–12', detail: 'Cambridge AS & A Level and Pearson Edexcel International A Level, subject by subject.' },
  ],
} as const;

export const tuitionSubjects = tuitionLaunch.subjectGroups.flatMap(g => g.subjects);

/** Technology certification exams prepared for at Phase 1 launch. Exams are booked separately with each vendor. */
export const techCertifications = [
  { vendor: 'Microsoft', exams: ['Azure Fundamentals (AZ-900)', 'Azure AI Fundamentals (AI-900)', 'Microsoft Office Specialist — Excel'] },
  { vendor: 'AWS', exams: ['AWS Certified Cloud Practitioner', 'AWS Certified AI Practitioner'] },
  { vendor: 'Cisco', exams: ['Cisco CCNA', 'Cisco CyberOps Associate'] },
] as const;
/** Initial intake priorities: preparation and practical skills, not vendor awards. */
export const phaseOneTechTracks = ['cert-microsoft', 'cert-aws', 'cert-cisco', 'ai', 'generative-ai', 'python', 'web', 'cloud', 'analytics'] as const;

export type PhaseOneOffer = { id: string; title: string; summary: string; to: string; area: string };
/** Public wording avoids naming awarding bodies outside the qualifications page. */
export const phaseOneOffers: PhaseOneOffer[] = [
  { id: 'tuition', title: 'Classes 9–12 tuition', summary: 'Sciences, maths, English, technology and commerce for Federal and all provincial boards (Matric, Intermediate), IGCSE, O Level and A Level.', to: '/tuition', area: 'tuition' },
  { id: 'acca', title: 'ACCA exam preparation', summary: 'Tutor-led preparation for ACCA Applied Knowledge and Applied Skills papers, with timed mocks and feedback.', to: '/finance-academy#acca-prep', area: 'accounting' },
  { id: 'ielts', title: 'IELTS preparation', summary: 'IELTS Academic and General Training preparation with speaking practice, marked writing and mock tests.', to: '/ielts-preparation', area: 'languages' },
  { id: 'tech-certs', title: 'Tech certifications & AI courses', summary: 'AI, coding, cloud computing and databases, with Microsoft, AWS and Cisco certification preparation and practical skills.', to: '/tech-academy#certification-prep', area: 'technology' },
];

/** Phase 2 areas, shown as coming soon until launched. */
export const phaseTwoAreas = [
  'Planned later in 2027: Levels 3, 4 and 5 in technology, business and accounting (subject to awarding-body and centre approvals)',
  'Further UK awarding bodies and Pearson qualifications',
  'Pakistan and Punjab vocational courses',
  'Beauty & aesthetics, art, crafts and sewing',
  'German and European languages',
  'Wider cyber security, CompTIA, finance and digital skills courses; further subjects and Level 6 provision remain under review',
] as const;

export const phaseOneQualificationBodies: readonly string[] = [];
export const phaseOneQualificationCategories: readonly string[] = [];
export const later2027QualificationBodies = ['OTHM', 'Qualifi'] as const;
export const later2027QualificationCategories = ['Business', 'Accounting & Finance', 'Technology & Cyber Security'] as const;

/** All regulated diploma catalogue entries remain future-intake interest, not January enrolment. */
export function qualificationPhase(_q: { body: string; category: string; level: number }): LaunchPhase { return 2; }
export function plannedLater2027Qualification(q:{body:string;category:string;level:number}):boolean{
 return (later2027QualificationBodies as readonly string[]).includes(q.body)&&(later2027QualificationCategories as readonly string[]).includes(q.category)&&[3,4,5].includes(q.level);
}

/** Phase for programme records stored in the LMS (awarding body + title + "Level N"). */
export function programmePhase(p: { awarding_body?: string | null; title: string; level?: string | null }): LaunchPhase {
  // Catalogue planning only; existing student enrolments and authorised programme records are unchanged.
  void p;
  return 2;
}

/** Academy tracks: ACCA preparation and vendor certification preparation open in Phase 1. */
export function academyTrackPhase(kind: 'tech' | 'finance', id: string): LaunchPhase {
  if (kind === 'finance') return id === 'acca-prep' ? 1 : 2;
  return (phaseOneTechTracks as readonly string[]).includes(id) ? 1 : 2;
}

const phaseOneCentrePathways = new Set([
  'pak-matric', 'pak-fsc-pre-medical', 'pak-fsc-pre-engineering', 'pak-fa-ics-icom',
  'cambridge-olevel', 'cambridge-alevel', 'edexcel-international',
  'english-tests', 'cloud-certs', 'network-certs', 'software-data', 'accountancy-certs',
]);
export function centrePathwayPhase(id: string): LaunchPhase {
  return phaseOneCentrePathways.has(id) ? 1 : 2;
}

/** Public page phases. Services (careers, funding guidance, study abroad) have no phase. */
const routePhases: Record<string, LaunchPhase> = {
  '/tuition': 1, '/ielts-preparation': 1, '/tech-academy': 1, '/finance-academy': 1, '/qualifications': 2, '/education-centre': 1,
  '/beauty-aesthetics': 2, '/creative-crafts': 2, '/german-preparation': 2, '/funded-courses': 2,
};
export function routePhase(to: string): LaunchPhase | null {
  return routePhases[to.split(/[?#]/)[0]] ?? null;
}

/** Sort helper: Phase 1 first, then Phase 2, then items with no phase; stable otherwise. */
export function byLaunchPhase<T>(items: readonly T[], phaseOf: (item: T) => LaunchPhase | null): T[] {
  const rank = (item: T) => phaseOf(item) ?? 3;
  return items.map((item, index) => ({ item, index })).sort((a, b) => rank(a.item) - rank(b.item) || a.index - b.index).map(x => x.item);
}

/** Register-interest enquiry for a Phase 2 course. */
export function registerInterestUrl(area: string, course?: string) {
  const params = new URLSearchParams({ area });
  if (course) params.set('course', course);
  return `/apply?${params}`;
}

/** Study-guide priorities (see programmePriorities). Services have no phase. */
const priorityPhases: Record<string, LaunchPhase> = {
  tuition: 1, ielts: 1, accountancy: 1, it: 1, othm: 2, qualifi: 2,
  beauty: 2, german: 2, funded: 2,
};
export function priorityPhase(id: string): LaunchPhase | null {
  return priorityPhases[id] ?? null;
}
