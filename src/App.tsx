import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import CookieConsent from "@/components/CookieConsent";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

// SaaS Platform (Landlord)
import SaaSLandingPage from "./pages/SaaSLandingPage";
import LandlordDashboard from "./pages/landlord/LandlordDashboard";
import TenantOnboarding from "./pages/landlord/TenantOnboarding";
import SuperadminPlatform from "./pages/superadmin/SuperadminPlatform";

// Auth
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

// Application
import StudentApplication from "./pages/apply/StudentApplication";

// Tenant Public
import TenantLandingPage from "./pages/tenant/TenantLandingPage";
import TenantCoursesPage from "./pages/tenant/TenantCoursesPage";
import TenantContactPage from "./pages/tenant/TenantContactPage";
import TenantAdminDashboard from "./pages/tenant/TenantAdminDashboard";
import TenantBranding from "./pages/tenant/TenantBranding";

// Director
import CentreDirectorDashboard from "./pages/director/CentreDirectorDashboard";
import ProgrammeManagement from "./pages/director/ProgrammeManagement";
import StaffManagement from "./pages/director/StaffManagement";
import StudentManagement from "./pages/director/StudentManagement";

// Modules
import AdmissionsCRM from "./pages/admissions/AdmissionsCRM";
import QADashboard from "./pages/qa/QADashboard";
import FinanceDashboard from "./pages/finance/FinanceDashboard";
import ExamsDashboard from "./pages/exams/ExamsDashboard";
import ProgressionDashboard from "./pages/progression/ProgressionDashboard";
import AttendanceDashboard from "./pages/attendance/AttendanceDashboard";
import AnalyticsDashboard from "./pages/analytics/AnalyticsDashboard";
import MarketingDashboard from "./pages/marketing/MarketingDashboard";

// Virtual Classroom
import VirtualClassroom from "./pages/classroom/VirtualClassroom";
import LiveClassroom from "./pages/classroom/LiveClassroom";

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

// Shared
import MessagingInbox from "./pages/messaging/MessagingInbox";
import NotificationCentre from "./pages/notifications/NotificationCentre";
import SettingsPage from "./pages/settings/SettingsPage";

// External portals
import AgentDashboard from "./pages/agent/AgentDashboard";
import UniversityPartnerPortal from "./pages/partner/UniversityPartnerPortal";
import EmployerPortal from "./pages/employer/EmployerPortal";

// Legal
import PrivacyPolicyPage from "./pages/legal/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/legal/TermsOfServicePage";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

