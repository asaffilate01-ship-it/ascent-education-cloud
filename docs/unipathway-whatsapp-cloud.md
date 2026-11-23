# UniPathway WhatsApp Cloud API — P0 integration (OFF by default)

This branch adds a signed Meta webhook, idempotent inbound text logging, conservative public-course FAQ decisions, and a staff-handoff state. It is **not** a live bot, dashboard inbox, WhatsApp Business App coexistence configuration, or access-controlled student records lookup. It does not dispatch proactive notifications, marketing or templates.

## Activation gates
1. Confirm the production Supabase project is **UniPathway**, not DISHBEE. Inspect existing schema, back up and rehearse the separate review-only SQL in `docs/unipathway-whatsapp-activation.sql`; prepare a new additive hosted migration. Never replay historical migrations blindly.
2. Deploy the `unipathway-whatsapp-webhook` Edge Function with JWT verification **disabled only for this webhook**, since it authenticates Meta with the App Secret signature. HTTPS required.
3. Supply **server-only** secrets: `UNIPATHWAY_WA_VERIFY_TOKEN`, `UNIPATHWAY_WA_APP_SECRET`, `UNIPATHWAY_WA_PHONE_NUMBER_ID`, `UNIPATHWAY_WA_TENANT_ID`, `UNIPATHWAY_WA_ACCESS_TOKEN` and optionally `UNIPATHWAY_WA_GRAPH_VERSION`. Never use `VITE_` secrets. Do not commit credentials.
4. In Meta Developer configuration set the callback to `https://<UNIPATHWAY_SUPABASE_HOST>/functions/v1/unipathway-whatsapp-webhook`, use the verify token, and subscribe to the WhatsApp Business Account `messages` field. Validate business ownership, phone onboarding, number coexistence and Meta permissions.
5. Test GET challenge, invalid HMAC (401), valid raw-body HMAC, duplicate message IDs, unsupported media, mismatched phone ID, unauthorised access, delivery webhooks and provider failures with a test number. Verify no cross-centre record access.
6. Only after successful staff-pilot validation set `UNIPATHWAY_WA_AUTO_REPLY_ENABLED=true`. Default is disabled. Reply automation is limited to public FAQ and **only after an incoming user message**. All ambiguous, student-specific, safeguarding, payment and account requests pause the bot and require a human. The dashboard staff inbox and reopening/handoff controls are still to build; until that exists **do not enable automatic replies**.
7. Record user consent and purpose before proactive outbound templates. Approved Meta templates are required outside the 24-hour customer-service window. Check pricing, privacy retention, opt-out, guardian verification, role-specific access, audit/erasure, language quality, and delivery observability before production.
8. Do not turn on learner-specific answers until authorisation and guardian-to-student relationship are checked server side on each request. Never send attendance, grades, health, fees or identity data from a WhatsApp number match alone.

## Scope / limitations
- First release ingests text only. Media is deliberately discarded; status receipts are not yet synchronised.
- Handoff persists `needs_staff`, but no inbox UI consumes the records yet.
- Provider outbound error marks a staff follow-up; no automated retry queue, delivery confirmation or full message lifecycle.
- The simple FAQ rules are deterministic, not generative AI; no private student database query is made.
- Production deployment, hosted DB migration, Meta verification and live end-to-end testing were **not performed** by committing these source files.
