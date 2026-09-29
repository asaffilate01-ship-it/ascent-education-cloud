# Education Payments

An education order may be paid by one or several parties: student, guardian, employer, government, donor/NGO, bank-finance provider or sponsor.

## Payment rails
- bank transfer / bank counter or deposit
- debit/credit card through an approved gateway
- mobile wallet through an approved Pakistan payment provider
- employer invoice
- government/funder claim
- other approved rails

Never store raw card credentials in UniPathway. Provider-hosted/tokenised checkout and signed webhooks should confirm settlement.

## Split funding
One order can have multiple allocations. Example PKR 100,000 tuition: Government PKR 60,000 + Employer PKR 20,000 + Guardian PKR 20,000. Order becomes fully paid/funded only when required allocations are settled/approved.

## Reconciliation
Every transaction stores provider/external reference, amount, status and settlement time. Bank/manual receipts remain pending until finance reconciliation. Government claims and employer invoices follow their own approval/settlement lifecycle.

## Refunds
Refunds/reversals are transactions, never deletion of the original payment record. Finance retains the audit trail.
