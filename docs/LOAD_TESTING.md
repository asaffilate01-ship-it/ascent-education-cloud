# Load Test Harness

Initial k6 smoke targets two operational assumptions: ordinary student browsing ramps to 200 concurrent virtual users and a separate scenario represents 300 concurrent large-class clients. This is only a harness, not evidence of capacity.

Run against a production-like non-production environment with BASE_URL configured. Add authenticated API scenarios for course/material retrieval, attendance, assignment submission, lab status/help queue and notifications. Record database CPU/connections, Edge Function latency/errors, storage latency and provider limits.

The readiness gate passes only after a representative test is run and results are retained. Do not run destructive/write-heavy load tests against live student production data.
