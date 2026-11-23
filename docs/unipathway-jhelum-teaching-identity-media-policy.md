# UniPathway Jhelum teaching, identity and protected media — implementation contract

**Status:** rules defined, not a hosted deployment. This is an additive operations specification to apply only after owner approval, real project verification, privacy review and tests. Existing LMS, Microsoft provisioning and class archive implementations must not be claimed as fully integrated from this document.

## Scheduling
- **45 minutes** for each school tuition class (Grades 9–12).
- **90 minutes** for ACCA preparation, IELTS preparation, technology certification preparation, OTHM and Qualifi. Apply the same 90-minute format to later comparable vocational/professional courses only after academic approval.
- Sessions must start and finish between **08:00–21:00 Asia/Karachi** daily. Teachers need contracted availability, appropriate qualification, experience, subject/board/level eligibility and no overlaps. Show consecutive sessions and break periods; never silently subtract wages for required work.
- Class capacity cannot exceed verified room limits, even when the product target is 10 or 20. Historic floorplan includes 15-seat and 10-seat rooms, not a verified 20-seat room. Online/hybrid seats also require platform, moderator and licence capacity verification.

## Campus & remote equipment
- Campus tech and language workstations: managed laptops, labelled headsets with microphones, network, power, audio tests, hygiene and accessible replacements. Asset check-in/out and fault logs; no guarantee of an assigned personal laptop.
- Remote: a working laptop (not phone-only), up-to-date browser, stable broadband, webcam where necessary, and wired USB headset with microphone as the default recommendation. Test Teams, LMS, audio recording/playback and accessibility before first lesson. Offer a minimum-specification sheet by course instead of naming unverified products. Avoid recording unnecessary webcam feeds.

## Enrolment & accounts
- **Only after enrolment approval** and appropriate identity/guardian checks, queue a unique institution-managed UniPathway username (e.g. domain-based UPN after verified Microsoft Entra domain setup); confirm provisioning and licence status before issuing an activation invitation.
- Do not assume `@unipathway.pk` is registered and verified in Microsoft 365; ensure it is configured before selecting the account suffix. A site-domain username is not by itself proof that Microsoft SSO works.
- Student ID card: photo only if authorised; student number, programme, validated expiry and machine-verifiable QR/opaque token for staff scanners. **Never** encode passwords, national identity numbers or payment status in the QR, and never use the ID card as the sole login factor. Replacement/revocation workflows required.
- Guardian accounts must be separately verified and scoped to the correct student(s). Never share student credentials with parents.
- Account state lifecycle: applied -> confirmed -> provisioning queued -> provisioned -> invited -> activated; suspended for genuine security/misconduct with appeal; withdrawn/graduated with data retention controls.

## Fee standing & continued access
- Finance source of truth is **verified ledger + reconciled payment confirmation**, not checkout redirect, invoice label, WhatsApp, stale webhook or browser state.
- Before a financial restriction: verify payment due date, student share vs sponsor commitments, refunds, disputes, approved plans, grace periods, hardship accommodations, warning to student and guardian, and manual review.
- Where authorised by the signed enrolment terms and applicable law, overdue students may lose **course delivery** entitlements (new live lessons, recordings, some learning materials) after appropriate notice and review. **Do not lock the entire UniPathway login**: preserve invoices, ability to pay, complaint/appeal channels, safeguarding assistance, relevant personal records and permitted academic record retrieval.
- Unknown or disputed financial states go to manual review; no automated suspension. Restored access on reconciled settlement must be auditable and timely.
- All restrictions enforced in backend RLS/RPC, SSO groups and short-lived content-token issuance; UI-only guards are not security controls.

## Recording + protected lesson resources
- Organisational objective: record each scheduled teaching session, including Jhelum in-class/hybrid and remote sessions, subject to required notice/consent, safeguarding policies and incident-handling. Build a recording audit that identifies missing recordings; never assert 100% capture before vendor and equipment testing.
- All participants must receive recording notices; special care with minors, parental permissions where appropriate, tutor employment terms, retention schedules and secure incident escalation. Do not assume consent alone establishes lawful processing.
- Release recording, slides, lessons, labs and transcripts exclusively to enrolled authorised students/tutors (and authorised guardians where appropriate), scoped by tenant/course/cohort, publication approval and fee standing.
- No general public URLs, shared folder links or browser-accessible service keys. Use gated streaming, time-limited playback sessions and server-side authorisation **at each request**. Apply visible user-specific watermark (student ID/session time), logging, device/session limits, expiring licences and targeted access revocation.
- Default UI: playback/reading, **no download, export, print or share action**. For eligible Teams recordings use supported SharePoint/Teams view-only or download-block policies and verify licensing/permission behaviour. These policies may require additional licences and do not automatically cover manually uploaded media.
- **No solution guarantees zero copying**: screen recording, cameras, screenshots and external audio capture can bypass download restrictions. Protect through watermarking, controlled access and acceptable-use agreements, not false promises.
- Maintain accessible alternatives and legally required accommodations; transcript/caption access should be reviewable for rights and learning needs. Keep separate restricted recordings if safeguarding/personal information occurs.
- Current `LessonArchive` opens a signed private file URL in a new browser tab, and some archive interactions explicitly download resources. These must be changed to a server-authorised view-only player before announcing a no-download feature as live; merely hiding buttons is insufficient.

## Rollout
1. Verify live UniPathway tenant, Microsoft domain and licensing; collect recording/privacy consent and policy requirements.
2. Align scheduler, tutor employment agreements, active enrolments, payment entitlement service, role guards and ID-card issuer.
3. Build restricted media streaming + Teams policy configuration + scoped file viewer, then automated recording capture/retention/release jobs.
4. Integrate notices in English/Urdu across WhatsApp and authenticated dashboards; verify template approval and guardian permissions.
5. Test two different students, guardian without authorisation, fee disputed/unpaid/paid, course change, replay attempts, revoked signed links, screenshot leakage limits and accessibility before production enablement.
