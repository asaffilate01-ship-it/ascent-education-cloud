# Load Test Plan

Unit tests only codify the target; they are not a load test.

Production-like performance testing should seed approximately 3,000 learners across realistic tenants/cohorts, 24,000+ submissions, 60,000+ notifications, attendance, labs and careers events. Exercise concurrent dashboard reads, assignment submission bursts, marker/IQA queues, event outbox processing and reporting.

For 300+ live classes, load-test UniPathway scheduling/join/attendance/artifact ingestion; Teams media capacity itself must be validated against the contracted Microsoft configuration rather than simulated as UniPathway HTTP traffic.

Record p50/p95/p99 latency, error rate, database CPU/connections, slow queries, Edge Function duration/errors, queue lag and cost. Do not mark scale gate PASS from seed counts alone.
