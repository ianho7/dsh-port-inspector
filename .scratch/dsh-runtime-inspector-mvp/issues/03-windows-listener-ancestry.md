# 03: Windows listener and verified ancestry attribution

**What to build:** The inspector lists visible Windows TCP listeners and explains whether each listener can be proven to descend from a captured root process.

**Blocked by:** 02: Tool Call to root PID Process Origin

**Status:** ready-for-agent

- [ ] A listener record includes PID, endpoint, port, process creation identity, executable, and the best available project signal.
- [ ] ParentProcessId traversal matches both PID and creation identity and produces `verified`, `inferred`, or `unattributed` confidence states.
- [ ] PowerShell-to-npm-to-Node ancestry, concurrent same-named services, and multiple roots from one Tool Call remain distinct.
- [ ] PID reuse, unreadable or exited ancestors, parent cycles, and escaped daemons degrade safely instead of becoming verified attribution.
- [ ] Scanner and ancestry behavior is covered by Windows-focused tests with bounded, redacted output.
