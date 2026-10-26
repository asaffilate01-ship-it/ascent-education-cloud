# Browser coding and lab navigation — 26 October 2026

The Python playground previously printed approximations instead of executing the supplied program. It now executes Python with pinned Pyodide 0.27.7 in a disposable worker within a sandboxed opaque-origin iframe. JavaScript also uses a disposable worker, allowing endless loops to be terminated without freezing the editor.

## Delivered

- Real Python functions, loops, standard-library imports, pre-entered stdin, stdout/stderr and exceptions.
- Ten-second execution limit, ninety-second runtime-download timeout, manual Stop and bounded output.
- Learner code cannot read the authenticated LMS document or storage. No tokens or user records are passed into the runtime. JavaScript network requests are blocked by CSP; Python's CSP permits the pinned runtime CDN path. This is an educational browser playground, not a hardened adversarial compute service.
- Each run starts fresh. Drafts survive language switches in the current mounted page; Download remains necessary before navigating away. No cross-device persistence or offline guarantee.
- HTML preview updates on Run. Mobile editor/output panels have useful minimum heights and language controls wrap. Inputs and reset controls have accessible names.
- Course navigation links to practical labs with the module query preserved. Lab catalogue filters by that module; refresh/retry controls and refreshed tutor-help history improve recovery.

## Verification

`CHROMIUM_PATH=/path/to/chromium node scripts/test-browser-code-runtime.mjs` exercises actual JavaScript and Python, standard-library/input execution, exceptions, origin isolation, loop termination, output limits and script-tag escaping. It needs internet access to the pinned public Pyodide distribution. The test supports HTTPS_PROXY in restricted runners.

Component tests cover draft retention, explicit preview execution, Stop and rejection of unrelated message events. Existing lab access contracts remain in place. TypeScript and production build are checked before merge.

## Still open

This closes the simulated-Python gap, not all LMS or provider gaps. Full cloud desktops need provider provisioning, images, persistence, real budget/expiry enforcement and live class acceptance. Managed language pair/group audio and intercom still require implementation and a tested media service. Teams user/calendar provisioning, Pakistan checkout and settlement adapters, advanced content/offline workflows and specialist dashboard acceptance remain separate work. Account and hardware requirements are maintained in `UNIPATHWAY_CONNECTION_CHECKLIST.md`.

Reference: https://pyodide.org/en/0.27.7/usage/webworker.html and https://pyodide.org/en/0.27.7/usage/streams.html . This release pins the classic-worker-compatible distribution; version upgrades require the opaque-origin browser tests, not just a version-string change.
