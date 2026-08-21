# Runtime Inspector MVP Loop State

status: running
phase: handoff
current_ticket: 05
current_hypothesis: External single-PID actions can be identity-fenced on one process handle without crossing the managed owner or process-tree boundary.
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
  - id: ticket-04-start
    action: Claim Ticket 04 and inspect the existing attribution registry, DSH owner contracts, and lifecycle test harness before editing runtime code.
    failure_class: none
    raw_evidence: Ticket 04 status changed to claimed; Ticket 02/03 root and scanner boundaries are present; final G1-G6 acceptance remains open.
    conclusion: The next implementation surface is owner association and owner-fenced shutdown, with no process-provider replacement or direct PID escalation.
    next_action_rule: Map the available DSH Job/Terminal APIs and write failing tests for pre-allocation Job linking, first terminal creation, owner fencing, bounded quiescence, and no-escalation failure.
  - id: ticket-04-implementation
    action: Implement managed Job/Terminal lifecycle association, owner-fenced shutdown, and fail-closed unload behavior.
    failure_class: transient
    raw_evidence: "Added src/lifecycle.ts, wired tools/result correlation and terminal session identity into attribution, exposed runtimeInspector.shutdown(), and added six lifecycle tests including same-owner concurrent Job allocation. Bundled TypeScript build and full Bun suite pass 38/38 plus one environment-skipped Stock DSH test; authoritative Node suite with DSH_REPO passes 39/39 including the real Stock DSH Bundle smoke. npm test could not resolve tsc because node_modules is not installed; direct bundled tsc build/no-emit checks passed."
    conclusion: Ticket 04 is resolved. Job links require synchronous onJobsChanged ALS evidence plus structured-result agreement; Terminal links require the exact session and root PID; managed failure and unload never escalate to PID/process-tree actions.
    next_action_rule: Claim Ticket 05 external single-PID termination; preserve the managed-owner boundary and require fresh PID, creation-time, executable, user, and protection checks before any external action.
  - id: ticket-05-implementation
    action: Implement external single-PID termination with a same-user identity fence, native process lease, and post-action listener rescan.
    failure_class: none
    raw_evidence: "Added src/process-actions.ts and src/external-termination.ts, exposed runtimeInspector.terminateExternal(), and added seven focused external termination tests. The native adapter opens one process handle with query/terminate/synchronize rights, checks PID/creation identity/executable/user/protection/access, then calls only TerminateProcess."
    conclusion: External actions are separate from managed shutdown, fail closed for stale or protected/other-user/system/inaccessible targets, never recurse or elevate, and do not claim port release when the fresh listener scan is incomplete.
    next_action_rule: Run the authoritative build/typecheck/full suite, then record the verification evidence and hand off the remaining real disposable-listener G1-G6 gap.
  - id: ticket-05-verification
    action: Run the final Ticket 05 build, no-emit typecheck, focused/full tests, and diff checks.
    failure_class: environment
    raw_evidence: "Bundled TypeScript emit build and no-emit typecheck pass; Bun suite passes 45/45 with one pre-existing Stock DSH smoke skipped because DSH_REPO is unset; git diff --check passes. npm test cannot start because the managed Volta shim cannot create C:\\Users\\admin\\AppData\\Local\\Volta in this environment."
    conclusion: Ticket 05 implementation and deterministic safety coverage pass. The remaining evidence gap is the disposable same-user Windows listener smoke and final G1-G6 integration, not the single-PID safety contract.
    next_action_rule: Hand off Ticket 05 and begin the next unblocked privacy-scoped port_list ticket while retaining the real external action smoke as final integration evidence.
evidence_gaps:
  - The final end-to-end Runtime Inspector acceptance path has not been executed.
  - The real Stock DSH smoke still covers Bundle load/dispose; background Job and persistent Terminal behavior is covered by focused lifecycle tests and remains to be exercised in a dedicated real fixture.
blocked_reason: none
next_action: Hand off Ticket 05 and claim Ticket 06; retain the real disposable-listener smoke as a final integration evidence gap.
