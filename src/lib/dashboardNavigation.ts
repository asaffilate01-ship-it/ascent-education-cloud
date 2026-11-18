import type {UserRole} from '@/types/platform';

/**
 * Source-only dashboard next actions, not authorisation. Every destination
 * retains its own guarded route and backend permission checks.
 */
export const DASHBOARD_SHORTCUTS: Record<UserRole, ReadonlyArray<readonly [string,string]>> = {
 student: [['Live classes','/student/classroom'],['Study materials','/student/materials'],['Assignments','/student/assignments'],['Identity documents','/onboarding']],
 lecturer: [['Live classes','/lecturer/classroom'],['Schedule a class','/lecturer/class-scheduler'],['Study materials','/lecturer/materials'],['Attendance','/lecturer/attendance']],
 centre_director: [['Admissions','/director/admissions'],['Students','/director/students'],['Staff','/director/staff'],['Schedule','/director/schedule']],
 superadmin: [['Centres','/landlord/centres'],['Accounts','/landlord/users'],['Readiness','/landlord/readiness'],['Finance','/landlord/finance']],
 agent: [['My leads','/agent/leads'],['Applications','/agent/applications'],['Messages','/messaging']],
 admissions_admin: [['Applications','/admissions/applications'],['Documents','/admissions/documents'],['Messages','/messaging']],
 office_admin: [['My permissions','/office/compliance-preparation'],['Communications','/communications'],['Workspace','/workspace']],
 hr_officer: [['My workspace','/workspace'],['Communications','/communications'],['Messages','/messaging']],
 secretary: [['My permissions','/office/compliance-preparation'],['Communications','/communications'],['Workspace','/workspace']],
 security_officer: [['Visitor reception','/security/visitors'],['Emergency muster','/security/muster'],['Centre occupancy','/security/centre'],['CCTV access','/security']],
 assessor: [['My marking queue','/assessor/queue'],['Communications','/communications'],['Activity log','/my-activity']],
 programme_leader: [['Assessment approval','/programme/assessments'],['Modules','/programme/modules'],['Staff','/programme/lecturers'],['Schedule','/programme/schedule']],
 iqa_officer: [['IQA decisions','/qa/assessment-approval'],['Sampling readiness','/qa/sampling'],['Appeal reviews','/qa/appeals'],['Audit trail','/qa/audit']],
 awarding_body_eqa: [['EQA access status','/eqa'],['Activity log','/my-activity'],['My workspace','/workspace']],
 welfare_officer: [['Learner support','/welfare/support'],['Health records','/health'],['Communications','/communications'],['Messages','/messaging']],
 exams_officer: [['Exam plans','/exams/session-plans'],['Candidates','/exams/candidate-seating'],['Schedule','/exams/schedule'],['Incidents','/exams/incidents']],
 finance_officer: [['Invoices','/finance/invoices'],['Payments','/finance/payments'],['Sponsor funding','/finance/funding'],['Reports','/finance/reports']],
 marketing_officer: [['Lead insights','/marketing/leads'],['Communications','/communications'],['Messages','/messaging']],
 parent_guardian: [['Shared learning','/parent/learning'],['Attendance','/parent/attendance'],['Progress','/parent/progress'],['Messages','/parent/messages']],
 university_partner: [['Referrals','/partner/referrals'],['Applications','/partner/applications'],['Offers','/partner/offers'],['Commissions','/partner/commissions']],
 employer_partner: [['Job posts','/employer/jobs'],['Candidates','/employer/candidates'],['Internships','/employer/internships'],['Messages','/messaging']],
};

/** Dormant roles and unrelated routes cannot render the role's shortcut strip. */
export function dashboardShortcutsFor(
 user:{role:UserRole;roles:readonly UserRole[]}|null,
 pathname:string,roleHome:Record<UserRole,string>,
):ReadonlyArray<readonly [string,string]>{
 if(!user||!Array.isArray(user.roles)||!user.roles.includes(user.role)||
    pathname!==roleHome[user.role])return [];
 return DASHBOARD_SHORTCUTS[user.role]||[];
}
