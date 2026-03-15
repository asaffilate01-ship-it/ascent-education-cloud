import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// SaaS Platform (Landlord)
import SaaSLandingPage from "./pages/SaaSLandingPage";
import LandlordDashboard from "./pages/landlord/LandlordDashboard";
import TenantOnboarding from "./pages/landlord/TenantOnboarding";
import SuperadminPlatform from "./pages/superadmin/SuperadminPlatform";

// Tenant
import TenantLandingPage from "./pages/tenant/TenantLandingPage";
import TenantAdminDashboard from "./pages/tenant/TenantAdminDashboard";
import TenantBranding from "./pages/tenant/TenantBranding";
import CentreDirectorDashboard from "./pages/director/CentreDirectorDashboard";

// Modules
import AdmissionsCRM from "./pages/admissions/AdmissionsCRM";
import QADashboard from "./pages/qa/QADashboard";
import FinanceDashboard from "./pages/finance/FinanceDashboard";
import ExamsDashboard from "./pages/exams/ExamsDashboard";
import ProgressionDashboard from "./pages/progression/ProgressionDashboard";
import AttendanceDashboard from "./pages/attendance/AttendanceDashboard";

// Virtual Classroom
import VirtualClassroom from "./pages/classroom/VirtualClassroom";

// Student sub-pages
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentCourses from "./pages/student/StudentCourses";
import StudentAssignments from "./pages/student/StudentAssignments";
import StudentGrades from "./pages/student/StudentGrades";
import StudentLibrary from "./pages/student/StudentLibrary";
import StudentCareer from "./pages/student/StudentCareer";

// Lecturer sub-pages
import LecturerDashboard from "./pages/lecturer/LecturerDashboard";
import LecturerTeaching from "./pages/lecturer/LecturerTeaching";
import LecturerMarking from "./pages/lecturer/LecturerMarking";
import LecturerAttendance from "./pages/lecturer/LecturerAttendance";

// Messaging
import MessagingInbox from "./pages/messaging/MessagingInbox";

