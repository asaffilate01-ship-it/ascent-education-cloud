# Payment Security Acceptance

A payment rail is green only after:
1. server creates checkout/intent from authoritative order/allocation amount;
2. provider credentials are server-only;
3. webhook signature is verified against raw request bytes;
4. timestamp/replay window is enforced where supported;
5. provider event ID is idempotently recorded before business mutation;
6. tenant/order/invoice relationship is resolved server-side rather than trusted from arbitrary metadata;
7. duplicate webhook delivery does not duplicate settlement, notifications or accounting;
8. settlement/reconciliation matches provider report/bank receipt;
9. refund/failure/chargeback paths are tested where applicable;
10. audit records omit secrets/card data.

Stripe implementation already verifies HMAC and timestamp. It still requires idempotency-ledger integration and stronger authoritative tenant/order resolution before the gate passes.
