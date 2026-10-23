# Stripe invoice ledger activation

The invoice webhook now records each successful PaymentIntent in one PostgreSQL transaction: verified payment, invoice balance (through the existing payment trigger), unique receipt, student notification and audit entry. Replays of the same intent return a duplicate receipt without repeating writes. Partial payments accumulate instead of replacing the existing balance. Failed writes return HTTP 503 so Stripe retains retry behavior.

## Deployment prerequisites

Deploy migration `20261023203716_unipathway_stripe_invoice_ledger.sql` before deploying `webhook-stripe`. Configure `STRIPE_WEBHOOK_MODE=test` for staging and `live` only for the production endpoint, plus the corresponding endpoint's `STRIPE_WEBHOOK_SECRET`. Missing mode configuration deliberately returns 503. Supabase URL and service-role key must be available to the function. Keep the provider endpoint's JWT verification disabled; raw Stripe signature verification authenticates requests.

Checkout currently creates PKR charges, so this ledger accepts PKR only. Metadata must contain the existing invoice ID, tenant ID and paying student ID. The function verifies those against the locked invoice. The RPC and receipt table are unavailable to browser roles.

## Staging acceptance still required

Use an isolated Stripe test endpoint and staging database. Pay an invoice partially, then complete it; confirm amounts, verified payments, notification and audit rows. Resend the same event and confirm no duplicate effects. Confirm test/live mismatch and invalid signatures are rejected. Exercise simultaneous payment attempts, temporary database failure and Stripe retry delivery using real hosted services. Local tests do not prove provider delivery, hosted concurrency or deployment configuration.

Before activation, reconcile legacy invoices whose `paid` amount differs from the sum of verified payment rows. This migration does not guess historical payments. Such invoices fail closed. An already charged payment that exceeds the remaining balance also fails reconciliation and requires finance review; returning an error does not undo the Stripe charge. Monitor webhook delivery failures and resolve underlying ledger discrepancies before retrying.

Refunds, chargebacks, subscription billing, failed-payment notifications, non-PKR currencies and institutional payment rails are outside this invoice-success handler. Unrelated events are acknowledged without ledger writes. Deploying this code does not complete those flows or authorize live charges.

## Local verification

`npm run test:fresh-schema` applies the full reviewed fresh-staging schema and exercises ledger role isolation, metadata validation, partial/final payments, duplicate event/intent handling, overpayment rejection, legacy drift and rollback after an injected audit failure. `src/test/stripe-webhook.test.ts` verifies raw signatures, rotation, timestamp bounds, test/live separation and retry responses with a mocked database; it does not call Stripe.
