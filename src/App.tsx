import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import CookieConsent from "@/components/CookieConsent";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { lazy, Suspense } from "react";

// Lazy-loaded route components
const SaaSLandingPage = lazy(() => import("./pages/SaaSLandingPage"));
const LandlordDashboard = lazy(() => import("./pages/landlord/LandlordDashboard"));
const TenantOnboarding = lazy(() => import("./pages/landlord/TenantOnboarding"));
const SuperadminPlatform = lazy(() => import("./pages/superadmin/SuperadminPlatform"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const StudentApplication = lazy(() => import("./pages/apply/StudentApplication"));
const TenantLandingPage = lazy(() => import("./pages/tenant/TenantLandingPage"));
const TenantCoursesPage = lazy(() => import("./pages/tenant/TenantCoursesPage"));
const TenantContactPage = lazy(() => import("./pages/tenant/TenantContactPage"));
const TenantAdminDashboard = lazy(() => import("./pages/tenant/TenantAdminDashboard"));
const TenantBranding = lazy(() => import("./pages/tenant/TenantBranding"));
const CentreDirectorDashboard = lazy(() => import("./pages/director/CentreDirectorDashboard"));
const ProgrammeManagement = lazy(() => import("./pages/director/ProgrammeManagement"));
const StaffManagement = lazy(() => import("./pages/director/StaffManagement"));
const StudentManagement = lazy(() => import("./pages/director/StudentManagement"));
const AdmissionsCRM = lazy(() => import("./pages/admissions/AdmissionsCRM"));
const QADashboard = lazy(() => import("./pages/qa/QADashboard"));
const FinanceDashboard = lazy(() => import("./pages/finance/FinanceDashboard"));
const ExamsDashboard = lazy(() => import("./pages/exams/ExamsDashboard"));
const ProgressionDashboard = lazy(() => import("./pages/progression/ProgressionDashboard"));
const AttendanceDashboard = lazy(() => import("./pages/attendance/AttendanceDashboard"));
const AnalyticsDashboard = lazy(() => import("./pages/analytics/AnalyticsDashboard"));
const MarketingDashboard = lazy(() => import("./pages/marketing/MarketingDashboard"));
const LiveClassroom = lazy(() => import("./pages/classroom/LiveClassroom"));
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const StudentCourses = lazy(() => import("./pages/student/StudentCourses"));
const StudentAssignments = lazy(() => import("./pages/student/StudentAssignments"));
const StudentGrades = lazy(() => import("./pages/student/StudentGrades"));
const StudentLibrary = lazy(() => import("./pages/student/StudentLibrary"));
const StudentCareer = lazy(() => import("./pages/student/StudentCareer"));
const LecturerDashboard = lazy(() => import("./pages/lecturer/LecturerDashboard"));
const LecturerTeaching = lazy(() => import("./pages/lecturer/LecturerTeaching"));
const LecturerMarking = lazy(() => import("./pages/lecturer/LecturerMarking"));
const LecturerAttendance = lazy(() => import("./pages/lecturer/LecturerAttendance"));
const MessagingInbox = lazy(() => import("./pages/messaging/MessagingInbox"));
const NotificationCentre = lazy(() => import("./pages/notifications/NotificationCentre"));
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage"));
const AgentDashboard = lazy(() => import("./pages/agent/AgentDashboard"));
const AgentResources = lazy(() => import("./pages/agent/AgentResources"));
const UniversityPartnerPortal = lazy(() => import("./pages/partner/UniversityPartnerPortal"));
const EmployerPortal = lazy(() => import("./pages/employer/EmployerPortal"));
const PrivacyPolicyPage = lazy(() => import("./pages/legal/PrivacyPolicyPage"));
const TermsOfServicePage = lazy(() => import("./pages/legal/TermsOfServicePage"));
const StudentOnboarding = lazy(() => import("./pages/onboarding/StudentOnboarding"));
const LecturerOnboarding = lazy(() => import("./pages/onboarding/LecturerOnboarding"));
const ResidentialWeeks = lazy(() => import("./pages/residential/ResidentialWeeks"));
const AuditLog = lazy(() => import("./pages/audit/AuditLog"));
const ComplianceDashboard = lazy(() => import("./pages/compliance/ComplianceDashboard"));
const ScheduleManager = lazy(() => import("./pages/schedule/ScheduleManager"));
const AcademicTimeline = lazy(() => import("./pages/schedule/AcademicTimeline"));
const ParentDashboard = lazy(() => import("./pages/parent/ParentDashboard"));
const CloudCodingSandbox = lazy(() => import("./pages/coding/CloudCodingSandbox"));
const ReportCardGenerator = lazy(() => import("./pages/reports/ReportCardGenerator"));
const AcademicCalendar = lazy(() => import("./pages/calendar/AcademicCalendar"));
const LessonPlanBuilder = lazy(() => import("./pages/lessons/LessonPlanBuilder"));
const LeaveManagement = lazy(() => import("./pages/leave/LeaveManagement"));
const HealthRecords = lazy(() => import("./pages/health/HealthRecords"));
const TransportTracking = lazy(() => import("./pages/transport/TransportTracking"));
const AIRecommendations = lazy(() => import("./pages/ai/AIRecommendations"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

// Role-specific wrappers
const Landlord = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard allowed={['superadmin']}>{children}</RoleGuard>
);
const Director = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard allowed={['centre_director', 'superadmin']}>{children}</RoleGuard>
);
const Admissions = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard allowed={['admissions_admin', 'centre_director', 'superadmin']}>{children}</RoleGuard>
);
const LecturerR = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard allowed={['lecturer', 'programme_leader', 'centre_director', 'superadmin']}>{children}</RoleGuard>
);
const Programme = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard allowed={['programme_leader', 'centre_director', 'superadmin']}>{children}</RoleGuard>
);
const QA = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard allowed={['iqa_officer', 'centre_director', 'superadmin']}>{children}</RoleGuard>
);
const Exams = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard allowed={['exams_officer', 'centre_director', 'superadmin']}>{children}</RoleGuard>
);
const Finance = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard allowed={['finance_officer', 'centre_director', 'superadmin']}>{children}</RoleGuard>
);
const Marketing = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard allowed={['marketing_officer', 'centre_director', 'superadmin']}>{children}</RoleGuard>
);
const AgentR = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard allowed={['agent', 'centre_director', 'superadmin']}>{children}</RoleGuard>
);
const StudentR = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard allowed={['student', 'centre_director', 'superadmin']}>{children}</RoleGuard>
);
const PartnerR = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard allowed={['university_partner', 'superadmin']}>{children}</RoleGuard>
);
const EmployerR = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard allowed={['employer_partner', 'superadmin']}>{children}</RoleGuard>
);
const ParentR = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard allowed={['parent_guardian', 'centre_director', 'superadmin']}>{children}</RoleGuard>
);

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
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
        <Route path="/landlord/compliance" element={<P><ComplianceDashboard /></P>} />
        <Route path="/landlord/onboarding" element={<P><TenantOnboarding /></P>} />
        <Route path="/landlord/audit" element={<P><AuditLog /></P>} />
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
        <Route path="/director/schedule" element={<P><ScheduleManager /></P>} />
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
        <Route path="/lecturer/classroom" element={<P><LiveClassroom /></P>} />
        <Route path="/lecturer/report-cards" element={<P><ReportCardGenerator /></P>} />
        <Route path="/lecturer/marking" element={<P><LecturerMarking /></P>} />
        <Route path="/lecturer/attendance" element={<P><LecturerAttendance /></P>} />
        <Route path="/lecturer/students" element={<P><StudentManagement /></P>} />
        <Route path="/lecturer/timeline" element={<P><AcademicTimeline /></P>} />
        <Route path="/lecturer/analytics" element={<P><AnalyticsDashboard /></P>} />
        <Route path="/lecturer/messages" element={<P><MessagingInbox /></P>} />

        {/* ========== TENANT: Programme Leader ========== */}
        <Route path="/programme" element={<P><ProgrammeManagement /></P>} />
        <Route path="/programme/modules" element={<P><LecturerTeaching /></P>} />
        <Route path="/programme/lecturers" element={<P><StaffManagement /></P>} />
        <Route path="/programme/students" element={<P><StudentManagement /></P>} />
        <Route path="/programme/assessments" element={<P><LecturerMarking /></P>} />
        <Route path="/programme/schedule" element={<P><ScheduleManager /></P>} />
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
        <Route path="/agent/resources" element={<P><AgentResources /></P>} />
        <Route path="/agent/messages" element={<P><MessagingInbox /></P>} />

        {/* ========== EXTERNAL: Student ========== */}
        <Route path="/student" element={<P><StudentDashboard /></P>} />
        <Route path="/student/courses" element={<P><StudentCourses /></P>} />
        <Route path="/student/classroom" element={<P><LiveClassroom /></P>} />
        <Route path="/student/assignments" element={<P><StudentAssignments /></P>} />
        <Route path="/student/grades" element={<P><StudentGrades /></P>} />
        <Route path="/student/attendance" element={<P><AttendanceDashboard /></P>} />
        <Route path="/student/library" element={<P><StudentLibrary /></P>} />
        <Route path="/student/finance" element={<P><FinanceDashboard /></P>} />
        <Route path="/student/progression" element={<P><ProgressionDashboard /></P>} />
        <Route path="/student/timeline" element={<P><AcademicTimeline /></P>} />
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

        {/* ========== NEW MODULES ========== */}
        <Route path="/onboarding" element={<P><StudentOnboarding /></P>} />
        <Route path="/onboarding/lecturer" element={<P><LecturerOnboarding /></P>} />
        <Route path="/residential" element={<P><ResidentialWeeks /></P>} />
        <Route path="/audit" element={<P><AuditLog /></P>} />
        <Route path="/compliance" element={<P><ComplianceDashboard /></P>} />

        {/* ========== NEW FEATURE PAGES ========== */}
        <Route path="/calendar" element={<P><AcademicCalendar /></P>} />
        <Route path="/lesson-plans" element={<P><LessonPlanBuilder /></P>} />
        <Route path="/leave" element={<P><LeaveManagement /></P>} />
        <Route path="/health" element={<P><HealthRecords /></P>} />
        <Route path="/transport" element={<P><TransportTracking /></P>} />
        <Route path="/ai-recommendations" element={<P><AIRecommendations /></P>} />

        {/* ========== PARENT/GUARDIAN ========== */}
        <Route path="/parent" element={<P><ParentDashboard /></P>} />
        <Route path="/parent/progress" element={<P><ParentDashboard /></P>} />
        <Route path="/parent/messages" element={<P><MessagingInbox /></P>} />

        {/* ========== SHARED ========== */}
        <Route path="/messaging" element={<P><MessagingInbox /></P>} />
        <Route path="/notifications" element={<P><NotificationCentre /></P>} />
        <Route path="/settings" element={<P><SettingsPage /></P>} />
        <Route path="/schedule" element={<P><ScheduleManager /></P>} />
        <Route path="/timeline" element={<P><AcademicTimeline /></P>} />
        <Route path="/coding" element={<P><CloudCodingSandbox /></P>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
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
