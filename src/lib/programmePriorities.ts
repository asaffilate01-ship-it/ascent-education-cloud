/** Proposed teaching priorities. Listing here is not equivalent to current centre approval, enrolment availability or a funded place. */
export const programmePriorities = [
  { id: 'beauty', title: 'Women’s Beauty & Aesthetics Academy', category: 'Primary', description: 'Planned ladies’ salon and beauty-therapy courses; CIBTAC centre approval and individual CPD UK course certification require verification.', to: '/beauty-aesthetics' },
  { id: 'othm', title: 'UK business and professional diplomas', category: 'Primary', description: 'Explore planned UK-regulated diploma pathways in business, accounting, IT, health and social care, logistics, law and hospitality. Blended model where approved.', to: '/qualifications?body=OTHM' },
  { id: 'qualifi', title: 'UK technology and care diplomas', category: 'Primary', description: 'Explore planned UK-regulated qualifications in business, accounting, AI, cyber security, IT, healthcare, hospitality and education.', to: '/qualifications?body=Qualifi' },
  { id: 'accountancy', title: 'Accounting and finance', category: 'Primary', description: 'Bookkeeping, finance, taxation, accounts systems and IFA/ACCA examination preparation. Official examinations are separate.', to: '/finance-academy' },
  { id: 'it', title: 'AI, coding and cyber skills', category: 'Primary', description: 'Applied AI and machine learning, Python/Django, full-stack coding, Cyber Essentials awareness, cyber security, cloud, QA and DevOps.', to: '/tech-academy' },
  { id: 'tuition', title: 'Subject tuition', category: 'Tuition and English', description: 'Online and in-centre Years 8–12 tuition: maths, biology, chemistry, physics, English and technology. Matric, Intermediate/FSc and Cambridge O/A Level pathways.', to: '/tuition' },
  { id: 'ielts', title: 'IELTS training', category: 'Tuition and English', description: 'IELTS Academic and General Training preparation, practice tests and tutor-led English tuition; formal examination booking is separate.', to: '/ielts-preparation' },
  { id: 'german', title: 'German language and university preparation', category: 'Tuition and English', description: 'German A1–C1 language courses and preparation for Goethe, TestDaF, telc and DSH requirements, subject to destination and exam centre.', to: '/german-preparation' },
  { id: 'funded', title: 'Pakistan-funded courses', category: 'Funding', description: 'Browse independent PSDF, e-Rozgaar, WDD SEHR and NAVTTC schemes. Scheme, provider approval, eligibility and available places must be confirmed.', to: '/funded-courses' },
  { id: 'international', title: 'International opportunities', category: 'Funding', description: 'Explore Pakistan and international study funding enquiries and scholarships. Individual eligibility and partner availability must be confirmed.', to: '/pathways' },
  { id: 'careers', title: 'Pakistan internships and jobs', category: 'Careers', description: 'Build experience through verified placements and employer introductions in finance, technology, law, healthcare, retail and hospitality.', to: '/careers' },
  { id: 'support', title: 'Study abroad and settling-in support', category: 'Careers', description: 'University applications, accommodation, practical settling-in information and access to qualified immigration advice where required.', to: '/student-support' },
] as const;

export const progressionDestinations = ['Pakistan', 'UK', 'USA', 'Germany', 'Canada', 'Australia'] as const;
export const residentialModel = {
  visitsPerYear: 2, daysPerVisit: 14, teachingHoursPerYear: 72,
  supportHoursPerYear: 3, teachingCapacity: 50, supportCapacity: 10,
  studentsPerCohort: 200, minimumAge: 18,
} as const;

export function residentialCapacity(students: number, usableWeeks: number) {
  if (!Number.isInteger(students) || students < 1 || students > 10000 || !Number.isInteger(usableWeeks) || usableWeeks < 1 || usableWeeks > 52) {
    throw new Error('Enter 1–10,000 students and 1–52 whole usable weeks.');
  }
  const cohorts = Math.ceil(students / residentialModel.studentsPerCohort);
  const requiredWeeks = cohorts * 4;
  return { cohorts, requiredWeeks, bookings: cohorts * 2,
    supportedStudents: Math.floor(usableWeeks / 4) * 200,
    fits: requiredWeeks <= usableWeeks,
    annualTeachingSeatHours: students * 72, annualSupportTutorHours: students * 3,
  };
}

export type RotationSession = { day: number; start: number; end: number; group: string; kind: 'Teaching' | 'Top-up' };
/** Relative-day draft; never creates bookings or published sessions. Minutes are local centre time. */
export function buildResidentialRotation(): RotationSession[] {
  const groups = ['A', 'B', 'C', 'D'];
  const counts = [0, 0, 0, 0];
  const sessions: RotationSession[] = [];
  const spare: { day: number; start: number }[] = [];
  for (let day = 1; day <= 14; day++) {
    const attending = groups.filter((_, index) => index !== (day - 1) % 4);
    attending.forEach((group, slot) => {
      const index = groups.indexOf(group);
      const start = [480, 720, 960][slot];
      if (counts[index] < 10) {
        sessions.push({ day, start, end: start + 210, group, kind: 'Teaching' });
        counts[index]++;
      } else spare.push({ day, start });
    });
  }
  groups.forEach((group, index) => {
    const slot = spare[Math.floor(index / 2)];
    const start = slot.start + (index % 2) * 90;
    sessions.push({ day: slot.day, start, end: start + 60, group, kind: 'Top-up' });
  });
  return sessions.sort((a, b) => a.day - b.day || a.start - b.start);
}
export function groupTripDays(sessions: RotationSession[], group: string) {
  return Array.from({ length: 14 }, (_, i) => i + 1)
    .filter(day => !sessions.some(s => s.group === group && s.day === day)).slice(0, 2);
}