function AppRoutes() {
  return (
    <Routes>
      {/* ========== PUBLIC ROUTES ========== */}
      <Route path="/" element={<SaaSLandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/apply" element={<StudentApplication />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="/live-classroom" element={<P><LiveClassroom /></P>} />

      {/* Tenant Public Pages */}
      <Route path="/tenant/:slug" element={<TenantLandingPage />} />
      <Route path="/tenant/:slug/courses" element={<TenantCoursesPage />} />
      <Route path="/tenant/:slug/about" element={<TenantLandingPage />} />
      <Route path="/tenant/:slug/contact" element={<TenantContactPage />} />

      {/* ========== LANDLORD (SaaS Owner) ========== */}
      <Route path="/landlord" element={<P><LandlordDashboard /></P>} />
      <Route path="/landlord/centres" element={<P><LandlordDashboard /></P>} />
      <Route path="/landlord/users" element={<P><StaffManagement /></P>} />
      <Route path="/landlord/finance" element={<P><FinanceDashboard /></P>} />
      <Route path="/landlord/subscriptions" element={<P><SuperadminPlatform /></P>} />
      <Route path="/landlord/compliance" element={<P><QADashboard /></P>} />
      <Route path="/landlord/onboarding" element={<P><TenantOnboarding /></P>} />
      <Route path="/landlord/audit" element={<P><QADashboard /></P>} />
      <Route path="/landlord/infrastructure" element={<P><SuperadminPlatform /></P>} />
      <Route path="/landlord/settings" element={<P><SettingsPage /></P>} />

      {/* ========== TENANT: Centre Director ========== */}
      <Route path="/director" element={<P><CentreDirectorDashboard /></P>} />
      <Route path="/director/admissions" element={<P><AdmissionsCRM /></P>} />
      <Route path="/director/programmes" element={<P><ProgrammeManagement /></P>} />
      <Route path="/director/staff" element={<P><StaffManagement /></P>} />
      <Route path="/director/students" element={<P><StudentManagement /></P>} />
      <Route path="/director/quality" element={<P><QADashboard /></P>} />
      <Route path="/director/finance" element={<P><FinanceDashboard /></P>} />
      <Route path="/director/agents" element={<P><AgentDashboard /></P>} />
      <Route path="/director/branding" element={<P><TenantBranding /></P>} />
      <Route path="/director/reports" element={<P><AnalyticsDashboard /></P>} />
      <Route path="/director/settings" element={<P><SettingsPage /></P>} />

      {/* ========== TENANT: Admissions Admin ========== */}
      <Route path="/admissions" element={<P><AdmissionsCRM /></P>} />
      <Route path="/admissions/applications" element={<P><AdmissionsCRM /></P>} />
      <Route path="/admissions/documents" element={<P><AdmissionsCRM /></P>} />
      <Route path="/admissions/eligibility" element={<P><AdmissionsCRM /></P>} />
      <Route path="/admissions/offers" element={<P><AdmissionsCRM /></P>} />
      <Route path="/admissions/counselling" element={<P><MessagingInbox /></P>} />
      <Route path="/admissions/reports" element={<P><AnalyticsDashboard /></P>} />

      {/* ========== TENANT: Lecturer ========== */}
      <Route path="/lecturer" element={<P><LecturerDashboard /></P>} />
      <Route path="/lecturer/teaching" element={<P><LecturerTeaching /></P>} />
      <Route path="/lecturer/classroom" element={<P><VirtualClassroom /></P>} />
      <Route path="/lecturer/marking" element={<P><LecturerMarking /></P>} />
      <Route path="/lecturer/attendance" element={<P><LecturerAttendance /></P>} />
      <Route path="/lecturer/students" element={<P><StudentManagement /></P>} />
      <Route path="/lecturer/analytics" element={<P><AnalyticsDashboard /></P>} />
      <Route path="/lecturer/messages" element={<P><MessagingInbox /></P>} />

      {/* ========== TENANT: Programme Leader ========== */}
      <Route path="/programme" element={<P><ProgrammeManagement /></P>} />
      <Route path="/programme/modules" element={<P><LecturerTeaching /></P>} />
      <Route path="/programme/lecturers" element={<P><StaffManagement /></P>} />
      <Route path="/programme/students" element={<P><StudentManagement /></P>} />
      <Route path="/programme/assessments" element={<P><LecturerMarking /></P>} />
      <Route path="/programme/moderation" element={<P><QADashboard /></P>} />
      <Route path="/programme/analytics" element={<P><AnalyticsDashboard /></P>} />

      {/* ========== TENANT: IQA / QA Officer ========== */}
      <Route path="/qa" element={<P><QADashboard /></P>} />
      <Route path="/qa/moderation" element={<P><QADashboard /></P>} />
      <Route path="/qa/sampling" element={<P><QADashboard /></P>} />
      <Route path="/qa/plagiarism" element={<P><QADashboard /></P>} />
      <Route path="/qa/malpractice" element={<P><QADashboard /></P>} />
      <Route path="/qa/appeals" element={<P><QADashboard /></P>} />
      <Route path="/qa/audit" element={<P><QADashboard /></P>} />
      <Route path="/qa/evidence" element={<P><QADashboard /></P>} />

      {/* ========== TENANT: Exams Officer ========== */}
      <Route path="/exams" element={<P><ExamsDashboard /></P>} />
      <Route path="/exams/schedule" element={<P><ExamsDashboard /></P>} />
      <Route path="/exams/rooms" element={<P><ExamsDashboard /></P>} />
      <Route path="/exams/seating" element={<P><ExamsDashboard /></P>} />
      <Route path="/exams/entry" element={<P><ExamsDashboard /></P>} />
      <Route path="/exams/incidents" element={<P><ExamsDashboard /></P>} />
      <Route path="/exams/results" element={<P><ExamsDashboard /></P>} />

      {/* ========== TENANT: Finance Officer ========== */}
      <Route path="/finance" element={<P><FinanceDashboard /></P>} />
      <Route path="/finance/invoices" element={<P><FinanceDashboard /></P>} />
      <Route path="/finance/payments" element={<P><FinanceDashboard /></P>} />
      <Route path="/finance/instalments" element={<P><FinanceDashboard /></P>} />
      <Route path="/finance/commissions" element={<P><FinanceDashboard /></P>} />
      <Route path="/finance/scholarships" element={<P><FinanceDashboard /></P>} />
      <Route path="/finance/reports" element={<P><AnalyticsDashboard /></P>} />

      {/* ========== TENANT: Marketing Officer ========== */}
      <Route path="/marketing" element={<P><MarketingDashboard /></P>} />
      <Route path="/marketing/campaigns" element={<P><MarketingDashboard /></P>} />
      <Route path="/marketing/leads" element={<P><AdmissionsCRM /></P>} />
      <Route path="/marketing/webinars" element={<P><MarketingDashboard /></P>} />
      <Route path="/marketing/analytics" element={<P><AnalyticsDashboard /></P>} />

      {/* ========== EXTERNAL: Agent ========== */}
      <Route path="/agent" element={<P><AgentDashboard /></P>} />
      <Route path="/agent/leads" element={<P><AgentDashboard /></P>} />
      <Route path="/agent/applications" element={<P><AgentDashboard /></P>} />
      <Route path="/agent/commissions" element={<P><AgentDashboard /></P>} />
      <Route path="/agent/onboarding" element={<P><AgentDashboard /></P>} />
      <Route path="/agent/resources" element={<P><StudentLibrary /></P>} />
      <Route path="/agent/messages" element={<P><MessagingInbox /></P>} />

      {/* ========== EXTERNAL: Student ========== */}
      <Route path="/student" element={<P><StudentDashboard /></P>} />
      <Route path="/student/courses" element={<P><StudentCourses /></P>} />
      <Route path="/student/classroom" element={<P><VirtualClassroom /></P>} />
      <Route path="/student/assignments" element={<P><StudentAssignments /></P>} />
      <Route path="/student/grades" element={<P><StudentGrades /></P>} />
      <Route path="/student/attendance" element={<P><AttendanceDashboard /></P>} />
      <Route path="/student/library" element={<P><StudentLibrary /></P>} />
      <Route path="/student/finance" element={<P><FinanceDashboard /></P>} />
      <Route path="/student/progression" element={<P><ProgressionDashboard /></P>} />
      <Route path="/student/career" element={<P><StudentCareer /></P>} />
      <Route path="/student/support" element={<P><MessagingInbox /></P>} />

      {/* ========== EXTERNAL: University Partner ========== */}
      <Route path="/partner" element={<P><UniversityPartnerPortal /></P>} />
      <Route path="/partner/referrals" element={<P><UniversityPartnerPortal /></P>} />
      <Route path="/partner/applications" element={<P><UniversityPartnerPortal /></P>} />
      <Route path="/partner/offers" element={<P><UniversityPartnerPortal /></P>} />
      <Route path="/partner/commissions" element={<P><AnalyticsDashboard /></P>} />

      {/* ========== EXTERNAL: Employer Partner ========== */}
      <Route path="/employer" element={<P><EmployerPortal /></P>} />
      <Route path="/employer/jobs" element={<P><EmployerPortal /></P>} />
      <Route path="/employer/candidates" element={<P><EmployerPortal /></P>} />
      <Route path="/employer/internships" element={<P><EmployerPortal /></P>} />

      {/* ========== SHARED ========== */}
      <Route path="/notifications" element={<P><NotificationCentre /></P>} />
      <Route path="/settings" element={<P><SettingsPage /></P>} />

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
          <CookieConsent />
          <PWAInstallPrompt />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