// User portals
import AgentDashboard from "./pages/agent/AgentDashboard";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* ========== PUBLIC ROUTES ========== */}
      <Route path="/" element={<SaaSLandingPage />} />
      <Route path="/tenant/:slug" element={<TenantLandingPage />} />

      {/* ========== LANDLORD (SaaS Owner) ========== */}
      <Route path="/landlord" element={<LandlordDashboard />} />
      <Route path="/landlord/centres" element={<LandlordDashboard />} />
      <Route path="/landlord/users" element={<LandlordDashboard />} />
      <Route path="/landlord/finance" element={<FinanceDashboard />} />
      <Route path="/landlord/subscriptions" element={<SuperadminPlatform />} />
      <Route path="/landlord/compliance" element={<QADashboard />} />
      <Route path="/landlord/onboarding" element={<TenantOnboarding />} />
      <Route path="/landlord/audit" element={<QADashboard />} />
      <Route path="/landlord/infrastructure" element={<SuperadminPlatform />} />
      <Route path="/landlord/settings" element={<LandlordDashboard />} />

      {/* ========== TENANT: Centre Director ========== */}
      <Route path="/director" element={<CentreDirectorDashboard />} />
      <Route path="/director/admissions" element={<AdmissionsCRM />} />
      <Route path="/director/programmes" element={<CentreDirectorDashboard />} />
      <Route path="/director/staff" element={<CentreDirectorDashboard />} />
      <Route path="/director/students" element={<CentreDirectorDashboard />} />
      <Route path="/director/quality" element={<QADashboard />} />
      <Route path="/director/finance" element={<FinanceDashboard />} />
      <Route path="/director/agents" element={<AgentDashboard />} />
      <Route path="/director/branding" element={<TenantBranding />} />
      <Route path="/director/reports" element={<CentreDirectorDashboard />} />
      <Route path="/director/settings" element={<CentreDirectorDashboard />} />

      {/* ========== TENANT: Admissions Admin ========== */}
      <Route path="/admissions" element={<AdmissionsCRM />} />
      <Route path="/admissions/applications" element={<AdmissionsCRM />} />
      <Route path="/admissions/documents" element={<AdmissionsCRM />} />
      <Route path="/admissions/eligibility" element={<AdmissionsCRM />} />
      <Route path="/admissions/offers" element={<AdmissionsCRM />} />
      <Route path="/admissions/counselling" element={<AdmissionsCRM />} />
      <Route path="/admissions/reports" element={<AdmissionsCRM />} />

      {/* ========== TENANT: Lecturer ========== */}
      <Route path="/lecturer" element={<LecturerDashboard />} />
      <Route path="/lecturer/teaching" element={<LecturerTeaching />} />
      <Route path="/lecturer/classroom" element={<VirtualClassroom />} />
      <Route path="/lecturer/marking" element={<LecturerMarking />} />
      <Route path="/lecturer/attendance" element={<LecturerAttendance />} />
      <Route path="/lecturer/students" element={<LecturerDashboard />} />
      <Route path="/lecturer/analytics" element={<LecturerDashboard />} />
      <Route path="/lecturer/messages" element={<MessagingInbox />} />

      {/* ========== TENANT: Programme Leader ========== */}
      <Route path="/programme" element={<LecturerDashboard />} />
      <Route path="/programme/modules" element={<LecturerTeaching />} />
      <Route path="/programme/lecturers" element={<LecturerDashboard />} />
      <Route path="/programme/students" element={<LecturerDashboard />} />
      <Route path="/programme/assessments" element={<LecturerMarking />} />
      <Route path="/programme/moderation" element={<QADashboard />} />
      <Route path="/programme/analytics" element={<LecturerDashboard />} />

      {/* ========== TENANT: IQA / QA Officer ========== */}
      <Route path="/qa" element={<QADashboard />} />
      <Route path="/qa/moderation" element={<QADashboard />} />
      <Route path="/qa/sampling" element={<QADashboard />} />
      <Route path="/qa/plagiarism" element={<QADashboard />} />
      <Route path="/qa/malpractice" element={<QADashboard />} />
      <Route path="/qa/appeals" element={<QADashboard />} />
      <Route path="/qa/audit" element={<QADashboard />} />
      <Route path="/qa/evidence" element={<QADashboard />} />

      {/* ========== TENANT: Exams Officer ========== */}
      <Route path="/exams" element={<ExamsDashboard />} />
      <Route path="/exams/schedule" element={<ExamsDashboard />} />
      <Route path="/exams/rooms" element={<ExamsDashboard />} />
      <Route path="/exams/seating" element={<ExamsDashboard />} />
      <Route path="/exams/entry" element={<ExamsDashboard />} />
      <Route path="/exams/incidents" element={<ExamsDashboard />} />
      <Route path="/exams/results" element={<ExamsDashboard />} />

      {/* ========== TENANT: Finance Officer ========== */}
      <Route path="/finance" element={<FinanceDashboard />} />
      <Route path="/finance/invoices" element={<FinanceDashboard />} />
      <Route path="/finance/payments" element={<FinanceDashboard />} />
      <Route path="/finance/instalments" element={<FinanceDashboard />} />
      <Route path="/finance/commissions" element={<FinanceDashboard />} />
      <Route path="/finance/scholarships" element={<FinanceDashboard />} />
      <Route path="/finance/reports" element={<FinanceDashboard />} />

      {/* ========== TENANT: Marketing Officer ========== */}
      <Route path="/marketing" element={<CentreDirectorDashboard />} />
      <Route path="/marketing/campaigns" element={<CentreDirectorDashboard />} />
      <Route path="/marketing/leads" element={<AdmissionsCRM />} />
      <Route path="/marketing/webinars" element={<CentreDirectorDashboard />} />
      <Route path="/marketing/analytics" element={<CentreDirectorDashboard />} />

      {/* ========== EXTERNAL: Agent ========== */}
      <Route path="/agent" element={<AgentDashboard />} />
      <Route path="/agent/leads" element={<AgentDashboard />} />
      <Route path="/agent/applications" element={<AgentDashboard />} />
      <Route path="/agent/commissions" element={<AgentDashboard />} />
      <Route path="/agent/onboarding" element={<AgentDashboard />} />
      <Route path="/agent/resources" element={<AgentDashboard />} />
      <Route path="/agent/messages" element={<MessagingInbox />} />

      {/* ========== EXTERNAL: Student ========== */}
      <Route path="/student" element={<StudentDashboard />} />
      <Route path="/student/courses" element={<StudentCourses />} />
      <Route path="/student/classroom" element={<VirtualClassroom />} />
      <Route path="/student/assignments" element={<StudentAssignments />} />
      <Route path="/student/grades" element={<StudentGrades />} />
      <Route path="/student/attendance" element={<AttendanceDashboard />} />
      <Route path="/student/library" element={<StudentLibrary />} />
      <Route path="/student/finance" element={<FinanceDashboard />} />
      <Route path="/student/progression" element={<ProgressionDashboard />} />
      <Route path="/student/career" element={<StudentCareer />} />
      <Route path="/student/support" element={<MessagingInbox />} />

      {/* ========== EXTERNAL: University Partner ========== */}
      <Route path="/partner" element={<ProgressionDashboard />} />
      <Route path="/partner/referrals" element={<ProgressionDashboard />} />
      <Route path="/partner/applications" element={<ProgressionDashboard />} />
      <Route path="/partner/offers" element={<ProgressionDashboard />} />
      <Route path="/partner/commissions" element={<ProgressionDashboard />} />

      {/* ========== EXTERNAL: Employer Partner ========== */}
      <Route path="/employer" element={<StudentCareer />} />
      <Route path="/employer/jobs" element={<StudentCareer />} />
      <Route path="/employer/candidates" element={<StudentCareer />} />
      <Route path="/employer/internships" element={<StudentCareer />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
