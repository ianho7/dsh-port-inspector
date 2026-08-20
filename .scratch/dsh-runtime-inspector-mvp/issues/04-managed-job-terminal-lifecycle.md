# 04: Managed Job and Terminal lifecycle attribution

**What to build:** Background PowerShell and Terminal-created processes retain their DSH lifecycle owner so the inspector can close them through the same managed semantics users already rely on.

**Blocked by:** 02: Tool Call to root PID Process Origin

**Status:** ready-for-agent

- [ ] A background root spawned before Job ID allocation is linked to the one newly published Job, with the structured Tool result used only as a cross-check.
- [ ] The first persistent PowerShell Terminal creation is linked to its Terminal session; later sends are not falsely given new Call-level attribution.
- [ ] Managed Job shutdown uses owner-fenced kill followed by bounded wait, and Terminal shutdown uses exact-owner termination with process-tree quiescence.
- [ ] Managed shutdown failure reports failure without automatic PID or process-tree escalation.
- [ ] Owner disposal, cancellation, and observer unload preserve DSH lifecycle behavior and do not kill unrelated processes.
