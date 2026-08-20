# 06: Read-only port_list and privacy/session scope

**What to build:** An Agent can inspect current listeners and safely reason about its own DSH work without receiving another Session's command history or gaining a termination capability.

**Blocked by:** 03: Windows listener and verified ancestry attribution

**Status:** ready-for-agent

- [ ] The read-only `port_list` Tool returns visible listener details, confidence, and available origin or lifecycle-owner information.
- [ ] The current Session receives full redacted attribution; another DSH Session is represented only by a coarse ownership indicator.
- [ ] Commands, argv, executable paths, project paths, logs, RPC payloads, and Tool output are consistently redacted and length-bounded.
- [ ] Environment secrets are never collected, and the Tool cannot trigger managed or external termination.
- [ ] Unsupported or degraded mode returns safe read-only results and privacy behavior is covered by tests.
