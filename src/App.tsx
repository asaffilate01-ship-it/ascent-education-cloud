import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
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
      <Route path="/superadmin/finance" element={<SuperadminDashboard />} />
      <Route path="/superadmin/subscriptions" element={<SuperadminDashboard />} />
      <Route path="/superadmin/compliance" element={<SuperadminDashboard />} />
      <Route path="/superadmin/platform" element={<SuperadminPlatform />} />
      <Route path="/superadmin/settings" element={<SuperadminDashboard />} />

      {/* Tenant Admin */}
      <Route path="/admin" element={<TenantAdminDashboard />} />
      <Route path="/admin/students" element={<TenantAdminDashboard />} />
      <Route path="/admin/courses" element={<TenantAdminDashboard />} />
      <Route path="/admin/lecturers" element={<TenantAdminDashboard />} />
      <Route path="/admin/classrooms" element={<TenantAdminDashboard />} />
      <Route path="/admin/assessments" element={<TenantAdminDashboard />} />
      <Route path="/admin/finance" element={<TenantAdminDashboard />} />
      <Route path="/admin/quality" element={<TenantAdminDashboard />} />
      <Route path="/admin/branding" element={<TenantBranding />} />
      <Route path="/admin/reports" element={<TenantAdminDashboard />} />
      <Route path="/admin/settings" element={<TenantAdminDashboard />} />

      {/* Agent */}
      <Route path="/agent" element={<AgentDashboard />} />
      <Route path="/agent/leads" element={<AgentDashboard />} />
      <Route path="/agent/clients" element={<AgentDashboard />} />
      <Route path="/agent/commissions" element={<AgentDashboard />} />
      <Route path="/agent/onboarding" element={<AgentDashboard />} />
      <Route path="/agent/messages" element={<AgentDashboard />} />

      {/* Student */}
      <Route path="/student" element={<StudentDashboard />} />
      <Route path="/student/courses" element={<StudentDashboard />} />
      <Route path="/student/classroom" element={<StudentDashboard />} />
      <Route path="/student/assignments" element={<StudentDashboard />} />
      <Route path="/student/grades" element={<StudentDashboard />} />
      <Route path="/student/library" element={<StudentDashboard />} />
      <Route path="/student/finance" element={<StudentDashboard />} />
      <Route path="/student/career" element={<StudentDashboard />} />

      {/* Lecturer */}
      <Route path="/lecturer" element={<LecturerDashboard />} />
      <Route path="/lecturer/teaching" element={<LecturerDashboard />} />
      <Route path="/lecturer/classroom" element={<LecturerDashboard />} />
      <Route path="/lecturer/marking" element={<LecturerDashboard />} />
      <Route path="/lecturer/students" element={<LecturerDashboard />} />
      <Route path="/lecturer/analytics" element={<LecturerDashboard />} />
      <Route path="/lecturer/messages" element={<LecturerDashboard />} />

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
