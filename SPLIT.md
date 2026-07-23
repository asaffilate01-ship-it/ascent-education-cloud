# Splitting into two projects: EduCloud + UniPathway

**Decision recap**
- **EduCloud** (`traindirekt.de`) — the tech platform. Marketed to training providers.
- **UniPathway** (`unipathway.pk`) — a consultancy. Public marketing site + applicant wizard only.
- **Staff/student portal** for UniPathway lives on `app.unipathway.pk`, served by **EduCloud's** codebase with tenant-branded theming (option **b**). UniPathway's own repo never ships the staff portals.
- Both projects share **one** Lovable Cloud (Supabase) backend. Isolation stays enforced via `tenant_id` + RLS. No data migration needed.

---

## Step 1 — Remix, don't move

Do NOT reorganise this project's `src/` before remixing. Moving files here breaks imports for both future projects. Instead:

1. In the Lovable dashboard, **remix this project twice**:
   - Remix A → rename to **EduCloud** (this becomes `traindirekt.de`)
   - Remix B → rename to **UniPathway** (this becomes `unipathway.pk`)
2. On each remix, **connect the same Lovable Cloud backend** so both projects hit the same Supabase. (Project settings → Cloud → connect existing.) Do NOT create a second backend.
3. Delete this original project only after both remixes are verified.

---

## Step 2 — Prune each remix

Each remix keeps the intersection listed under "Shared kernel" plus its own column.

### Shared kernel (keep in BOTH)
```
src/integrations/supabase/*
src/integrations/lovable/*
src/contexts/AuthContext.tsx
src/components/ui/*                  shadcn primitives
src/components/ErrorBoundary.tsx
src/components/CookieConsent.tsx
src/components/PWAInstallPrompt.tsx
src/hooks/use-mobile.tsx
src/hooks/use-toast.ts
src/hooks/useTheme.ts
src/hooks/useTenantBranding.ts
src/lib/utils.ts
src/types/platform.ts
src/index.css, tailwind.config.ts, vite.config.ts, tsconfig*, postcss.config.js
src/pages/auth/*                     login, register, forgot, reset
src/pages/NotFound.tsx
src/pages/legal/PrivacyPolicyPage.tsx
src/pages/legal/TermsOfServicePage.tsx
public/robots.txt, public/manifest.webmanifest, public/pwa-*.png
```
Supabase edge functions are backend-shared automatically — leave `supabase/` untouched in both.

### EduCloud remix — KEEP
```
src/pages/SaaSLandingPage.tsx                 # marketing homepage
src/pages/landlord/*                          # superadmin + tenant onboarding
src/pages/superadmin/*
src/pages/director/*                          # centre director portal
src/pages/admissions/*                        # admissions CRM
src/pages/lecturer/*
src/pages/programme leader routes
src/pages/qa/*, exams/*, finance/*, marketing/*
src/pages/student/*, parent/*, agent/*, partner/*, employer/*
src/pages/classroom/*, coding/*, labs/*
src/pages/analytics/*, ai/*, compliance/*, audit/*
src/pages/attendance/*, schedule/*, calendar/*, gradebook/*
src/pages/documents/*, forums/*, health/*, leave/*
src/pages/lessons/*, quiz/*, reports/*, residential/*, transport/*
src/pages/onboarding/*                        # student/lecturer onboarding
src/pages/messaging/*, notifications/*, settings/*
src/pages/verify/CertificateVerification.tsx  # public cert lookup
src/pages/tenant/TenantAdminDashboard.tsx
src/pages/tenant/TenantBranding.tsx
src/pages/tenant/TenantPageBuilder.tsx
src/pages/tenant/TenantDomainSettings.tsx
src/components/layout/*                       # DashboardLayout + Sidebar
src/components/MobileBottomNav.tsx
src/components/ProtectedRoute.tsx
src/components/RoleGuard.tsx
src/components/NotificationBell.tsx
src/components/CommandPalette.tsx
src/components/AdvancedSearch.tsx
src/components/AIChatWidget.tsx
src/components/ESignaturePad.tsx
src/components/admissions/*, finance/*, career/*, student/*, modals/*
```

### EduCloud remix — DELETE (these belong only on the tenant marketing site)
```
src/pages/tenant/TenantLandingPage.tsx
src/pages/tenant/TenantAboutPage.tsx
src/pages/tenant/TenantCoursesPage.tsx
src/pages/tenant/TenantContactPage.tsx
src/pages/tenant/GermanyPathway.tsx
src/pages/tenant/UKPathway.tsx
src/pages/tenant/PathwaysCompare.tsx
src/pages/tenant/apply/*
src/pages/apply/StudentApplication.tsx        # legacy public wizard
src/pages/Index.tsx, src/pages/LandingPage.tsx  # placeholders
src/components/TenantNav.tsx
src/components/tenant/*                       # DestinationHero, LanguageAcademy, PathwayComparisonTable, ComplianceDisclosure
```

