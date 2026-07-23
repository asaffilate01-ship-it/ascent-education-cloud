import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import CookieConsent from "@/components/CookieConsent";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import ErrorBoundary from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";

// Auth
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));

// Marketing (tenant)
const TenantLandingPage = lazy(() => import("./pages/tenant/TenantLandingPage"));
const TenantAboutPage = lazy(() => import("./pages/tenant/TenantAboutPage"));
const TenantCoursesPage = lazy(() => import("./pages/tenant/TenantCoursesPage"));
const TenantContactPage = lazy(() => import("./pages/tenant/TenantContactPage"));
const GermanyPathway = lazy(() => import("./pages/tenant/GermanyPathway"));
const UKPathway = lazy(() => import("./pages/tenant/UKPathway"));
const PathwaysCompare = lazy(() => import("./pages/tenant/PathwaysCompare"));
const DestinationApply = lazy(() => import("./pages/tenant/apply/DestinationApply"));

// Legal / misc
const PrivacyPolicyPage = lazy(() => import("./pages/legal/PrivacyPolicyPage"));
const TermsOfServicePage = lazy(() => import("./pages/legal/TermsOfServicePage"));
const CertificateVerification = lazy(() => import("./pages/verify/CertificateVerification"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

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

// Redirects clean marketing URLs (/, /about, /germany, ...) into the existing
// /tenant/unipathway/* tree so page components still see the :slug param.
function RedirectToTenant({ suffix = "" }: { suffix?: string }) {
  return <Navigate to={`/tenant/unipathway${suffix}`} replace />;
}

function ApplyRedirect() {
  const { destination } = useParams();
  return <Navigate to={`/tenant/unipathway/apply/${destination}`} replace />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <a href="#main-content" className="skip-to-content">Skip to content</a>
      <main id="main-content">
        <Routes>
          {/* Clean marketing URLs → tenant tree */}
          <Route path="/" element={<RedirectToTenant />} />
          <Route path="/about" element={<RedirectToTenant suffix="/about" />} />
          <Route path="/courses" element={<RedirectToTenant suffix="/courses" />} />
          <Route path="/contact" element={<RedirectToTenant suffix="/contact" />} />
          <Route path="/germany" element={<RedirectToTenant suffix="/germany" />} />
          <Route path="/uk" element={<RedirectToTenant suffix="/uk" />} />
          <Route path="/pathways" element={<RedirectToTenant suffix="/pathways" />} />
          <Route path="/apply/:destination" element={<ApplyRedirect />} />

          {/* Tenant marketing (canonical for now) */}
          <Route path="/tenant/:slug" element={<TenantLandingPage />} />
          <Route path="/tenant/:slug/courses" element={<TenantCoursesPage />} />
          <Route path="/tenant/:slug/about" element={<TenantAboutPage />} />
          <Route path="/tenant/:slug/contact" element={<TenantContactPage />} />
          <Route path="/tenant/:slug/germany" element={<GermanyPathway />} />
          <Route path="/tenant/:slug/uk" element={<UKPathway />} />
          <Route path="/tenant/:slug/pathways" element={<PathwaysCompare />} />
          <Route path="/tenant/:slug/apply/:destination" element={<DestinationApply />} />

          {/* Auth (kept — session backs the applicant portal) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Legal + public utilities */}
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/verify" element={<CertificateVerification />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </Suspense>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <AppRoutes />
            <CookieConsent />
            <PWAInstallPrompt />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
