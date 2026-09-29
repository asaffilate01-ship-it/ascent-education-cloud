# Payment Provider Activation Checklist

The platform is provider-neutral. Production payment APIs must only be enabled from official provider credentials/documentation.

For each provider collect: legal merchant account, production/sandbox credentials, webhook signing secret, settlement bank account, allowed payment rails, fee schedule, refund API/process, reconciliation/export format, callback domains and support/escalation contacts.

Recommended Pakistan rail categories to procure:
- card/payment gateway/acquirer
- mobile wallet
- bank transfer / virtual account or reference-based collection
- employer invoicing
- government/donor claim settlement

Do not hard-code an assumed Easypaisa/JazzCash/bank endpoint before the merchant onboarding pack is received. Store secrets only in deployment secret storage, never repository/client code.

Webhook rule: provider-signed server webhook is authoritative for online settlement. Browser redirect alone must not mark an order paid.
