# 08: MVP integration and lifecycle release gate

**What to build:** The complete Windows MVP passes a realistic multi-Session investigation and shutdown workflow without false attribution, leaked history, or unsafe cleanup.

**Blocked by:** 01: Bundle activation and compatibility gate; 02: Tool Call to root PID Process Origin; 03: Windows listener and verified ancestry attribution; 04: Managed Job and Terminal lifecycle attribution; 05: External single-PID termination safety; 06: Read-only port_list and privacy/session scope; 07: Listener inventory and safe UI actions

**Status:** resolved

- [x] Two Sessions can start same-named services while the inventory keeps their verified origins separate.
- [x] Code Mode, concurrent Tool Calls, background Jobs, persistent Terminal creation, cancellation, and thrown Tool bodies retain the documented attribution boundaries.
- [x] A descendant remains attributable after its root exits, origins clear on DSH restart, and observer unload leaves an existing process alive.
- [x] PID reuse, ancestry uncertainty, redaction, other-Session disclosure, managed shutdown failure, and external termination safety are exercised end to end.
- [x] The full acceptance workflow verifies that closing one selected target changes the expected port state without affecting the other service.
- [x] Each release-gate result records the real acceptance surface, raw evidence, coverage, verifier class, and exit status; a green component test alone cannot close the gate.
- [x] Repeated probes capture baseline, inputs, expected and observed signals, exit code, and timestamps, with transient, strategy, environment, policy, and unknown failures classified and bounded.

## Release evidence

- Baseline: Windows local execution world; local Stock DSH commit `528c682e` / `dsh-v0.1.1-rc.1`; compatibility baseline `0.1.0-rc.8` retained.
- Acceptance surface: Bundle boot and health → two Session Tool Calls → foreground/background/Terminal/external listeners → verified OS ancestry and Session privacy projection → owner-fenced Job and Terminal shutdown → identity-fenced external single-PID termination → fresh listener scan → Bundle disposal.
- Native verifier: `Ticket 08 Stock DSH G1-G6 release gate`, exit code `0`, passed in `7998 ms`. It observed four verified DSH origins, positive Terminal PID plus creation identity, Job and Terminal lifecycle owners, released all three selected ports, and retained both foreground listeners plus the unselected external control listener.
- Full verifier: TypeScript emit and no-emit checks exited `0`; Node test suite passed `70/70`, including both real Stock DSH tests, with `0` skipped and exit code `0`.
- Failure history: delayed ConPTY PID, late Tool service publication, uninjected lifecycle service getters, and Win32 protection/current-process handle semantics were classified and fixed; each has focused regression coverage or a native release-gate assertion.
