# Dashboard, classroom and security update

Implemented: responsive shared header, keyboard-accessible mobile navigation with focus containment and Escape, role-specific dashboard quick actions, Pakistan-time classes with automatically refreshed join windows, reliable private-file opening, and agent-owned application filtering.

## Security and CCTV

Apply the security_role migration before cctv_workspace and security_staff_invitation. Deploy the cctv-access Edge Function. Administrators can invite Security Officers through Add Staff; the role has a dedicated /security home. Only same-centre directors/superadmins manage cameras. Security Officers can view enabled cameras only with the corresponding live/playback permission. Other roles cannot read camera inventory. Audit inserts are server-only.

In /security, register provider camera references and set access permissions. Server secrets:
- CCTV_GATEWAY_URL: approved HTTPS adapter endpoint (not an RTSP URL).
- CCTV_GATEWAY_TOKEN: server-only gateway credential.
- CCTV_MEDIA_HOSTS: comma-separated exact allowed media hostnames.

The gateway must authenticate its caller, map tenantId + cameraId to the correct recorder/camera, and return a short-lived authorised stream. Request: {tenantId,cameraId,mode,startsAt,endsAt,viewerId}. Response: {url,mimeType,expiresAt}. Supported MIME types: video/mp4 and application/vnd.apple.mpegurl (native HLS support depends on browser). Expiry must be within 15 minutes and enforced by the gateway. Playback must enforce recording retention and time-range access. The UI requires a reason and a past range of up to 24 hours. Stream URLs are not stored in camera metadata or logs. Every issued viewing link requires a successful audit write. Revocation stops new viewing requests; already-issued links remain valid until their short expiry unless revoked by the provider.

This is a provider adapter contract, not an implemented Hikvision/Dahua/ONVIF integration. RTSP/ONVIF cameras require an NVR/VMS or secure media gateway that supports browser playback. No camera was connected or footage accessed during implementation. Cameras and gateway sessions must be tested in staging before production activation. Camera audit rows are available to authorised managers through the database; an audit-history dashboard is not included yet.

## NADRA

Onboarding calls the authenticated nadra-identity-connector status action. Live verification remains disabled; the old speculative request/response mapping is removed. No identity data is sent to NADRA and no verification status is fabricated. Institutional onboarding through https://nishan.nadra.gov.pk, the approved service contract and API documentation, consent/OTP requirements, test credentials and integration tests are still needed. Existing document uploads remain an admissions review workflow, separate from NADRA verification.

## Validation

Build and TypeScript; role navigation and class-window tests; responsive synthetic-account browser checks at 320/390/768/1440px; isolated PostgreSQL-compatible CCTV migration/RLS checks for student denial, same-centre access, per-camera security visibility, denied security writes and server-only audit inserts. No production migrations, identity checks, camera viewing or live classroom calls were performed.
