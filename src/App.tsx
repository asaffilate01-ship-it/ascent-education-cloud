import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LandingPage from "./pages/LandingPage";
import SuperadminDashboard from "./pages/superadmin/SuperadminDashboard";
import SuperadminPlatform from "./pages/superadmin/SuperadminPlatform";
import TenantAdminDashboard from "./pages/tenant/TenantAdminDashboard";
import TenantBranding from "./pages/tenant/TenantBranding";
import AgentDashboard from "./pages/agent/AgentDashboard";
import StudentDashboard from "./pages/student/StudentDashboard";
import LecturerDashboard from "./pages/lecturer/LecturerDashboard";
import AdmissionsCRM from "./pages/admissions/AdmissionsCRM";
import QADashboard from "./pages/qa/QADashboard";
import FinanceDashboard from "./pages/finance/FinanceDashboard";
import ExamsDashboard from "./pages/exams/ExamsDashboard";
import ProgressionDashboard from "./pages/progression/ProgressionDashboard";
import CentreDirectorDashboard from "./pages/director/CentreDirectorDashboard";
import AttendanceDashboard from "./pages/attendance/AttendanceDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user } = useAuth();

  if (!user) return <LandingPage />;

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      {/* Superadmin */}
      <Route path="/superadmin" element={<SuperadminDashboard />} />
      <Route path="/superadmin/tenants" element={<SuperadminDashboard />} />
      <Route path="/superadmin/users" element={<SuperadminDashboard />} />
      <Route path="/superadmin/finance" element={<FinanceDashboard />} />
      <Route path="/superadmin/subscriptions" element={<SuperadminPlatform />} />
      <Route path="/superadmin/compliance" element={<QADashboard />} />
      <Route path="/superadmin/platform" element={<SuperadminPlatform />} />
      <Route path="/superadmin/audit" element={<QADashboard />} />
      <Route path="/superadmin/settings" element={<SuperadminDashboard />} />

      {/* Centre Director */}
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

      {/* Admissions Admin */}
      <Route path="/admissions" element={<AdmissionsCRM />} />
      <Route path="/admissions/applications" element={<AdmissionsCRM />} />
      <Route path="/admissions/documents" element={<AdmissionsCRM />} />
      <Route path="/admissions/eligibility" element={<AdmissionsCRM />} />
      <Route path="/admissions/offers" element={<AdmissionsCRM />} />
      <Route path="/admissions/counselling" element={<AdmissionsCRM />} />
      <Route path="/admissions/reports" element={<AdmissionsCRM />} />

      {/* Lecturer */}
      <Route path="/lecturer" element={<LecturerDashboard />} />
      <Route path="/lecturer/teaching" element={<LecturerDashboard />} />
      <Route path="/lecturer/classroom" element={<LecturerDashboard />} />
      <Route path="/lecturer/marking" element={<LecturerDashboard />} />
      <Route path="/lecturer/attendance" element={<AttendanceDashboard />} />
      <Route path="/lecturer/students" element={<LecturerDashboard />} />
      <Route path="/lecturer/analytics" element={<LecturerDashboard />} />
      <Route path="/lecturer/messages" element={<LecturerDashboard />} />

      {/* Programme Leader */}
      <Route path="/programme" element={<LecturerDashboard />} />
      <Route path="/programme/modules" element={<LecturerDashboard />} />
      <Route path="/programme/lecturers" element={<LecturerDashboard />} />
      <Route path="/programme/students" element={<LecturerDashboard />} />
      <Route path="/programme/assessments" element={<LecturerDashboard />} />
      <Route path="/programme/moderation" element={<QADashboard />} />
      <Route path="/programme/analytics" element={<LecturerDashboard />} />

      {/* IQA Officer */}
      <Route path="/qa" element={<QADashboard />} />
      <Route path="/qa/moderation" element={<QADashboard />} />
      <Route path="/qa/sampling" element={<QADashboard />} />
      <Route path="/qa/plagiarism" element={<QADashboard />} />
      <Route path="/qa/malpractice" element={<QADashboard />} />
      <Route path="/qa/appeals" element={<QADashboard />} />
      <Route path="/qa/audit" element={<QADashboard />} />
      <Route path="/qa/evidence" element={<QADashboard />} />

      {/* Exams Officer */}
      <Route path="/exams" element={<ExamsDashboard />} />
      <Route path="/exams/schedule" element={<ExamsDashboard />} />
      <Route path="/exams/rooms" element={<ExamsDashboard />} />
      <Route path="/exams/seating" element={<ExamsDashboard />} />
      <Route path="/exams/entry" element={<ExamsDashboard />} />
      <Route path="/exams/incidents" element={<ExamsDashboard />} />
      <Route path="/exams/results" element={<ExamsDashboard />} />

      {/* Finance Officer */}
      <Route path="/finance" element={<FinanceDashboard />} />
      <Route path="/finance/invoices" element={<FinanceDashboard />} />
      <Route path="/finance/payments" element={<FinanceDashboard />} />
      <Route path="/finance/instalments" element={<FinanceDashboard />} />
      <Route path="/finance/commissions" element={<FinanceDashboard />} />
      <Route path="/finance/scholarships" element={<FinanceDashboard />} />
      <Route path="/finance/reports" element={<FinanceDashboard />} />

      {/* Marketing Officer */}
      <Route path="/marketing" element={<CentreDirectorDashboard />} />
      <Route path="/marketing/campaigns" element={<CentreDirectorDashboard />} />
      <Route path="/marketing/leads" element={<AdmissionsCRM />} />
      <Route path="/marketing/webinars" element={<CentreDirectorDashboard />} />
      <Route path="/marketing/analytics" element={<CentreDirectorDashboard />} />

      {/* Agent */}
      <Route path="/agent" element={<AgentDashboard />} />
      <Route path="/agent/leads" element={<AgentDashboard />} />
      <Route path="/agent/applications" element={<AgentDashboard />} />
      <Route path="/agent/commissions" element={<AgentDashboard />} />
      <Route path="/agent/onboarding" element={<AgentDashboard />} />
      <Route path="/agent/resources" element={<AgentDashboard />} />
      <Route path="/agent/messages" element={<AgentDashboard />} />

      {/* Student */}
      <Route path="/student" element={<StudentDashboard />} />
      <Route path="/student/courses" element={<StudentDashboard />} />
      <Route path="/student/classroom" element={<StudentDashboard />} />
      <Route path="/student/assignments" element={<StudentDashboard />} />
      <Route path="/student/grades" element={<StudentDashboard />} />
      <Route path="/student/attendance" element={<AttendanceDashboard />} />
      <Route path="/student/library" element={<StudentDashboard />} />
      <Route path="/student/finance" element={<FinanceDashboard />} />
      <Route path="/student/progression" element={<ProgressionDashboard />} />
      <Route path="/student/career" element={<StudentDashboard />} />
      <Route path="/student/support" element={<StudentDashboard />} />

      {/* University Partner */}
      <Route path="/partner" element={<ProgressionDashboard />} />
      <Route path="/partner/referrals" element={<ProgressionDashboard />} />
      <Route path="/partner/applications" element={<ProgressionDashboard />} />
      <Route path="/partner/offers" element={<ProgressionDashboard />} />
      <Route path="/partner/commissions" element={<ProgressionDashboard />} />

      {/* Employer Partner */}
      <Route path="/employer" element={<StudentDashboard />} />
      <Route path="/employer/jobs" element={<StudentDashboard />} />
      <Route path="/employer/candidates" element={<StudentDashboard />} />
      <Route path="/employer/internships" element={<StudentDashboard />} />

      {/* Legacy routes */}
      <Route path="/admin" element={<TenantAdminDashboard />} />
      <Route path="/admin/branding" element={<TenantBranding />} />

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
