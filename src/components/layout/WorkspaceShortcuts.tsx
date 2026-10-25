import { Link, useLocation } from 'react-router-dom';
import { useAuth, ROLE_HOME } from '@/contexts/AuthContext';
const shortcuts: Record<string, [string,string][]> = {
 student: [['Live classes','/student/classroom'],['Study materials','/student/materials'],['Assignments','/student/assignments'],['Identity documents','/onboarding']],
 lecturer: [['Live classes','/lecturer/classroom'],['Schedule a class','/lecturer/class-scheduler'],['Study materials','/lecturer/materials'],['Attendance','/lecturer/attendance']],
 centre_director: [['Admissions','/director/admissions'],['Students','/director/students'],['Staff','/director/staff'],['Schedule','/director/schedule']],
 superadmin: [['Centres','/landlord/centres'],['Accounts','/landlord/users'],['Readiness','/landlord/readiness'],['Finance','/landlord/finance']],
 agent: [['My leads','/agent/leads'],['Applications','/agent/applications'],['Messages','/messaging']],
 admissions_admin: [['Applications','/admissions/applications'],['Documents','/admissions/documents'],['Messages','/messaging']],
};
export default function WorkspaceShortcuts(){
 const {user}=useAuth();const {pathname}=useLocation();
 if(!user||pathname!==ROLE_HOME[user.role]||!shortcuts[user.role])return null;
 return <section className="mb-6 rounded-2xl border border-primary/15 bg-card p-4 sm:p-5"><h2 className="text-sm font-bold">What would you like to do?</h2><nav aria-label="Dashboard quick actions" className="mt-3 flex flex-wrap gap-2">{shortcuts[user.role].map(([label,to])=><Link key={to} to={to} className="inline-flex min-h-11 items-center rounded-xl border bg-background px-4 py-2 text-sm font-semibold hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{label}<span aria-hidden="true" className="ml-3">→</span></Link>)}</nav></section>;
}
