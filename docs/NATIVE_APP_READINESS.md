# Native app readiness

UniPathway uses one responsive React product for web/PWA and prepares Capacitor shells for iOS and Android.

## Personas
Student: dashboard, courses, live Teams class deep links, assignments/document capture, grades, Outlook/Microsoft account, notifications, careers/student life.
Lecturer: teaching dashboard, timetable, Teams classes, attendance, lesson resources/whiteboards, institutional messaging. No summative marking.
Admin/operations: role-specific admissions, QA/IQA, exams, finance and operational approvals. High-risk actions require re-authentication/MFA and may remain web-first where mobile UX is unsafe.
Owner/director: action centre, approvals, KPIs, security/compliance alerts and audit views.

## Native capabilities
Push notifications; secure token/key storage; biometric/passkey re-authentication where supported; camera/document capture; file picker/share sheet; deep links/universal links; app links into Teams/Outlook; network/offline state; safe-area/keyboard handling; update/version enforcement.

## Security
Never embed service-role/provider secrets in the app bundle. Native app uses the same Supabase auth/RLS/API authorization as web. Store session material only through platform-secure storage when native plugins are enabled. Certificate pinning is not a substitute for TLS/API authorization. Sensitive admin/finance/academic actions require server authorization and audit logging.

## Release gates
Apple/Google developer accounts; bundle IDs/signing; privacy manifests/store disclosures; screenshots/metadata; deep-link association files; push credentials; crash reporting; device matrix; accessibility; offline/reconnect; camera/file permissions; app-store review; staged rollout.

The PWA remains supported; native shells must not fork business logic.
