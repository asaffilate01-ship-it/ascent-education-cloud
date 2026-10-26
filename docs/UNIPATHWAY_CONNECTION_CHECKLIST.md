# UniPathway connections and operational readiness — 26 October 2026

Built source, merged code, deployed database and a tested live provider connection are different states. This checklist does not certify hidden server secrets or provider accounts. Enter credentials through server secret settings, never public VITE variables or repository files.

## Accounts and details to supply or confirm

| Connection | Required details / setup | Current boundary |
|---|---|---|
| Social profiles | Facebook, Instagram, X, LinkedIn, YouTube and Google Business/Maps URLs | Official icons exist; public VITE_PUBLIC_*_URL settings accept approved domains. TikTok intentionally remains icon-only. |
| WhatsApp | Business number in +92 international format (`VITE_PUBLIC_WHATSAPP_NUMBER`) | Widget exists and opens WhatsApp with a prepared message. Shared inbox, templates and automated notifications separately need an approved Meta/BSP connection through Omniqora. |
| Resend | Verified sending domain, DNS records, `RESEND_API_KEY`, chosen sender/reply-to and delivery tests | Email source uses `noreply@unipathway.pk`; Resend account/domain and live sending are not certified. Auth password-reset/confirmation email needs separate Supabase Auth SMTP configuration and redirect URLs. |
| Pakistan payments | Registered merchant, settlement bank/IBAN, merchant Raast QR/ID, JazzCash merchant account, gateway contract, sandbox/live keys, webhook verification and return URLs | Existing local-rail configuration is not a working local checkout: generic payment route reports connector-required. Stripe is not a substitute for Pakistan merchant onboarding. |
| Microsoft Teams | Microsoft 365 tenant and verified domain, suitable Teams-enabled licences, real organiser accounts, Entra app ID, tenant ID, credential/certificate, approved Graph permissions and organiser access policies | Class/recording workflow source exists; recording worker must be hosted. Generic user provisioning remains a placeholder. Calendar creation, roster invitations and licence provisioning need completion and live acceptance. |
| Omniqora AI | Server HTTPS endpoints, tenant IDs and scoped product tokens for `OMNIQORA_AI_*` and `OMNIQORA_TUTOR_*`, central budgets, worker/edge deployment | Source routes AI through Omniqora. No live endpoint/credential certification; missing config must remain unavailable. |
| Language media | Licensed English/German/IELTS recordings, tutor material, private storage/retention, speaking-review roles, headsets and actual-room tests | Individual player is local. Speaking/guided-audio paths need their full backend/media activation; no complete production language-lab claim. |
| Tech labs | Choose actual provider; AWS AppStream stack/fleet/images/region and least-privilege role, or a real container/Jupyter/Codespaces service; budget/concurrency limits and enforced expiry | AWS AppStream adapter exists. Generic lab provisioner and retired legacy VM controller do not provision environments. Production multi-user sandbox acceptance remains required. |
| NADRA | Approved identity-verification provider/contract, credentials, permitted data fields, consent/retention decisions | No real NADRA lookup certification. Uploading identity evidence is not a NADRA connection. |
| CCTV | Exact NVR/VMS make and model, supported API, camera IDs, secure private gateway, playback/retention and security-role accounts | A universal camera URL cannot supply every vendor's recording search/playback API. Live hardware acceptance required. |
| Operations | Approved staff/student roster, course/cohort assignments, intake dates, fee agreements and institution policies | No fictional roster or operational financial records should be inserted to simulate readiness. |

## Pakistan collection recommendation

Shortlist Bank Alfalah Alfa Payment Gateway first for a bank-backed setup: official documentation lists Pay by Link, cards, JazzCash and Raast dynamic QR. Compare Premier PayFast for consolidated wallet/card/bank/Raast checkout and payment links. Choose only after confirming merchant eligibility, education-business approval, settlement, refund support, transaction fees and signed callback/API behaviour with the provider.

Start with provider-issued invoice payment links plus the institutional merchant Raast QR and JazzCash details. Never invent a Raast deep link or consider a return-page visit/payment screenshot final settlement. Associate every link and provider reference with an invoice; confirm via a verified callback or finance reconciliation. Charge only the student's agreed share and track sponsor receipts separately. Merchant onboarding and provider-issued URLs are needed before displaying live payment actions.

Official references reviewed:
- https://www.bankalfalah.com/digital-banking/ecommerce/
- https://premierpayfast.com/
- https://www.jazzcash.com.pk/business/accept-payments/payment-gateway
- https://easypaisa.com.pk/online-payment-gateway/
- https://resend.com/docs/dashboard/domains/introduction
- https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/meeting-transcripts/overview-transcripts

## Is the language lab complete?

No. Built components include browser listening playback, speed/volume/seek and A–B repeat; microphone/device checks; speaking-evidence recording/review components; tutor-controlled approximate listening synchronisation with learner opt-in, private media and reconnect/access checks. These are intended for in-centre and remote use, subject to actual browser/hardware acceptance.

Still required for a full interactive language lab: managed live pair/group speaking; tutor voice intercom and permitted monitoring; live audio-room membership and reconnect; assignment and recording capture for group exercises; adequate licensed content; operational headset/seat management; accessibility; concurrent in-room/remote acceptance. Teams can provide live teaching/breakout facilities once connected, but a Teams subscription does not itself implement the whole UniPathway language-lab workflow. The local microphone check is ten seconds and is not a submitted recording. Guided audio is approximate practice synchronisation, not exam enforcement.

## Is the virtual tech lab complete?

No. Built elements include assigned lab offerings, online/in-centre/self-study modes, tasks, help requests, launch queues, capacity/budget checks and an AWS AppStream launch adapter. Those require modern lab-schema activation and hosted provider acceptance. Browser JavaScript exercises are isolated playgrounds; the legacy Python demo is a simulation, not a real Python runtime. Real Python/Linux/Windows/cyber labs need provisioned isolated environments, images, persistence, controlled networking and enforced shutdown. Do not point these at production business infrastructure.

## UI/UX coverage

Shared public and dashboard layouts now have consistent branded headings, spacing, clearer contrast, larger controls, focus states and mobile navigation. Course discovery has subject filters; finance has mobile task cards; family views preserve the selected child. These shared changes affect student, lecturer, parent and staff portals using DashboardLayout. They do not establish that every legacy specialist dashboard has been redesigned or acceptance-tested. Remaining visual/flow work includes older wide tables, lab provisioning states, specialist forms, authenticated role journeys and full accessibility checks.
