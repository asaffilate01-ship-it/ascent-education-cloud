# Pakistan Payment Gateway Adapter Contract

UniPathway is not coupled to Stripe. The production Pakistan provider is selected/configured per tenant from payment_provider_configs.

Supported commercial rails may include card, bank transfer/account, mobile wallet, OTC/counter, employer invoice and government/funder claim according to the chosen licensed provider(s).

Every real-time provider adapter must implement:
1. createCheckout(authoritative session)
2. verifyWebhook(rawBody, headers)
3. parseProviderEvent()
4. resolveTransactionReference()
5. queryPaymentStatus() where supported
6. refund/cancel where supported
7. settlement/reconciliation import

Security invariants:
- amount, currency, tenant, order and allocation come from UniPathway server records;
- provider credentials remain server-side;
- checkout creation is idempotent;
- webhook authenticity uses the provider's official signing/MAC/certificate scheme;
- provider event/transaction IDs are unique/idempotent;
- webhook metadata cannot redirect settlement to another tenant/order;
- reconciliation is separate evidence from checkout success;
- card/PIN/CVV/wallet secrets are never stored by UniPathway.

Do not implement a provider-specific signature algorithm until the chosen gateway's official integration specification and credentials are available.
