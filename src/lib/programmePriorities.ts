/** Business planning defaults, not awarding-body approval or live availability. */
export const programmePriorities = [
  { id: 'othm', title: 'OTHM qualifications', category: 'Primary', description: 'Online learning with two 14-day centre visits per academic year.', to: '/courses' },
  { id: 'qualifi', title: 'Qualifi qualifications', category: 'Primary', description: 'Online learning with two 14-day centre visits per academic year.', to: '/courses' },
  { id: 'accountancy', title: 'Accountancy', category: 'Primary', description: 'Accounting, bookkeeping and professional skills. Check the available programme and awarding body.', to: '/courses' },
  { id: 'it', title: 'IT training', category: 'Primary', description: 'Technical skills, practical learning and digital career development.', to: '/contact' },
  { id: 'tuition', title: 'Subject tuition', category: 'Tuition and English', description: 'English, maths, chemistry, biology and physics tuition.', to: '/tuition' },
  { id: 'ielts', title: 'IELTS training', category: 'Tuition and English', description: 'English-language preparation for your next study step. Test booking and exam fees are separate unless confirmed.', to: '/contact' },
  { id: 'funded', title: 'Pakistan-funded courses', category: 'Funding', description: 'Enquire about funded opportunities in Pakistan. Scheme, provider approval, eligibility and available places must be confirmed.', to: '/contact' },
  { id: 'international', title: 'International opportunities', category: 'Funding', description: 'Explore international study and funding enquiries; availability depends on the programme and partner.', to: '/contact' },
] as const;
export const progressionDestinations = ['UK', 'USA', 'Australia', 'Canada', 'Germany'] as const;
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