Also remove `/tenant/:slug/*` **marketing** routes from `src/App.tsx`. Keep the tenant admin routes (`TenantAdminDashboard`, `TenantBranding`, etc.) — those are the platform's tenant control panel, not the tenant's public site.

### UniPathway remix — KEEP
```
src/pages/tenant/TenantLandingPage.tsx        # becomes homepage
src/pages/tenant/TenantAboutPage.tsx
src/pages/tenant/TenantCoursesPage.tsx
src/pages/tenant/TenantContactPage.tsx
src/pages/tenant/GermanyPathway.tsx
src/pages/tenant/UKPathway.tsx
src/pages/tenant/PathwaysCompare.tsx
src/pages/tenant/apply/DestinationApply.tsx
src/components/TenantNav.tsx
src/components/tenant/*
src/pages/verify/CertificateVerification.tsx  # public feature, useful here too
```

### UniPathway remix — DELETE (everything staff-facing)
```
src/pages/SaaSLandingPage.tsx
src/pages/landlord/*, superadmin/*, director/*, admissions/*, lecturer/*
src/pages/qa/*, exams/*, finance/*, marketing/*, agent/*, partner/*, employer/*, parent/*
src/pages/student/*                           # portal — lives on app.unipathway.pk
src/pages/classroom/*, coding/*, labs/*, gradebook/*, quiz/*, lessons/*, reports/*
src/pages/analytics/*, ai/*, compliance/*, audit/*, attendance/*, schedule/*, calendar/*
src/pages/documents/*, forums/*, health/*, leave/*, residential/*, transport/*
src/pages/onboarding/*, messaging/*, notifications/*, settings/*
src/pages/tenant/TenantAdminDashboard.tsx, TenantBranding.tsx, TenantPageBuilder.tsx, TenantDomainSettings.tsx
src/components/layout/*, MobileBottomNav.tsx, ProtectedRoute.tsx, RoleGuard.tsx
src/components/NotificationBell.tsx, CommandPalette.tsx, AdvancedSearch.tsx
src/components/AIChatWidget.tsx, ESignaturePad.tsx
src/components/admissions/*, finance/*, career/*, student/*, modals/*
```

Rewrite `src/App.tsx` so `/` renders `TenantLandingPage` directly (no `/tenant/:slug` prefix), and keep the applicant wizard, About, Courses, Contact, Germany, UK, Compare, Login, Register, Legal, Verify, NotFound. That's it.

---

## Step 3 — Rebrand each remix

### EduCloud (`traindirekt.de`)
- `index.html`: title "TrainDirekt — Education Operating System", `og:*`, canonical → `https://traindirekt.de`.
- `robots.txt` + `sitemap.xml`: swap `educloud.pk` → `traindirekt.de`.
- Replace "EduCloud" copy on the SaaS landing page with "TrainDirekt". Keep the platform positioning ("license this OS to your training centre").
- Custom domain: connect `traindirekt.de` in Project Settings → Domains.

### UniPathway (`unipathway.pk`)
- `index.html`: title "UniPathway — UK & Germany Study Consultancy (Pakistan)", description focused on consultancy, canonical → `https://unipathway.pk`. Drop the EduCloud JSON-LD; add `Organization` + `EducationalOrganization` schema for UniPathway with SECP registration and BEOE licence numbers once available.
- `robots.txt`: allow the whole marketing surface (`/`, `/about`, `/courses`, `/contact`, `/germany`, `/uk`, `/compare`, `/apply`). Disallow only auth pages if you keep them.
- `sitemap.xml`: enumerate the public marketing pages only.
- Custom domain: connect `unipathway.pk`.

### The staff portal on `app.unipathway.pk`
- On the **EduCloud** remix, connect `app.unipathway.pk` as an additional custom domain.
- The existing tenant-branding pipeline (`useTenantBranding` + `tenants.brand_name`/`primary_color`/`logo_url`) already themes the shell per-tenant. Detect the host and force `tenant_id = unipathway`'s branding when the request comes in on `app.unipathway.pk`.
- Login on `app.unipathway.pk` should hide the "EduCloud" wordmark and show UniPathway's logo.

---

## Step 4 — What NOT to change

- **Do not** duplicate the Supabase project. Both remixes point at the same backend; `tenant_id` + RLS already isolate data.
- **Do not** copy edge functions per-project. They live in the backend and are called from either frontend.
- **Do not** run migrations from the UniPathway remix. Schema changes ship from EduCloud only, so there's one source of truth.
- **Do not** move files inside this original project before remixing — imports will break in both remixes.

---

## Verification checklist (per remix)

- [ ] `npm run build` (or Lovable build) passes with only the kept files.
- [ ] Login round-trips via the shared backend.
- [ ] Custom domain resolves and SSL is Active.
- [ ] `robots.txt`, `sitemap.xml`, `<title>`, `<meta description>`, and canonical match the new domain.
- [ ] Social preview shows the correct brand (change `og:image` when a real asset exists; otherwise leave the tag off and let hosting inject a screenshot).
