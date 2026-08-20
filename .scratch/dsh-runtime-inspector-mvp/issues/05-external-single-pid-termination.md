# 05: External single-PID termination safety

**What to build:** A user can explicitly terminate one eligible external listener without turning heuristic attribution or a stale PID into broad process-tree termination.

**Blocked by:** 03: Windows listener and verified ancestry attribution

**Status:** ready-for-agent

- [ ] The action is available only for an explicitly selected same-user external PID with complete identity.
- [ ] Immediately before termination, PID, creation time, and executable are re-scanned; any mismatch aborts the action.
- [ ] The action affects only the selected PID, never recursively kills an external tree, never auto-elevates, and clearly differs from managed shutdown.
- [ ] Protected, other-user, system, access-denied, or incomplete-identity targets remain read-only.
- [ ] A fresh listener scan reports whether the selected port was released and tests cover failure paths.
