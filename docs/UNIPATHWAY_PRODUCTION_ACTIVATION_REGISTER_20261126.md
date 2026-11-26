# Production activation register — 26 November 2026

The authorised centre-leadership Production Readiness workspace includes a read-only register of ten reviewed client activation switches. It reports the running build's client configuration, not a live server probe, user permission or launch decision. No setting can be edited from the dashboard. A browser switch being enabled does not establish backend readiness.

## Safe activation sequence

1. Identify the correct UniPathway Supabase project and current deployment SHA. Do not apply any UniPathway patch to Dishbee or another project. Obtain an approved backup and verify a restore path.
2. Rehearse applicable reviewed forward patches against the actual predecessor schema. Do not replay historical migrations verbatim on an existing production database.
3. Verify hosted RLS, private storage, role membership, centre suspension, cross-centre negative cases and applicable provider credentials. Keep feature switches disabled until approved.
4. Follow the feature runbook for server gates. Test disabled-gate behaviour, apply approved server activation, verify direct API acceptance and coordinate the client publishing environment. For secure enquiries coordinate the legacy bypass prevention switch with the secure client route.
5. Publish the approved main release; confirm the deployed build and exercise the actual authorised workflow on mobile and desktop. Record evidence and expiry in the existing production-readiness review system.
6. If any step fails, disable the affected client switch and server gate using the runbook, preserve evidence and investigate before resuming. No unverified launch pass should be recorded.

## Reviewed areas

- Secure enquiries: see UNIPATHWAY_PUBLIC_ENQUIRY_ACTIVATION_20261126.md. Server secrets never belong in client settings.
- Student planning: see UNIPATHWAY_STUDENT_APPLICATION_PLANNING_ACTIVATION.md.
- Physical security, visitor writes and facilities: see UNIPATHWAY_FACILITIES_REGISTER_ACTIVATION.md and the reviewed physical-security forward patch. Visitor writes and facilities depend on the physical-security browser switch; server-side dependencies are separate.
- Technology lab entitlements, private messaging, class release, office access and staff invitations: use their existing schema and acceptance suites, then verify with actual centre-specific authorised accounts.

The .env.example declarations for reviewed switches are deliberately false. Existing production values are unchanged. The Turnstile site key is public; the secret, quota pepper, service-role key and other provider credentials must remain in authorised server environments.

## Inventory and evidence

Run `node scripts/audit-activation-switches.mjs` to list literal client environment references and identify unlisted or unreviewed names. CI runs this advisory inventory during manifest preflight. It reports names and reference counts only, never environment values. It cannot discover every indirect reference or determine server deployment state. Review additional flags against their implementation and runbooks before extending the dashboard.

The dashboard separates missing, disabled, invalid, blocked and enabled-but-unverified switches. It never certifies backend health. Complete the live acceptance required by LAUNCH_EVIDENCE_REGISTER.md. No live project, data, secrets or activation flags were changed by this release.
