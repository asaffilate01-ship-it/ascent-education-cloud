# Supervised server workers

These Linux systemd units prepare the existing one-shot recording and native-push workers for ongoing operation. They do not deploy themselves, enable providers, publish recordings or prove delivery. Keep deployment deferred until hosted reconciliation and operator approval are complete.

## Prepare an isolated worker host

Use Node 22+ installed at `/usr/bin/node`, a dedicated `unipathway-worker` system user/group, and a reviewed checkout at `/opt/unipathway`. Install dependencies using `npm ci --ignore-scripts` (recording transfer currently needs the development dependency `tus-js-client`, so do not omit development dependencies). Keep checkout/dependencies root-owned and readable, but not writable, by the worker user. Verify the Node path before installation.

Create `/etc/unipathway` owned by root with group `unipathway-worker` and mode 0750. Store environment files with mode 0600 owned by root; systemd loads them before dropping privileges. These are systemd EnvironmentFile syntax, not shell scripts. Never put credentials in the repository or frontend variables. Use a separate environment file per worker to avoid exposing unrelated provider keys.

Both files need `SUPABASE_URL` (HTTPS origin), `SUPABASE_SERVICE_ROLE_KEY` and `UNIPATHWAY_TENANT_ID` (UUID). Service-role credentials bypass RLS: use a dedicated trusted host and verify the tenant against the actual hosted project.

`recordings.env` additionally needs `MS_TENANT_ID`, `MS_CLIENT_ID` and `MS_CLIENT_SECRET`. Confirm Microsoft consent, organiser ownership, licences and access policy separately.

`push.env` additionally needs `NATIVE_PUSH_ENABLED=true` and at least one provider:

- Android: `GOOGLE_APPLICATION_CREDENTIALS=/etc/unipathway/fcm.json`.
- iOS: `APNS_KEY_FILE=/etc/unipathway/apns.p8`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_ENVIRONMENT=sandbox` or `production` matching the signed app.

Credential files must be root-owned, group-readable by `unipathway-worker` (0640), and readable only on this host. The preflight checks JSON/private-key structure without contacting providers. It cannot prove authorisation, project ownership or delivery.

## Install and activate only when authorised

Copy the four `.service`/`.timer` files to `/etc/systemd/system/`. Run `systemd-analyze verify` on the installed units and `systemctl daemon-reload`. Review the environment before any service start: starting a service processes real queued jobs.

When approved, enable the relevant timer with `systemctl enable --now unipathway-recordings.timer` or `systemctl enable --now unipathway-push.timer`. Enable only configured providers. No installer automatically starts either service.

Timers run after the previous process finishes, so one host does not overlap its own jobs. Keep one scheduled host per tenant; database leases remain the cross-process boundary. Recordings run every two minutes after completion; push every minute. Recording processes have a 50-minute service deadline; push processes have a 15-minute deadline. A failed run is retried at the next timer interval; credential failures remain failures and must be investigated. Do not reset queue rows or leases to hide failures.

## Verify and monitor

Use `systemctl list-timers 'unipathway-*'`, `systemctl status unipathway-recordings.service`, and the corresponding push service. Inspect journal output with `journalctl -u unipathway-recordings.service` (or push). Monitor non-zero exit results, queue age and repeated retries in the existing admin screens. A timer being active does not mean a worker succeeded. Connect service-failure and queue-age alerts to the operator's monitoring system before relying on unattended processing.

The worker account cannot write the checkout or host filesystem; recording downloads use a private temporary directory. Review free temporary-disk space for up to 2 GB per recording. Provider acceptance of a notification is not evidence of device receipt. A transferred recording remains a draft until staff release it.

Perform live acceptance with authorised accounts: actual Teams recording transfer, draft access denial, staff release, learner playback, and both platforms' notification receipt plus revoked-device suppression. Record evidence without tokens or student media in public logs.

## Stop and roll back

Stop timers first, then services: `systemctl disable --now unipathway-recordings.timer unipathway-push.timer` followed by `systemctl stop unipathway-recordings.service unipathway-push.service`. Timers alone do not stop an in-flight service. Restore a reviewed compatible source revision before restarting; preserve database jobs and let leases expire normally. Rotate credentials if host access is compromised.
