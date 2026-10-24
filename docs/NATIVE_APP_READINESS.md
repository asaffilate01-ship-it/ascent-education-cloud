# Native build and release readiness — 24 October 2026

## Implemented

Android and iOS Capacitor 8 projects (`pk.edu.unipathway.app`) package the same React application and role guards. Build with Node 24: `npm ci`, `npm run build`, `npx cap sync`. The web application remains supported. Native builds use bundled content, HTTPS only, no remote `server.url`, and do not register the app-shell service worker. Android backups are disabled. Launcher assets use the UniPathway mark.

Native Supabase sessions and PKCE verifier use Android Keystore-backed storage / iOS Keychain, with iCloud synchronization disabled and iOS device-only access while unlocked. Storage errors propagate; no plaintext fallback. Google OAuth opens the system browser. Only `unipathway://auth/callback` with a single authorization code is accepted; implicit access-token fragments and other hosts/paths are rejected. The SDK exchanges the code against the locally stored PKCE verifier. Auth lifecycle pauses/resumes token refresh. Recovery and registration redirects use this callback; email/password sign-in remains supported.

Teams classroom buttons validate Microsoft meeting URLs and hand off to the operating system using App Launcher. Teams or the device browser handles the meeting; UniPathway does not embed or replace Teams. Native document capture is wired to the assignment uploader, with an explicit upload button after capture. Existing file inputs remain available.

Notification settings support explicit permission, token registration, revocation and registration timeouts. Tokens are hidden from client table reads; RPCs bind ownership and tenant server-side. Sign-out revokes the registered device first and reports failures. Tokens expire after 30 days unless registered again. A server-only worker delivers generic notifications through FCM HTTP v1 and APNs HTTP/2, with tenant-scoped leases, deduplication, preference checks immediately before sending, five-attempt retry limits and invalid-token expiry. Delivery is **not active**: credentials are absent, and `VITE_NATIVE_PUSH_ENABLED` defaults off. Do not enable it until FCM/APNs configuration and real-device receipt/revocation tests pass. In-app notifications remain available independently.

## Automated build gates

`.github/workflows/native-build.yml` compiles an Android debug APK and an unsigned iOS simulator application on pull requests. Artifacts are retained seven days. Debug APKs and simulator builds are not store releases. Production CI separately covers TypeScript, lint, web build, browser acceptance, edge type checks, database tests and the full-schema rehearsal.

## Provider and signing gates

1. Apply the reviewed additive operations/guardian and native-device migrations after inspecting hosted migration history. Deploy `invite-staff`. Run hosted role/tenant acceptance using approved test accounts. Never replay the fresh-staging replacement history into production.
2. Add `unipathway://auth/callback` and `unipathway://auth/callback?flow=recovery` to Supabase Auth redirect URLs; configure the Google provider. Confirm email/password, OAuth cancellation, cold/warm callbacks, recovery and invitations on physical devices. Invitation emails currently open the HTTPS password setup page; the same account can then sign into the native app.
3. Android release: obtain the organisation's Play Console account, release keystore and passwords. Keep the keystore outside git. In Android Studio open `android`, select Generate Signed Bundle/APK → Android App Bundle → release, choose the approved keystore, and record the signing certificate SHA-256. Verify the resulting AAB in Play internal testing before rollout. Do not use the CI debug key for store publication.
4. iOS release: open `ios/App/App.xcodeproj` in supported Xcode. Select the organisation's Apple Developer team, configure signing for `pk.edu.unipathway.app`, set the release version/build, archive for a generic iOS device and validate/export through Organizer for TestFlight. No distribution certificate, provisioning profile or signed IPA is included in this repository.
5. Before push activation: supply `android/app/google-services.json`, enable the iOS Push Notifications capability with the correct APNs environment and provisioning profile, deploy/test `scripts/native-push-worker.mjs` with generic lock-screen content and server-side tenant checks. Keep all provider signing credentials server-side. Native registration alone is not proof of delivery.
6. Complete store privacy disclosures, screenshots, support URLs, account-deletion testing, consent, accessibility and the physical-device matrix (foreground/background, offline/reconnect, permission denial, uploads and Teams return).

Signing accounts/certificates, redirect allowlists, FCM/APNs delivery, real-device tests and store submission remain external release gates. They cannot be certified by a local or simulator build.

## Push worker deployment

Run `node scripts/native-push-worker.mjs` once per minute from a supervised server scheduler. It exits after up to 20 claims. Set `NATIVE_PUSH_ENABLED=true`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `UNIPATHWAY_TENANT_ID` in that server's secret environment. Android uses `GOOGLE_APPLICATION_CREDENTIALS` pointing to a protected Firebase service-account JSON file. iOS uses `APNS_KEY_FILE`, `APNS_KEY_ID`, `APNS_TEAM_ID` and `APNS_ENVIRONMENT` (`production` or `sandbox`). Never expose these through VITE variables. Each worker handles only configured platforms and the configured centre.

Apply `20261024143459_unipathway_native_push_delivery.sql` before starting the worker. It processes unread supported notification types created within the last day and after device registration; unknown categories remain in-app only. Broad academic notifications require all academic push preferences enabled. Payloads contain no learner names, grades, messages or joining links. Provider acceptance is recorded separately from physical device receipt. The worker rechecks consent and device validity before each send, though an in-flight provider request cannot be recalled. Network ambiguity can cause a repeated delivery after lease recovery; APNs uses a stable delivery identifier. Five failed attempts require an operator to investigate before retrying. No scheduler or provider credentials have been activated by this code change.
