# 05: External single-PID termination safety

**What to build:** A user can explicitly terminate one eligible external listener without turning heuristic attribution or a stale PID into broad process-tree termination.

**Blocked by:** 03: Windows listener and verified ancestry attribution

**Status:** resolved

- [x] The action is available only for an explicitly selected same-user external PID with complete identity.
- [x] Immediately before termination, PID, creation time, and executable are re-scanned; any mismatch aborts the action.
- [x] The action affects only the selected PID, never recursively kills an external tree, never auto-elevates, and clearly differs from managed shutdown.
- [x] Protected, other-user, system, access-denied, or incomplete-identity targets remain read-only.
- [x] A fresh listener scan reports whether the selected port was released and tests cover failure paths.

## Answer

Implemented `ExternalProcessTerminator` and the native Windows `ExternalProcessAdapter`. External termination requires explicit confirmation, a complete selected listener identity, no managed Job/Terminal owner, a same-user SID, an unprotected/non-system target, and a termination-capable process handle. The adapter re-reads PID, FILETIME creation identity, executable, user, and protection state from one opened process handle before calling `TerminateProcess`; no process-tree operation or elevation path exists.

`runtimeInspector.terminateExternal()` is separate from managed `shutdown()`. A successful action runs a fresh listener scan and returns `portReleased`; an incomplete scan leaves that value unknown rather than treating an empty result as proof. Tests cover confirmation, PID/creation/executable mismatch, managed owner, other-user, protected/system, access denied, compatibility degraded mode, single-PID behavior, and post-action release reporting.

Evidence: bundled TypeScript build and no-emit typecheck pass; Bun suite passes 45/45 with the existing Stock DSH smoke skipped when `DSH_REPO` is unset. A real external termination smoke remains part of the final G1-G6 integration gate because it must use a disposable same-user Windows listener.
