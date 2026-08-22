# Runtime Inspector MVP Loop State

status: mitigated
phase: verify
current_ticket: 09
current_hypothesis: The Windows Host MVP is complete; the accepted Web requirement now extends the acceptance surface to a same-repository dual-face Bundle with a global Sidebar entry, overlay panel, and real Browser-to-Host validation.
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
  - id: ticket-06-implementation
    action: Implement the read-only port_list Tool, Session privacy projection, shared path redaction boundary, and reversible Tool registration.
    failure_class: none
    raw_evidence: "Added src/port-list.ts; registered port_list through injected tools; current-Session attribution includes bounded redacted origin and verified lifecycle owner, other Sessions expose only coarse ownership, and degraded mode passes no origins. Tool output is bounded to 128 rows and marked readOnly: true; no action callback is exposed. Added focused privacy and plugin lifecycle tests."
    conclusion: Ticket 06 behavior is implemented without expanding model-facing process authority; inferred matches never expose managed-owner authority and unload unregisters the Tool.
    next_action_rule: Run build, no-emit typecheck, full deterministic suite, diff checks, and attempt the real Stock DSH smoke before resolving Ticket 06.
  - id: ticket-06-verification
    action: Verify Ticket 06 build, typecheck, privacy tests, full suite, and Stock DSH smoke boundary.
    failure_class: environment
    raw_evidence: "Bundled TypeScript build and no-emit typecheck pass; Bun suite passes 50/50 with one pre-existing Stock DSH smoke skipped when DSH_REPO is unset; enabled DSH_REPO smoke is blocked by EPERM while copying the pinned native koffi package; git diff --check passes."
    conclusion: Ticket 06 implementation and deterministic privacy/read-only coverage pass. The only open evidence remains the pre-existing real Stock DSH and final G1-G6 lifecycle gap.
    next_action_rule: Hand off Ticket 06 and claim Ticket 07 UI/Host inventory and action-state boundary while retaining the real Stock DSH smoke gap.
  - id: ticket-07-implementation
    action: Implement the trusted Host/UI inventory, search/sort, redacted copy, safe project-directory opening, and explicit managed/external/read-only/degraded action states.
    failure_class: none
    raw_evidence: "Added src/host-ui.ts and tests/host-ui.test.mjs; runtimeInspector.host exposes only serializable inventory/copy/open/action methods. Actions re-scan before dispatch, require confirmation, route managed rows only through Job/Terminal owners, route external rows only through the identity-fenced single-PID terminator, and always return a fresh scan with observed portReleased state."
    conclusion: Ticket 07 behavior is implemented without adding process primitives to the model-facing port_list Tool or the Host RPC surface.
    next_action_rule: Run bundled build/no-emit checks, focused/full Bun tests, diff checks, and the permitted Stock DSH smoke before resolving Ticket 07.
  - id: ticket-07-verification
    action: Run Ticket 07 build, typecheck, focused/full tests, diff checks, and the Stock DSH smoke boundary.
    failure_class: environment
    raw_evidence: "Bundled TypeScript emit and no-emit checks pass; Bun suite passes 56/56 with one pre-existing Stock DSH smoke skipped because DSH_REPO is unset; git diff --check passes. npm run build cannot find tsc and npm run typecheck/npm test are blocked by the Volta shim failing to create C:\\Users\\admin\\AppData\\Local\\Volta."
    conclusion: Ticket 07 deterministic implementation and safety coverage pass. Real Stock DSH UI/Host lifecycle execution and final G1-G6 acceptance remain open integration evidence, not a deterministic Ticket 07 failure.
    next_action_rule: Hand off Ticket 07 and claim Ticket 08 final two-Session integration/release gate while retaining the native dependency and disposable-listener evidence gaps.
  - id: ticket-08-terminal-readiness-repair
    action: Add an exact-shape delayed Terminal PID compatibility repair and run the full Stock DSH 0.1.1-rc.1 release gate.
    failure_class: strategy
    raw_evidence: "Focused readiness and attribution tests pass; deterministic suite passes 59/59 with two native gates skipped. The real release gate recorded four verified origins, including spawnTerminal rootPid 19496, canonical creation identity, and terminalSessionId pty-1. The run then failed at an independent fixture lookup with Error: port_list tool is unavailable."
    conclusion: The original Windows pid-0 attribution blocker is mitigated without a DSH source patch: the compatibility layer repairs the original LocalTerminalHandle before DSH publishes the Terminal session. Ticket 08 remains open because the release fixture looks up port_list from the wrong Tool registry scope.
    next_action_rule: Inspect Stock DSH Tool registry scoping and make the release fixture exercise the registered model-facing Tool through the correct Agent context without bypassing the public Tool seam.
  - id: ticket-08-stock-service-publication
    action: Make port_list registration follow late Stock DSH tools service publication and make lifecycle capture fall back from throwing uninjected properties to public service lookup.
    failure_class: strategy
    raw_evidence: "Focused tests first failed for late Tool publication and Stock-style ctx.jobs/ctx.terminals getters, then passed after service publication observation and per-service guarded public lookup. The next native gate linked jobId ri-gate-background-1 and terminalSessionId pty-1 and completed both managed shutdowns."
    conclusion: Stock Cordis service publication/injection timing differs from isolated fixtures; registration and lifecycle discovery now use public service events/lookups without bypassing owner APIs.
    next_action_rule: Continue the native gate through the external single-PID branch and classify any remaining Win32 safety rejection independently from Terminal readiness.
  - id: ticket-08-native-action-fix
    action: Diagnose the native external action rejection exposed after both managed shutdowns passed.
    failure_class: implementation
    raw_evidence: "Gate diagnostics progressed from access-denied to current-user-unavailable. Read-only Koffi probes proved ProcessProtectionLevelInfo is enum value 7, ordinary processes report PROTECTION_LEVEL_NONE 0xFFFFFFFE, and GetCurrentProcess returns the valid -1 pseudo handle. Focused protection-level regression passed after correction."
    conclusion: Ticket 05 had two latent Win32 constant/handle semantic defects that deterministic adapter doubles did not expose; the native G6 path now revalidates and terminates only the selected same-user PID.
    next_action_rule: Re-run the complete Stock DSH release gate and then the authoritative emit/no-emit/full suite before resolving Ticket 08.
  - id: ticket-08-g1-g6-pass
    action: Run the final Stock DSH G1-G6 acceptance and complete authoritative verification.
    failure_class: none
    raw_evidence: "Stock DSH commit 528c682e / dsh-v0.1.1-rc.1 release gate exited 0 in 7998 ms: four verified origins, distinct Sessions, positive-PID Terminal owner, Job/Terminal managed shutdowns, external single-PID termination, selected ports released, foreground and external control listeners retained. TypeScript emit and no-emit checks exited 0; Node suite passed 70/70 with both native Stock DSH tests, 0 skipped, exit 0."
    conclusion: Ticket 08 and the Windows MVP acceptance surface are complete. ADR-0003 preserves the upstream readiness-fix track while the exact-version Bundle compatibility repair avoids a DSH source fork and fails closed on unknown shapes.
    next_action_rule: Keep the native Windows gate mandatory for each newly certified DSH/node-pty version; remove the private compatibility branch once upstream exposes correct readiness/PID semantics.
  - id: ticket-09-spec
    action: Update the accepted Spec, decisions, ADR, and issue tracker for the same-repository Web Client half.
    failure_class: none
    raw_evidence: "Main and scratch Specs now define dsh.client, exports[./client], sidebar.footer.action, shell.overlay, the serializable Host RPC seam, Browser safety states, and native Web smoke requirements; ADR-0004 and ready-for-agent Ticket 09 were added."
    conclusion: Web implementation may begin after inspecting the exact certified DSH Client module and Slot contracts; no runtime code has been changed by the spec update.
