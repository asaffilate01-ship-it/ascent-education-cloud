/** UniPathway launch plan. Phase 1 courses open first; Phase 2 courses are shown as
 * "coming soon" with a register-interest route until they are launched. */
export type LaunchPhase = 1 | 2;

export const launchPhaseLabel: Record<LaunchPhase, string> = {
  1: 'Phase 1 · Enrolling first',
  2: 'Phase 2 · Coming soon',
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
/** Tech academy tracks open at Phase 1: vendor certification preparation plus AI courses. */
export const phaseOneTechTracks = ['cert-microsoft', 'cert-aws', 'cert-cisco', 'ai', 'generative-ai'] as const;

export type PhaseOneOffer = { id: string; title: string; summary: string; to: string; area: string };
/** Public wording avoids naming awarding bodies outside the qualifications page. */
export const phaseOneOffers: PhaseOneOffer[] = [
  { id: 'tuition', title: 'Classes 9–12 tuition', summary: 'Sciences, maths, English, technology and commerce for Federal and all provincial boards (Matric, Intermediate), IGCSE, O Level and A Level.', to: '/tuition', area: 'tuition' },
  { id: 'uk-diplomas', title: 'UK Business & Accounting diplomas', summary: 'Levels 3–5 diplomas in business management and accounting, studied online with tutor support.', to: '/qualifications?phase=1', area: 'qualifications' },
  { id: 'acca', title: 'ACCA exam preparation', summary: 'Tutor-led preparation for ACCA Applied Knowledge and Applied Skills papers, with timed mocks and feedback.', to: '/finance-academy#acca-prep', area: 'accounting' },
  { id: 'ielts', title: 'IELTS preparation', summary: 'IELTS Academic and General Training preparation with speaking practice, marked writing and mock tests.', to: '/ielts-preparation', area: 'languages' },
  { id: 'tech-certs', title: 'Tech certifications & AI courses', summary: 'Microsoft, AWS and Cisco certification preparation, plus AI and machine learning courses, with hands-on labs.', to: '/tech-academy#certification-prep', area: 'technology' },
];

/** Phase 2 areas, shown as coming soon until launched. */
export const phaseTwoAreas = [
  'Other UK diploma subjects (IT, cyber security, AI, health and social care, law, hospitality, logistics, Level 6)',
  'Further UK awarding bodies and Pearson qualifications',
  'Pakistan and Punjab vocational courses',
  'Beauty & aesthetics, art, crafts and sewing',
  'German and European languages',
  'Wider technology (coding, cyber, CompTIA), finance and digital skills courses',
] as const;

export const phaseOneQualificationBodies = ['OTHM', 'Qualifi'] as const;
export const phaseOneQualificationCategories = ['Business', 'Accounting & Finance'] as const;

/** Phase 1 = OTHM or Qualifi, Business or Accounting & Finance, Levels 3–5. Everything else is Phase 2. */
export function qualificationPhase(q: { body: string; category: string; level: number }): LaunchPhase {
  return (phaseOneQualificationBodies as readonly string[]).includes(q.body)
    && (phaseOneQualificationCategories as readonly string[]).includes(q.category)
    && q.level >= 3 && q.level <= 5 ? 1 : 2;
}

/** Phase for programme records stored in the LMS (awarding body + title + "Level N"). */
export function programmePhase(p: { awarding_body?: string | null; title: string; level?: string | null }): LaunchPhase {
  const body = String(p.awarding_body || '').toUpperCase();
  const level = Number(String(p.level || p.title).match(/level\s*(\d)/i)?.[1]);
  const subject = /business|accounting|accountancy/i.test(p.title) && !/computing|information technology/i.test(p.title);
  return (body === 'OTHM' || body === 'QUALIFI') && subject && level >= 3 && level <= 5 ? 1 : 2;
}

/** Academy tracks: ACCA preparation and vendor certification preparation open in Phase 1. */
export function academyTrackPhase(kind: 'tech' | 'finance', id: string): LaunchPhase {
  if (kind === 'finance') return id === 'acca-prep' ? 1 : 2;
  return (phaseOneTechTracks as readonly string[]).includes(id) ? 1 : 2;
}

const phaseOneCentrePathways = new Set([
  'pak-matric', 'pak-fsc-pre-medical', 'pak-fsc-pre-engineering', 'pak-fa-ics-icom',
  'cambridge-olevel', 'cambridge-alevel', 'edexcel-international',
  'english-tests', 'cloud-certs', 'network-certs', 'accountancy-certs', 'othm-diplomas', 'qualifi-diplomas',
]);
export function centrePathwayPhase(id: string): LaunchPhase {
  return phaseOneCentrePathways.has(id) ? 1 : 2;
}

/** Public page phases. Services (careers, funding guidance, study abroad) have no phase. */
const routePhases: Record<string, LaunchPhase> = {
  '/tuition': 1, '/ielts-preparation': 1, '/tech-academy': 1, '/finance-academy': 1, '/qualifications': 1, '/education-centre': 1,
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
  tuition: 1, ielts: 1, accountancy: 1, it: 1, othm: 1, qualifi: 1,
  beauty: 2, german: 2, funded: 2,
};
export function priorityPhase(id: string): LaunchPhase | null {
  return priorityPhases[id] ?? null;
}
