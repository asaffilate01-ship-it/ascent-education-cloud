# Finance payment visibility

The existing `/finance/payments` menu now opens Payment Operations behind the existing Finance role guard. It previously opened FinanceDashboard, while the unused PaymentOperations component queried only institutional tables and converted query failures into empty arrays.

The default view reads the invoice `payments` ledger, including the Stripe reconciliation rows added in the previous increment. Staff can see invoice ID, reference, method, recorded time, amount, status and verification time. Pending manual records are explicitly described as unverified. The institutional selector reads `education_payment_transactions` separately, retaining each record's currency and provider/bank reference. No revenue total combines these ledgers or treats a single page as the full ledger.

Reads explicitly filter the signed-in centre and retain existing database RLS. Each page requests 25 rows, an exact filtered count, and stable date/ID ordering. Status and source changes reset pagination. Failed requests hide records and counts and offer retry. Account, centre or role changes remount the view; late responses are ignored. Unassigned or non-finance users do not issue queries. No new database grants or policies were introduced.

Verification: nine UI tests cover scoped reads, failures and retry, missing counts, empty results, pagination/filter reset, institutional currency/reference separation, role restrictions, late account-switch responses and stale-record removal. App TypeScript, targeted lint and production build passed. Hosted finance-role acceptance remains required.

Remaining finance work: manual payment recording/verification still needs transactional validation and duplicate prevention; the old modal can fall through from an unusable Stripe checkout response into manual recording. Refunds/disputes, instalments and provider readiness are not completed by this read-only view. Stripe events rejected before a payment row exists remain visible through provider delivery monitoring, not this ledger. No hosted change or publication was performed.
