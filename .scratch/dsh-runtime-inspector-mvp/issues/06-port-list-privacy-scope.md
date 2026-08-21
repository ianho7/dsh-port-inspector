# 06: Read-only port_list and privacy/session scope

**What to build:** An Agent can inspect current listeners and safely reason about its own DSH work without receiving another Session's command history or gaining a termination capability.

**Blocked by:** 03: Windows listener and verified ancestry attribution

**Status:** resolved

- [x] The read-only `port_list` Tool returns visible listener details, confidence, and available origin or lifecycle-owner information.
- [x] The current Session receives full redacted attribution; another DSH Session is represented only by a coarse ownership indicator.
- [x] Commands, argv, executable paths, project paths, logs, RPC payloads, and Tool output are consistently redacted and length-bounded.
- [x] Environment secrets are never collected, and the Tool cannot trigger managed or external termination.
- [x] Unsupported or degraded mode returns safe read-only results and privacy behavior is covered by tests.

## Answer

Implemented the model-facing `port_list` Tool and its privacy projection in `src/port-list.ts`. The Tool is registered through the injected DSH Tool registry, has no arguments or action callback, returns visible TCP listener details plus confidence/scan status, and is unregistered during Bundle unload. Its result is explicitly `readOnly: true` and bounded to 128 rows with a truncation marker.

Attribution is session-scoped: the current Session receives bounded Session/Agent/Turn/Step/Call/root Call/Tool fields, redacted command/workdir, project, and only a verified lifecycle owner. Other Sessions are reduced to `ownership: another-dsh-session` without Session, Call, command, workdir, project, or owner identifiers. Inferred matches never expose managed-owner authority. Degraded mode scans without origins and remains read-only.

The shared redaction boundary now bounds and sanitizes workdirs, executable/project paths, commands, and Tool rendering; no environment blocks are read. Tests cover current/other Session privacy, secret/path redaction, inferred-owner suppression, incomplete scans, output bounds, degraded mode, reversible registration, and the absence of termination capability.

Evidence: bundled TypeScript build and no-emit typecheck pass; Bun suite passes 50/50 with the pre-existing Stock DSH smoke skipped when `DSH_REPO` is unset; `git diff --check` passes. The attempted real Stock DSH smoke with `DSH_REPO=D:\project\deepseek-harness` is environment-blocked while copying the pinned native `koffi` package with `EPERM`; no Ticket 06 behavior is inferred from that failure.
