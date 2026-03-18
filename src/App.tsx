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
import ErrorBoundary from "@/components/ErrorBoundary";
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
const TenantPageBuilder = lazy(() => import("./pages/tenant/TenantPageBuilder"));
const TenantDomainSettings = lazy(() => import("./pages/tenant/TenantDomainSettings"));
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
const MyActivityLog = lazy(() => import("./pages/audit/MyActivityLog"));
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
const AICourseBuilder = lazy(() => import("./pages/ai/AICourseBuilder"));
const QuizDashboard = lazy(() => import("./pages/quiz/QuizDashboard"));
const ForumPage = lazy(() => import("./pages/forums/ForumPage"));
const GradebookPage = lazy(() => import("./pages/gradebook/GradebookPage"));
const ITLabsDashboard = lazy(() => import("./pages/labs/ITLabsDashboard"));
const CertificateVerification = lazy(() => import("./pages/verify/CertificateVerification"));
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
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-[3px] border-primary/15" />
          <div className="absolute inset-0 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Loading</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Please wait…</p>
        </div>
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
        <Route path="/verify" element={<CertificateVerification />} />
        <Route path="/live-classroom" element={<P><LiveClassroom /></P>} />

        {/* Tenant Public Pages */}
        <Route path="/tenant/:slug" element={<TenantLandingPage />} />
        <Route path="/tenant/:slug/courses" element={<TenantCoursesPage />} />
        <Route path="/tenant/:slug/about" element={<TenantLandingPage />} />
        <Route path="/tenant/:slug/contact" element={<TenantContactPage />} />

        {/* ========== LANDLORD (SaaS Owner) ========== */}
        <Route path="/landlord" element={<Landlord><LandlordDashboard /></Landlord>} />
        <Route path="/landlord/centres" element={<Landlord><LandlordDashboard /></Landlord>} />
        <Route path="/landlord/users" element={<Landlord><StaffManagement /></Landlord>} />
        <Route path="/landlord/finance" element={<Landlord><FinanceDashboard /></Landlord>} />
        <Route path="/landlord/subscriptions" element={<Landlord><SuperadminPlatform /></Landlord>} />
        <Route path="/landlord/compliance" element={<Landlord><ComplianceDashboard /></Landlord>} />
        <Route path="/landlord/onboarding" element={<Landlord><TenantOnboarding /></Landlord>} />
        <Route path="/landlord/audit" element={<Landlord><AuditLog /></Landlord>} />
        <Route path="/landlord/infrastructure" element={<Landlord><SuperadminPlatform /></Landlord>} />
        <Route path="/landlord/settings" element={<Landlord><SettingsPage /></Landlord>} />

        {/* ========== TENANT: Centre Director ========== */}
        <Route path="/director" element={<Director><CentreDirectorDashboard /></Director>} />
        <Route path="/director/admissions" element={<Director><AdmissionsCRM /></Director>} />
        <Route path="/director/programmes" element={<Director><ProgrammeManagement /></Director>} />
        <Route path="/director/staff" element={<Director><StaffManagement /></Director>} />
        <Route path="/director/students" element={<Director><StudentManagement /></Director>} />
        <Route path="/director/quality" element={<Director><QADashboard /></Director>} />
        <Route path="/director/finance" element={<Director><FinanceDashboard /></Director>} />
        <Route path="/director/agents" element={<Director><AgentDashboard /></Director>} />
        <Route path="/director/schedule" element={<Director><ScheduleManager /></Director>} />
        <Route path="/director/branding" element={<Director><TenantBranding /></Director>} />
        <Route path="/director/page-builder" element={<Director><TenantPageBuilder /></Director>} />
        <Route path="/director/domains" element={<Director><TenantDomainSettings /></Director>} />
        <Route path="/director/reports" element={<Director><AnalyticsDashboard /></Director>} />
        <Route path="/director/settings" element={<Director><SettingsPage /></Director>} />

        {/* ========== TENANT: Admissions Admin ========== */}
        <Route path="/admissions" element={<Admissions><AdmissionsCRM /></Admissions>} />
        <Route path="/admissions/applications" element={<Admissions><AdmissionsCRM /></Admissions>} />
        <Route path="/admissions/documents" element={<Admissions><AdmissionsCRM /></Admissions>} />
        <Route path="/admissions/eligibility" element={<Admissions><AdmissionsCRM /></Admissions>} />
        <Route path="/admissions/offers" element={<Admissions><AdmissionsCRM /></Admissions>} />
        <Route path="/admissions/counselling" element={<Admissions><MessagingInbox /></Admissions>} />
        <Route path="/admissions/reports" element={<Admissions><AnalyticsDashboard /></Admissions>} />

        {/* ========== TENANT: Lecturer ========== */}
        <Route path="/lecturer" element={<LecturerR><LecturerDashboard /></LecturerR>} />
        <Route path="/lecturer/teaching" element={<LecturerR><LecturerTeaching /></LecturerR>} />
        <Route path="/lecturer/classroom" element={<LecturerR><LiveClassroom /></LecturerR>} />
        <Route path="/lecturer/report-cards" element={<LecturerR><ReportCardGenerator /></LecturerR>} />
        <Route path="/lecturer/marking" element={<LecturerR><LecturerMarking /></LecturerR>} />
        <Route path="/lecturer/attendance" element={<LecturerR><LecturerAttendance /></LecturerR>} />
        <Route path="/lecturer/students" element={<LecturerR><StudentManagement /></LecturerR>} />
        <Route path="/lecturer/timeline" element={<LecturerR><AcademicTimeline /></LecturerR>} />
        <Route path="/lecturer/analytics" element={<LecturerR><AnalyticsDashboard /></LecturerR>} />
        <Route path="/lecturer/messages" element={<LecturerR><MessagingInbox /></LecturerR>} />
        <Route path="/lecturer/labs" element={<LecturerR><ITLabsDashboard /></LecturerR>} />

        {/* ========== TENANT: Programme Leader ========== */}
        <Route path="/programme" element={<Programme><ProgrammeManagement /></Programme>} />
        <Route path="/programme/modules" element={<Programme><LecturerTeaching /></Programme>} />
        <Route path="/programme/lecturers" element={<Programme><StaffManagement /></Programme>} />
        <Route path="/programme/students" element={<Programme><StudentManagement /></Programme>} />
        <Route path="/programme/assessments" element={<Programme><LecturerMarking /></Programme>} />
        <Route path="/programme/schedule" element={<Programme><ScheduleManager /></Programme>} />
        <Route path="/programme/moderation" element={<Programme><QADashboard /></Programme>} />
        <Route path="/programme/analytics" element={<Programme><AnalyticsDashboard /></Programme>} />

        {/* ========== TENANT: IQA / QA Officer ========== */}
        <Route path="/qa" element={<QA><QADashboard /></QA>} />
        <Route path="/qa/moderation" element={<QA><QADashboard /></QA>} />
        <Route path="/qa/sampling" element={<QA><QADashboard /></QA>} />
        <Route path="/qa/plagiarism" element={<QA><QADashboard /></QA>} />
        <Route path="/qa/malpractice" element={<QA><QADashboard /></QA>} />
        <Route path="/qa/appeals" element={<QA><QADashboard /></QA>} />
        <Route path="/qa/audit" element={<QA><QADashboard /></QA>} />
        <Route path="/qa/evidence" element={<QA><QADashboard /></QA>} />

        {/* ========== TENANT: Exams Officer ========== */}
        <Route path="/exams" element={<Exams><ExamsDashboard /></Exams>} />
        <Route path="/exams/schedule" element={<Exams><ExamsDashboard /></Exams>} />
        <Route path="/exams/rooms" element={<Exams><ExamsDashboard /></Exams>} />
        <Route path="/exams/seating" element={<Exams><ExamsDashboard /></Exams>} />
        <Route path="/exams/entry" element={<Exams><ExamsDashboard /></Exams>} />
        <Route path="/exams/incidents" element={<Exams><ExamsDashboard /></Exams>} />
        <Route path="/exams/results" element={<Exams><ExamsDashboard /></Exams>} />

        {/* ========== TENANT: Finance Officer ========== */}
        <Route path="/finance" element={<Finance><FinanceDashboard /></Finance>} />
        <Route path="/finance/invoices" element={<Finance><FinanceDashboard /></Finance>} />
        <Route path="/finance/payments" element={<Finance><FinanceDashboard /></Finance>} />
        <Route path="/finance/instalments" element={<Finance><FinanceDashboard /></Finance>} />
        <Route path="/finance/commissions" element={<Finance><FinanceDashboard /></Finance>} />
        <Route path="/finance/scholarships" element={<Finance><FinanceDashboard /></Finance>} />
        <Route path="/finance/reports" element={<Finance><AnalyticsDashboard /></Finance>} />

        {/* ========== TENANT: Marketing Officer ========== */}
        <Route path="/marketing" element={<Marketing><MarketingDashboard /></Marketing>} />
        <Route path="/marketing/campaigns" element={<Marketing><MarketingDashboard /></Marketing>} />
        <Route path="/marketing/leads" element={<Marketing><AdmissionsCRM /></Marketing>} />
        <Route path="/marketing/webinars" element={<Marketing><MarketingDashboard /></Marketing>} />
        <Route path="/marketing/analytics" element={<Marketing><AnalyticsDashboard /></Marketing>} />

        {/* ========== EXTERNAL: Agent ========== */}
        <Route path="/agent" element={<AgentR><AgentDashboard /></AgentR>} />
        <Route path="/agent/leads" element={<AgentR><AgentDashboard /></AgentR>} />
        <Route path="/agent/applications" element={<AgentR><AgentDashboard /></AgentR>} />
        <Route path="/agent/commissions" element={<AgentR><AgentDashboard /></AgentR>} />
        <Route path="/agent/onboarding" element={<AgentR><AgentDashboard /></AgentR>} />
        <Route path="/agent/resources" element={<AgentR><AgentResources /></AgentR>} />
        <Route path="/agent/messages" element={<AgentR><MessagingInbox /></AgentR>} />

        {/* ========== EXTERNAL: Student ========== */}
        <Route path="/student" element={<StudentR><StudentDashboard /></StudentR>} />
        <Route path="/student/courses" element={<StudentR><StudentCourses /></StudentR>} />
        <Route path="/student/classroom" element={<StudentR><LiveClassroom /></StudentR>} />
        <Route path="/student/assignments" element={<StudentR><StudentAssignments /></StudentR>} />
        <Route path="/student/grades" element={<StudentR><StudentGrades /></StudentR>} />
        <Route path="/student/attendance" element={<StudentR><AttendanceDashboard /></StudentR>} />
        <Route path="/student/library" element={<StudentR><StudentLibrary /></StudentR>} />
        <Route path="/student/finance" element={<StudentR><FinanceDashboard /></StudentR>} />
        <Route path="/student/progression" element={<StudentR><ProgressionDashboard /></StudentR>} />
        <Route path="/student/timeline" element={<StudentR><AcademicTimeline /></StudentR>} />
        <Route path="/student/career" element={<StudentR><StudentCareer /></StudentR>} />
        <Route path="/student/support" element={<StudentR><MessagingInbox /></StudentR>} />
        <Route path="/student/labs" element={<StudentR><ITLabsDashboard /></StudentR>} />

        {/* ========== EXTERNAL: University Partner ========== */}
        <Route path="/partner" element={<PartnerR><UniversityPartnerPortal /></PartnerR>} />
        <Route path="/partner/referrals" element={<PartnerR><UniversityPartnerPortal /></PartnerR>} />
        <Route path="/partner/applications" element={<PartnerR><UniversityPartnerPortal /></PartnerR>} />
        <Route path="/partner/offers" element={<PartnerR><UniversityPartnerPortal /></PartnerR>} />
        <Route path="/partner/commissions" element={<PartnerR><AnalyticsDashboard /></PartnerR>} />

        {/* ========== EXTERNAL: Employer Partner ========== */}
        <Route path="/employer" element={<EmployerR><EmployerPortal /></EmployerR>} />
        <Route path="/employer/jobs" element={<EmployerR><EmployerPortal /></EmployerR>} />
        <Route path="/employer/candidates" element={<EmployerR><EmployerPortal /></EmployerR>} />
        <Route path="/employer/internships" element={<EmployerR><EmployerPortal /></EmployerR>} />

        {/* ========== NEW MODULES ========== */}
        <Route path="/onboarding" element={<P><StudentOnboarding /></P>} />
        <Route path="/onboarding/lecturer" element={<LecturerR><LecturerOnboarding /></LecturerR>} />
        <Route path="/residential" element={<P><ResidentialWeeks /></P>} />
        <Route path="/audit" element={<Director><AuditLog /></Director>} />
        <Route path="/my-activity" element={<P><MyActivityLog /></P>} />
        <Route path="/compliance" element={<QA><ComplianceDashboard /></QA>} />

        {/* ========== NEW FEATURE PAGES ========== */}
        <Route path="/calendar" element={<P><AcademicCalendar /></P>} />
        <Route path="/lesson-plans" element={<LecturerR><LessonPlanBuilder /></LecturerR>} />
        <Route path="/leave" element={<P><LeaveManagement /></P>} />
        <Route path="/health" element={<P><HealthRecords /></P>} />
        <Route path="/transport" element={<P><TransportTracking /></P>} />
        <Route path="/ai-recommendations" element={<P><AIRecommendations /></P>} />
        <Route path="/ai-course-builder" element={<LecturerR><AICourseBuilder /></LecturerR>} />
        <Route path="/director/ai-course-builder" element={<Director><AICourseBuilder /></Director>} />
        <Route path="/quizzes" element={<P><QuizDashboard /></P>} />
        <Route path="/forums" element={<P><ForumPage /></P>} />
        <Route path="/gradebook" element={<P><GradebookPage /></P>} />

        {/* Lecturer-specific routes for new features */}
        <Route path="/lecturer/quizzes" element={<LecturerR><QuizDashboard /></LecturerR>} />
        <Route path="/lecturer/forums" element={<LecturerR><ForumPage /></LecturerR>} />
        <Route path="/lecturer/gradebook" element={<LecturerR><GradebookPage /></LecturerR>} />

        {/* Student-specific routes for new features */}
        <Route path="/student/quizzes" element={<StudentR><QuizDashboard /></StudentR>} />
        <Route path="/student/forums" element={<StudentR><ForumPage /></StudentR>} />
        <Route path="/student/gradebook" element={<StudentR><GradebookPage /></StudentR>} />

        {/* ========== PARENT/GUARDIAN ========== */}
        <Route path="/parent" element={<ParentR><ParentDashboard /></ParentR>} />
        <Route path="/parent/progress" element={<ParentR><ParentDashboard /></ParentR>} />
        <Route path="/parent/messages" element={<ParentR><MessagingInbox /></ParentR>} />

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
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
            <CookieConsent />
            <PWAInstallPrompt />
            <MobileBottomNav />
            <AIChatWidgetLazy />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
