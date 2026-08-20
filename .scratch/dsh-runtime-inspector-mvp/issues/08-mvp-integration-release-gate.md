# 08: MVP integration and lifecycle release gate

**What to build:** The complete Windows MVP passes a realistic multi-Session investigation and shutdown workflow without false attribution, leaked history, or unsafe cleanup.

**Blocked by:** 01: Bundle activation and compatibility gate; 02: Tool Call to root PID Process Origin; 03: Windows listener and verified ancestry attribution; 04: Managed Job and Terminal lifecycle attribution; 05: External single-PID termination safety; 06: Read-only port_list and privacy/session scope; 07: Listener inventory and safe UI actions

**Status:** ready-for-agent

- [ ] Two Sessions can start same-named services while the inventory keeps their verified origins separate.
- [ ] Code Mode, concurrent Tool Calls, background Jobs, persistent Terminal creation, cancellation, and thrown Tool bodies retain the documented attribution boundaries.
- [ ] A descendant remains attributable after its root exits, origins clear on DSH restart, and observer unload leaves an existing process alive.
- [ ] PID reuse, ancestry uncertainty, redaction, other-Session disclosure, managed shutdown failure, and external termination safety are exercised end to end.
- [ ] The full acceptance workflow verifies that closing one selected target changes the expected port state without affecting the other service.
- [ ] Each release-gate result records the real acceptance surface, raw evidence, coverage, verifier class, and exit status; a green component test alone cannot close the gate.
- [ ] Repeated probes capture baseline, inputs, expected and observed signals, exit code, and timestamps, with transient, strategy, environment, policy, and unknown failures classified and bounded.