next_action_rule: Claim Ticket 09, verify the rc.8/rc.1 Browser loading seam, then implement the smallest Browser tracer-bullet before adding action controls.
  - id: ticket-09-implementation
    action: Implement the single-repository Browser Client Bundle, additive Slots, same-origin Host bridge, Runtime Inspector panel, and deterministic Browser/Host tests.
    failure_class: none
    raw_evidence: "Added src/client.ts and src/client/*, emitted lib/client.js through tsdown's DSH lazy-CJS loader format, declared exports[./client] and dsh.client, registered sidebar.footer.action and shell.overlay, wired /api/dsh-runtime-inspector to the serializable Host RPC, and added Browser/Host bridge, Slot, panel, manifest, and unload tests. Bundled TypeScript emit/no-emit checks pass; deterministic Node suite passes 80/80 with two pre-existing Stock DSH gates skipped; the existing Stock DSH Bundle load/dispose smoke passes with DSH_REPO set."
    conclusion: Ticket 09 deterministic implementation is in place and preserves the Host safety boundary. The real DSH Web artifact-loading/Slot/action smoke is still required before resolving the ticket; the attempted Ticket 08 native release gate was transiently blocked while waiting for the terminal listener, after the other managed origins were observed.
    next_action_rule: Run a real DSH Web smoke on both declared versions, then resolve Ticket 09 or record the exact compatibility gap.
  - id: ticket-09-web-smoke-rc1
    action: Run the real Stock DSH Web Browser-to-Host smoke against the available 0.1.1-rc.1 checkout.
    failure_class: none
    raw_evidence: "tests/dsh-web-smoke.test.mjs passed with DSH_REPO=D:\\project\\deepseek-harness and DSH_WEB_E2E=1: Chromium loaded the dsh-runtime-inspector boot graph entry and artifact, rendered the Sidebar entry and shell overlay, fetched the real inventory, confirmed an external single-PID action through the Browser UI, received a Host fresh scan with portReleased=true, observed the disposable listener exit, and got HTTP 200 from the unaffected DSH Web listener afterward."
    conclusion: The same-repository dual-face Bundle and real Browser-to-Host action path work on Stock DSH 0.1.1-rc.1. The smoke is opt-in so the ordinary deterministic suite remains hermetic.
    next_action_rule: Run the same smoke against a built dsh-0.1.0-rc.8 checkout before resolving Ticket 09; keep the ticket claimed until that compatibility evidence exists.
evidence_gaps:
  - DSH Web Client artifact loading and Slot registration for the declared 0.1.0-rc.8 version; the available checkout and built Web artifacts are 0.1.1-rc.1.
  - The pre-existing Ticket 08 native G1-G6 release gate still timed out waiting for terminal listener port 39104 on two attempts; the Web smoke itself passed.
blocked_reason: none
next_action: Build or provide Stock DSH 0.1.0-rc.8, then run DSH_WEB_E2E=1 against it; resolve Ticket 09 only after the rc.8 Web smoke passes.
