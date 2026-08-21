# 03: Windows listener and verified ancestry attribution

**What to build:** The inspector lists visible Windows TCP listeners and explains whether each listener can be proven to descend from a captured root process.

**Blocked by:** 02: Tool Call to root PID Process Origin

**Status:** resolved

- [x] A listener record includes PID, endpoint, port, process creation identity, executable, and the best available project signal.
- [x] ParentProcessId traversal matches both PID and creation identity and produces `verified`, `inferred`, or `unattributed` confidence states.
- [x] PowerShell-to-npm-to-Node ancestry, concurrent same-named services, and multiple roots from one Tool Call remain distinct.
- [x] PID reuse, unreadable or exited ancestors, parent cycles, and escaped daemons degrade safely instead of becoming verified attribution.
- [x] Scanner and ancestry behavior is covered by Windows-focused tests with bounded, redacted output.

## Answer

Implemented a bounded, read-only Windows listener scanner. `netstat.exe -ano -p tcp` supplies TCP LISTENING endpoints; a lazy Toolhelp32 adapter supplies PID, ParentProcessId, and executable; the existing `GetProcessTimes` helper supplies the canonical decimal FILETIME creation identity. Native boundaries are injectable for deterministic tests.

An ancestry row is `verified` only when the chain is cycle-free, every traversed creation identity is readable, and exactly one captured origin matches both root PID and creation identity. A unique root with an unreadable identity is `inferred`; PID reuse, ambiguous roots, missing ancestors, cycles, and escaped chains remain `unattributed`. Results are bounded to 4,096 listeners and the scanner never owns or terminates processes.

Evidence: TypeScript build and no-emit typecheck pass; authoritative Node suite passes 32/32, including the real Stock DSH `dsh-0.1.0-rc.8` smoke and Windows native scanner smoke. `runtimeInspector.listeners()` exposes the current snapshot for later port/action tickets.
