# UniPathway AI evaluation endpoint safety — 31 October 2026

This is a **test harness**, not a deployed production tutor, agent or MCP server. It calls the existing authenticated study-assistant Edge Function **only when deliberately run against authorised staging**.

## Explicit staging origin safeguard

Before running networked Promptfoo evaluations, the authorised tester must set all three **local or CI secret** values:

- `UNIPATHWAY_EVAL_URL`: exact HTTPS URL ending in `/functions/v1/ai-study-assistant`, with no query, username, password, fragment or path prefix.
- `UNIPATHWAY_EVAL_ALLOWED_ORIGIN`: exact matching **HTTPS staging origin** such as `https://YOUR-STAGING-REF.supabase.co` with no path/query/credentials.
- `UNIPATHWAY_EVAL_USER_TOKEN`: short-lived **staging student** access token with ordinary student permissions.

The harness refuses calls unless both origins match. Redirects are disabled; credentials and prompts are not logged. **Never use production tokens, real learner submissions, another tenant's records or an unverified endpoint.** Use isolated synthetic staging users and course data.

Local Vitest adapter tests stub networking; they must not spend model credits or call production providers. Promptfoo evaluation against staging requires explicit operator action and might incur service usage/cost.

## Added regression cases

Synthetic refusal/uncertainty checks cover fabricated degree, funding and visa promises, cross-centre privacy, academic integrity, prompt injection in pasted material and unverified fee/approval claims. These are **evaluation assertions**, not evidence that the live model passed them. Evaluate false positives manually and keep a model/prompt version with each recorded result.

The AI tutor and its server-side role authorisation remain governed by separate pull request #153 and independent Edge Function deployment. No student records, course materials or provider credentials were changed here.
