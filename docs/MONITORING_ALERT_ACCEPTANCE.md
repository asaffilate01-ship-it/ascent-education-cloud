# Monitoring & Alert Acceptance

Monitoring gate is green only when a production/staging monitoring service is actually collecting signals and at least one alert route is tested.

Minimum signals:
- frontend unhandled errors and failed navigation;
- Edge Function error rate/latency;
- database availability and connection pressure;
- authentication failures/anomalies;
- payment webhook/reconciliation failures;
- Microsoft/NADRA/lab/STEMCoach/Omniqora integration health;
- background/outbox failures;
- storage access failures;
- CCTV/access-control health where physical systems are commissioned.

Test alerts: simulate one safe non-production failure, confirm alert delivery, acknowledgement and incident creation. Record evidence and recovery time.
