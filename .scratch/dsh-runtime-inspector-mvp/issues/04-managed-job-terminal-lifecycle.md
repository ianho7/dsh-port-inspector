# 04: Managed Job and Terminal lifecycle attribution

**What to build:** Background PowerShell and Terminal-created processes retain their DSH lifecycle owner so the inspector can close them through the same managed semantics users already rely on.

**Blocked by:** 02: Tool Call to root PID Process Origin

**Status:** resolved

- [x] A background root spawned before Job ID allocation is linked to the one newly published Job, with the structured Tool result used only as a cross-check.
- [x] The first persistent PowerShell Terminal creation is linked to its Terminal session; later sends are not falsely given new Call-level attribution.
- [x] Managed Job shutdown uses owner-fenced kill followed by bounded wait, and Terminal shutdown uses exact-owner termination with process-tree quiescence.
- [x] Managed shutdown failure reports failure without automatic PID or process-tree escalation.
- [x] Owner disposal, cancellation, and observer unload preserve DSH lifecycle behavior and do not kill unrelated processes.

Evidence: `tests/lifecycle.test.mjs` covers Job allocation race, same-owner concurrency, post-publication roots, persistent Terminal first-create, owner fencing, quiescence, cancellation, and unload. Bundled TypeScript build/no-emit typecheck pass; the authoritative Stock DSH Node suite passes 39/39 with the real Bundle load/dispose smoke. The broader two-Session end-to-end G1-G6 path and a real background/Terminal smoke fixture remain final integration evidence gaps.
