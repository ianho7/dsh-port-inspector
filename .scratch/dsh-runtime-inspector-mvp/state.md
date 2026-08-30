# Runtime Inspector MVP Loop State

status: mitigated
phase: verify
current_ticket: compose-03
current_hypothesis: The Windows Host and same-repository Browser UI MVP have passed the declared dsh-0.1.0-rc.8 and dsh-0.1.1-rc.1 acceptance surfaces.
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
  - id: ticket-09-ui-refresh
    action: Implement the accepted compact Runtime Inspector design in the Browser Client and align its Web smoke with the list/detail interaction model.
    failure_class: none
    raw_evidence: "Added namespaced semantic-token styling and inline SVG icons, replaced the basic panel with a compact summary, filterable listener list, structured detail view, Session/request/Call ID context, source/action separation, degraded/incomplete states, and identity-aware confirmation dialog. Sidebar count now reports only verified current-session listeners and shows — when unavailable. Bundled TypeScript emit/no-emit checks pass; deterministic Node suite passes 84/84 with three native Stock DSH gates skipped; real DSH Web smoke against 0.1.1-rc.1 passes and verifies copy, detail selection, external confirmation, fresh port release, and unaffected Web listener health. git diff --check passes."
    conclusion: The approved UI design is implemented without expanding the Browser RPC or Host process boundary. The remaining acceptance gap is only the declared 0.1.0-rc.8 Web compatibility run.
    next_action_rule: Run the same Web smoke against a built dsh-0.1.0-rc.8 checkout before resolving Ticket 09.
  - id: ticket-09-web-smoke-rc8
    action: Build an isolated Stock DSH 0.1.0-rc.8 checkout and run the same real Browser-to-Host smoke.
    failure_class: none
    raw_evidence: "Independent shared clone at commit 141eb6fef83422698aef7a981029e843e8161534 installed its pinned dependencies from the offline store and completed the full DSH build. tests/dsh-web-smoke.test.mjs then passed with DSH_REPO=D:\\project\\dsh-runtime-inspector\\.scratch\\deepseek-harness-rc8 and DSH_WEB_E2E=1: Chromium loaded the boot artifact, rendered the Sidebar entry and overlay, selected a listener detail, copied its redacted value, confirmed the identity-fenced external single-PID action, received a fresh scan with portReleased=true, observed the listener exit, and retained HTTP 200 from the unaffected DSH Web listener."
    conclusion: Browser artifact loading, Slot registration, inventory, and action paths work on both declared dsh-0.1.0-rc.8 and dsh-0.1.1-rc.1 baselines without modifying DSH source.
    next_action_rule: Keep the opt-in real Web smoke mandatory for every newly certified DSH Client version.
  - id: ticket-10-runtime-context-diagnosis
    action: Reproduce the always-degraded panel, raw FILETIME, missing project, and missing Session/Call/request context against the installed Stock DSH 0.1.1-rc.2 runtime.
    failure_class: implementation
    raw_evidence: "Focused tests first reproduced the reported state: the exact-version compatibility gate degraded every capability on rc.2; the Browser panel rendered the Host safety FILETIME directly; Host-only session lookup could not see the Browser current Session; project data was suppressed with degraded origins; and the UI incorrectly substituted a tool command for the user's request."
    conclusion: The symptoms shared two boundary defects rather than bad listener data: version had been used as a product-wide gate, and Browser-owned conversation context had never crossed the serializable Host bridge.
    next_action_rule: Replace the product-wide version gate with independent runtime capabilities, preserve exact-version gating only for the private delayed Terminal repair, and add a bounded current-Session presentation projection.
  - id: ticket-10-runtime-context-fix
    action: Implement capability-based compatibility, independent external actions, Browser current-Session projection, localized creation time, and project/Call/user-request presentation.
    failure_class: none
    raw_evidence: "Unknown/new DSH versions now enable public runtime capabilities by contract and produce no user-facing version notice. The Browser sends only its current Session id; the Host remains authoritative for attribution and actions, while the Client derives displayTitle and bounded redacted user text from the current conversation. Windows FILETIME remains canonical for PID identity but is converted only at the presentation boundary. DSH 0.1.1-rc.2 was added to the exact private Terminal-repair regression set after the native gate proved the repair is still required and its artifact shape matches the certified versions."
    conclusion: DSH listeners can show verified source, project, Session title, Call ID, and user request; external PowerShell listeners remain source-unconfirmed but may expose the independently safe single-PID action. Missing source capability no longer forces every row into read-only mode.
    next_action_rule: Run deterministic, native Windows G1-G6, and real Stock DSH Web gates, then retain version information only in developer diagnostics and regression records.
  - id: ticket-10-verification
    action: Run final type/build, deterministic, native lifecycle, and real Browser-to-Host verification for the complete repair.
    failure_class: none
    raw_evidence: "TypeScript no-emit and Host/Client builds pass. The deterministic Node suite reports 96 tests: 93 passed, 3 opt-in native/Web gates skipped, 0 failed. The native Stock DSH G1-G6 release gate passes on the actual CLI package, including delayed Terminal attribution and both managed/external actions. The installed Stock DSH 0.1.1-rc.2 Web smoke passes: Chromium loads the panel, verifies the DSH-origin listener and project/Call projection, and completes the external single-PID action while the DSH Web listener remains healthy."
    conclusion: Ticket 10 resolves all reported runtime and presentation defects without weakening PID identity fences or moving process authority into the Browser.
    next_action_rule: Keep public capability probes permissive across future versions, certify only private repair shapes, and run the native/Web gates before adding a new version to that private-repair set.
  - id: ticket-11-external-request-isolation
    action: Reproduce and fix current-Session user-request leakage into an unattributed PowerShell listener row.
    failure_class: implementation
    raw_evidence: "A focused Client context test reproduced the exact sequence deterministically: after indexing a current DSH Session request for port 4173, requestFor({}) for an external listener returned that request instead of undefined. The lookup treated a missing Session id as permission to use the current Session and then fell back to latestRequest when no Call/Turn identity existed."
    conclusion: User-request projection now requires an explicit Session id equal to the Browser-selected Session and an exact Call ID, root Call ID, or Turn mapping. Missing or mismatched attribution returns undefined, so the panel displays 未提供 rather than borrowing unrelated conversation text.
    next_action_rule: Keep conversation text fail-closed: never use latest-request fallback for a listener without explicit current-Session attribution.
  - id: ticket-11-verification
    action: Run the focused red-to-green loop, rebuild the Browser artifact, and run full deterministic verification.
    failure_class: none
    raw_evidence: "The focused regression changed from 3 pass/1 fail with actual 4173 request leakage to 4/4 pass. TypeScript emit/no-emit and Browser build pass. The full deterministic suite reports 97 tests: 94 passed, 3 opt-in native/Web gates skipped, 0 failed."
    conclusion: External listener Session, Call ID, and user-request presentation now agree: 未关联 DSH 会话, 未提供, 未提供.
    next_action_rule: Repack and restart the target DSH Profile before manual retest because Browser artifacts are loaded at Profile startup.
  - id: development-ports-implementation
    action: Implement the approved development-port presentation, local toolchain Logo pipeline, broad evidence-based toolchain classification, and Browser pin preferences.
    failure_class: none
    raw_evidence: "Added Host development presentation fields and deterministic classification for current-project, runtimes, frameworks, data services, containers, mobile tools and local AI; added default collapsed other listeners, global search, all-listeners scope, local official Logo data, bounded Logo updater, list/detail Logo rendering, calm selection, and versioned Browser-only pinning. Ticket 01-06 resolved with focused tests and documentation."
    conclusion: Development relevance remains orthogonal to Process origin, Lifecycle owner and action kind. Browser receives only serializable presentation data and never gains process inspection or termination authority.
    next_action_rule: Complete real Web acceptance and record any independent native lifecycle environment gap without changing safety policy.
  - id: development-ports-verification
    action: Run the final build, typecheck, deterministic suite, Bundle smoke, and real Browser-to-Host Web smoke.
    failure_class: none
    raw_evidence: "TypeScript emit/no-emit and Client build pass. The final deterministic Node suite reports 112 tests: 109 passed, 3 opt-in native/Web gates skipped, 0 failed. Bundle lifecycle smoke passes. Real Stock DSH Web smoke passes at 1280x720 and verifies collapsed-other search, pin persistence across reload, unpin, local list/detail Logo equality, selected styling, external fresh scan and unaffected Web health."
    conclusion: The development-port feature is shipped in the same dual-face Bundle and the real Browser path works on the available Stock DSH checkout.
    next_action_rule: Preserve the standalone G1-G6 lifecycle gate as a release requirement for future runtime/lifecycle changes.
  - id: development-ports-native-gate
    action: Run the independent Stock DSH G1-G6 release gate after the development-port changes.
    failure_class: environment
    raw_evidence: "Bundle smoke passes. The G1-G6 release gate was attempted twice; each run observed valid foreground/background origins and a positive Terminal PID, but timed out waiting for fixture port 39104 to appear as listening. No lifecycle/action source changed in this feature."
    conclusion: The feature's Web and deterministic acceptance is complete; the native fixture readiness gap remains open and must not be solved by weakening Terminal attribution or action safety.
    next_action_rule: Re-run the unchanged G1-G6 fixture when the Stock DSH Terminal listener readiness environment is healthy.
  - id: compose-project-association-implementation
    action: Implement generic nested Compose discovery, Docker Compose runtime correlation, Host-owned workspace lookup, current-project presentation, and Browser evidence/logo projection.
    failure_class: none
    raw_evidence: "The feature commit adds a bounded Host-only Compose reader and serializable UI projection. Focused Compose/Host tests cover malformed and unknown publisher shapes, custom project-name recovery, bounded discovery, local-versus-remote Docker context gating, unknown-image fallback, and explicit Session workspace isolation. Host uses currentWorkspace(sessionId); Browser currentProject remains presentation-only."
    conclusion: Compose-associated Docker Desktop proxy listeners can be displayed as current-project infrastructure while retaining startup-unconfirmed and read-only semantics; product logos and a Docker Compose context badge are independent visual evidence.
    next_action_rule: Complete the real Docker Desktop acceptance ticket with four live ports, image/container evidence, restart/manual recovery, conservative custom-project behavior, and post-down release proof.
  - id: compose-project-association-verification
    action: Run type/build, full deterministic tests, package-boundary checks, and a real Docker Desktop Compose probe.
    failure_class: none
    raw_evidence: "Bundled TypeScript emit/no-emit and Compose/Host focused tests pass. Full Node suite reports 144 tests: 141 passed, 3 opt-in native/Web gates skipped, 0 failed; the design-preview CSS segment is synchronized with the production stylesheet. With Docker Desktop Engine 29.2.1 running outside the sandbox, the default Host inventory probe returned status=available and precisely joined 5432 to postgres:17-alpine/container b92f907a7071 and 6379 to redis:7-alpine/container 97a15da51a24 from the Demo compose.yaml. Both Windows listeners are owned by com.docker.backend.exe and remain unattributed/read-only. The infrastructure script correctly refused to duplicate already-running ports."
    conclusion: The safe local implementation, Compose-evidence search projection, graceful Docker-unavailable degradation, and real Docker Desktop service/image/container/port correlation are verified; DSH Web screenshots, restart/manual recovery, and post-down release proof remain open.
    next_action_rule: Complete the remaining real DSH Web and cleanup acceptance without changing the attribution or read-only boundary.
  - id: compose-project-association-search-bounds
    action: Close the Host Compose evidence search gap and enforce hard reader resource ceilings.
    failure_class: none
    raw_evidence: "Host search now includes Compose relative file, service, image, container, project and port evidence; reader option seams are clamped to the declared candidate, depth and output limits. Focused Compose/Host/Web tests pass 27/27, and the complete deterministic suite passes 141/141 with 3 opt-in gates skipped."
    conclusion: Compose rows remain discoverable by their runtime evidence without allowing injected options to bypass the Host probe bounds.
    next_action_rule: Keep real Docker Desktop acceptance separate from deterministic evidence; do not infer live container ownership while the engine is unavailable.
  - id: compose-project-association-web-smoke
    action: Run the existing real Stock DSH Browser-to-Host smoke after the Compose implementation.
    failure_class: environment
    raw_evidence: "With DSH_REPO=D:\\project\\deepseek-harness and DSH_WEB_E2E=1, tests/dsh-web-smoke.test.mjs timed out after 30 seconds waiting for the Stock DSH /dsh web announcement; the child produced no stdout or stderr. No Compose assertion ran and no source failure was observed."
    conclusion: This attempt does not provide new Web UI evidence; previously recorded rc.1/rc.2 Web smoke results remain valid, while a fresh run must wait for the Stock DSH fixture startup environment.
    next_action_rule: Retry the unchanged Web smoke when the Stock DSH server can publish its endpoint; do not weaken Compose or attribution boundaries to accommodate a fixture timeout.
  - id: verified-launch-chain-implementation
    action: Implement the identity-bound Windows process command-line reader and verified root-to-listener launch-chain projection.
    failure_class: none
    raw_evidence: "Added fixed PowerShell/CIM Win32_Process projection with numeric PID stdin, 64-PID/2-second/256 KiB bounds, immediate redaction and 1,024-character public command bound, PID/parent/creation-time revalidation, and injectable deterministic seams. Host inventory now exposes optional launchChain only for verified Process origins; Browser detail renders root/intermediate/listener nodes without changing search, copy, action state, lifecycle ownership, or Compose boundaries. TypeScript emit/no-emit, Client build, and the full deterministic Node suite pass 154/154 with 3 existing opt-in gates skipped."
    conclusion: "The MVP implementation uses one Windows OS fact path for Go, Vite, other runtimes, and unknown custom executables; no manifest, environment, port heuristic, or ecosystem-specific resolver was added."
    next_action_rule: "Run the real Stock DSH launch-chain acceptance on Windows with Go, Vite, and one third-ecosystem/custom listener; if the environment blocks it, record the exact blocker without weakening the fail-closed chain."
  - id: package-sourcemap-cleanup-implementation
    action: Remove source maps and stale build chunks from the distributable package, and reduce the Browser artifact's inlined branding asset.
    failure_class: none
    raw_evidence: "The shared lib/ output is now cleaned before Host and Browser builds; TypeScript sourceMap/declarationMap and tsdown sourcemap are disabled; package files are restricted to JavaScript and declaration files; the 256px WebP runtime Logo replaced the 1,254px PNG candidate. Build and no-emit typecheck pass, the deterministic Node suite reports 157 tests with 154 passed, 3 opt-in gates skipped, and the packed tarball is 227,729 bytes with 67 entries, 0 .map entries, and 0 stale index-* chunks."
    conclusion: "The reinstall and release package paths no longer ship source maps, stale hash chunks, or the 1.9 MB design-candidate Logo; Host/Browser runtime contracts remain unchanged."
    next_action_rule: "Re-run the actual Profile reinstall after committing or otherwise preserving these packaging changes, then restart the target DSH Web Profile before manual UI verification."
  - id: runtime-inspector-notice-optimization
    action: Replace untyped global feedback with source-scoped, severity-aware inventory and operation notices, and remove redundant Compose/source/scan banners.
    failure_class: none
    raw_evidence: "Added pure notice mappings and Browser placement tests for inventory, copy, open-directory and action outcomes; warnings/errors no longer use success styling, operation transport failures keep their own wording, technical details are folded and bounded to 1,024 characters, and action feedback detaches when its target disappears. Build and strict no-emit typecheck pass. The deterministic Node suite reports 162 tests: 159 passed, 3 opt-in gates skipped, 0 failed. The real Stock DSH Web smoke passes on checkout cd5ef81481 after updating the fixture for the current authenticated launch URL, combo plugin URL, asynchronous onboarding seam and typed notice DOM contract; Chromium verifies bilingual UI, copy success, external action release, detached action feedback and unaffected Web health. git diff --check passes."
    conclusion: "Compose unavailability is silent in the Browser, source-tracking and scan limitations remain only as Header pills plus row-level explanations, and truncation/stale-refresh notices remain global because they describe missing current inventory data. No Host RPC, scanner, attribution or action-safety behavior changed."
    next_action_rule: "Keep notice outcome mapping pure and exhaustive; require the deterministic suite plus the authenticated Stock DSH Web smoke for future Browser feedback changes."
  - id: runtime-inspector-notice-auto-dismiss
    action: Add bounded automatic dismissal for lightweight successful copy and directory confirmations while retaining durable action and problem feedback.
    failure_class: none
    raw_evidence: "The new noticeAutoDismissMs policy returns 4,000 ms only for success notices sourced from copy or open-directory; action success, warnings, errors and inventory notices remain persistent. The timer is cancellable and clears only when the exact notice is still current, preventing stale async results from removing newer feedback. Regression coverage passes; full npm test reports 163 tests with 160 passed, 3 opt-in gates skipped, 0 failed; build, strict no-emit typecheck, Stock DSH Web smoke and git diff --check pass."
    conclusion: "Lightweight confirmations no longer accumulate in the panel, while users retain enough time to read high-impact port/action outcomes and all failure states remain available until an explicit lifecycle event."
    next_action_rule: "If notice timing changes again, preserve source/tone-based policy and test cancellation plus stale-notice identity before adjusting the delay."
  - id: runtime-inspector-panel-warm-snapshot
    action: Remove the avoidable first-open loading surface by reusing the Sidebar inventory result in the Panel while revalidating in the background.
    failure_class: none
    raw_evidence: "Diagnosis proved the Sidebar already paid for a complete Host inventory but retained only the derived count, leaving the first Panel render without a snapshot. The shared Browser state now retains the bounded serializable inventory, keyed by Session ID plus cwd; PanelState also records snapshotContextKey so a different Session/project can never reuse the prior presentation projection. Focused warm-start and notice tests pass 24/24. Full npm test reports 164 tests with 161 passed, 3 opt-in gates skipped, 0 failed; build, strict no-emit typecheck and git diff --check pass. Real Stock DSH Web smoke passes and asserts that a known Sidebar count yields zero full-loading states on first Panel open while the background refresh continues."
    conclusion: "When the Sidebar shows a numeric listener count, opening Runtime Inspector renders the matching list or empty state immediately and shows only the non-blocking refresh status. A genuinely cold page or changed context still uses the truthful full loading state until its first inventory succeeds."
    next_action_rule: "Keep warm inventory Browser-memory-only, bounded by the Host DTO and exact presentation context; never reuse a snapshot across Session ID or cwd changes."
evidence_gaps:
  - "G1-G6 release fixture: Terminal origin is observed with a valid PID, but port 39104 never reaches LISTENING in two consecutive runs."
  - "Compose ticket 03: live Docker Desktop association is now verified by Host inventory, but DSH Web screenshots, DSH restart/manual recovery, non-standard project-name real acceptance, and post-down port-release proof are not yet accepted."
  - "Verified launch-chain real Stock DSH/Browser screenshots and cross-ecosystem live acceptance are not yet captured."
  - "The attempted Stock DSH Bundle smoke was blocked by a temporary Profile missing host plugin packages; this is an environment gate, not product evidence."
blocked_reason: "Independent Stock DSH Terminal fixture readiness and remaining real DSH Web/cleanup evidence are external acceptance gates; no safe product change can infer listeners or container ownership that the OS/runtime did not expose."
next_action: "Complete Compose ticket 03's remaining real DSH Web and cleanup acceptance plus Verified launch-chain Stock DSH/Browser acceptance; retain deterministic and Web smoke gates as mandatory."
