# Runtime Inspector MVP Loop State

status: running
phase: handoff
current_ticket: 04
current_hypothesis: Managed Job and Terminal owner APIs can associate background and persistent-terminal roots without changing the scanner's read-only process boundary.
attempts:
  - id: ticket-01-start
    action: Claim Ticket 01 and define the plugin health seam.
    failure_class: none
    raw_evidence: Ticket 01 status changed to claimed; DSH external Bundle manifest contract inspected.
    conclusion: The first slice can be implemented without DSH core changes or provider replacement.
    next_action_rule: Write the failing health/lifecycle tests, then implement only the behavior they cover.
  - id: ticket-01-g1
    action: Implement the Bundle health gate and run focused plus real Stock DSH lifecycle tests.
    failure_class: none
    raw_evidence: "TypeScript tsc passed; Node test run passed 8/8; real two-boot DSH smoke passed with unrelated sentinel process alive."
    conclusion: Ticket 01 acceptance surface is covered; no process ownership is taken by the plugin.
    next_action_rule: Run two-axis code review against the initial commit, then resolve Ticket 01 and advance to Ticket 02.
  - id: ticket-01-review
    action: Complete standards/spec review and commit the Bundle activation foundation.
    failure_class: none
    raw_evidence: "Standards review clean; spec review clean after observer-contract gate and CLI-version probe; diff check passed; commit f07fee2; Stock DSH smoke passed 10/10."
    conclusion: Ticket 01 is resolved and the next unblocked ticket is root PID attribution.
    next_action_rule: Write failing isolated attribution/observer tests, then implement the smallest observer seam.
  - id: ticket-02-root-pid
    action: Implement Cordis internal/get subprocess observation, tools/execute ALS attribution, Windows FILETIME identity, redaction, and a real Stock DSH probe.
    failure_class: transient
    raw_evidence: "Initial real smoke exposed missing Koffi optional native package and then passed after the test fixture copied the pinned Windows package. After exact-handle dedupe, compatibility/active gating, transactional fallback rollback, and review fixes, the authoritative Node suite passes 24/24 and the real Stock DSH smoke passes with valid root PID, creation identity, redacted command, and unrelated sentinel alive."
    conclusion: The supported Stock DSH seam captures valid local spawn roots without provider replacement or ownership; incomplete frames, invalid identities, unsupported providers, observer errors, fallback races, and disposal fail closed. Registry and call-cache high-water bounds and canonical decimal FILETIME representation are in place.
    next_action_rule: Ticket 02 is resolved; implement the Windows listener/ancestry scanner using the canonical identity helper.
  - id: ticket-02-review
    action: Complete spec and standards review, resolve fallback safety findings, and re-run the full acceptance suite.
    failure_class: none
    raw_evidence: "Reviews identified provider mutation gating and partial-install rollback risks. The implementation now gates on active+verified LocalSubprocessRuntime, preflights descriptors, rolls back partial patches, disables wrappers on compatibility drop, and adds regression tests. Node/Stock DSH suite passes 24/24."
    conclusion: Ticket 02 is ready for handoff; the fallback is explicitly documented as a pinned, reversible observation seam rather than provider replacement.
    next_action_rule: Begin Ticket 03 scanner work; preserve the FILETIME identity contract and fail-closed attribution states.
  - id: ticket-03-scanner
    action: Implement bounded Windows TCP listener discovery and PID-plus-creation-identity ancestry matching.
    failure_class: none
    raw_evidence: "TypeScript build and no-emit typecheck pass; authoritative Node suite passes 32/32, including the real Stock DSH dsh-0.1.0-rc.8 smoke and Windows native scanner smoke. Focused tests cover IPv4/IPv6 parsing, verified PowerShell-to-npm-to-Node ancestry, concurrent roots, PID reuse, unreadable identities, cycles, ambiguity, and bounds."
    conclusion: Ticket 03 is resolved; listener rows remain visible when metadata is denied, while verified attribution is fail-closed and the scanner takes no process ownership.
    next_action_rule: Begin Ticket 04 managed Job/Terminal lifecycle association; preserve owner-fenced shutdown semantics and do not add PID escalation.
evidence_gaps:
  - The final end-to-end Runtime Inspector acceptance path has not been executed.
blocked_reason: none
next_action: Begin Ticket 04 managed Job/Terminal lifecycle association using the existing origin registry and DSH owner APIs.
