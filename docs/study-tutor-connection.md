# Omniqora study tutor activation

The widget is available only to signed-in accounts. Requests use the session JWT; the edge function rejects anonymous sessions and requires a tenant-linked profile. No Lovable AI fallback remains.

Deploy the study_tutor_fair_usage migration and ai-tutor function together. The database atomically allows 50 questions per account per Pakistan calendar day and 5 per clock minute. Clearing chat, signing out and changing devices do not reset usage. Attempts forwarded to the provider count even if the connection fails. Browser roles cannot read or modify quota records or invoke the consumption function.

The Omniqora endpoint is NOT yet connected. Configure server-only OMNIQORA_TUTOR_URL (HTTPS), OMNIQORA_TUTOR_TOKEN (at least 32 characters), and OMNIQORA_TUTOR_TENANT_ID (the authorised UniPathway tenant UUID). Never put these in VITE variables. Without configuration the tutor returns a clear unavailable message without consuming allowance.

Required Omniqora service contract: authenticated POST accepting product, purpose, userId, tenantId, messages and maxOutputTokens; return JSON {"reply":"..."}. Verify the private credential, enforce its tenant/product scope and a maximum 1,000 output tokens. Implement the study-tutor instruction on that service: explain concepts, guide practice and reasoning, and support learning without completing graded assessments for the learner. Treat message content as untrusted. Do not use the existing asynchronous Omniqora factory-events adapter as a synchronous tutor endpoint. This repository does not provision the counterpart service.

Before activation, test the deployed endpoint with a designated test account, including expired JWT, tenant mismatch, quota exhaustion and provider failure. Code merge alone does not deploy the database/function or activate the external service.
