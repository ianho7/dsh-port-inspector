# DSH Runtime Inspector Windows MVP：Implementation Spec

> 状态：Ready for implementation
> 日期：2026-08-21
> 兼容基线：Stock DSH `dsh-0.1.0-rc.8`、Windows local execution world
> 来源：[MVP 文档](./dsh-runtime-inspector-mvp.md)、[决策记录](./dsh-runtime-inspector-mvp-decisions.md)、[ADR-0001](./adr/0001-stock-dsh-root-pid-observation.md)、[ADR-0002](./adr/0002-process-termination-policy.md)

## Problem Statement

Coding Agent 经常启动 Vite、Next.js、Node API 等开发服务。Windows 上同名进程可能同时存在，用户能够看到端口被占用，却无法可靠回答：

- 哪个进程正在监听端口；
- 它是否由 DSH 当前运行周期启动；
- 它来自哪个 Session、Turn、Step、Call ID 和 Tool；
- 它属于哪个项目目录；
- 应通过 DSH 的 Job/Terminal lifecycle 关闭，还是作为外部进程处理。

真正的技术风险是 `Tool Call → root PID → Windows process ancestry → listening PID` 的可靠连接。仅凭命令行、目录、启动时间或端口号会在并发调用和 PID reuse 场景中产生错误归因。

## Solution

Runtime Inspector 作为可安装的 DSH Bundle 运行于未经修改的官方 DSH。用户安装后重启一次目标 Profile，插件在固定兼容版本中优先使用 Cordis `internal/get` waterfall：每次 `ctx.subprocess` service lookup 时返回一个 non-mutating Subprocess observer Proxy，仅包装 `spawn` 和 `spawnTerminal`。对 stock DSH 中绕过该 waterfall 的同一 `LocalSubprocessRuntime` service read，插件再安装可逆的 method-level fallback；它不替换 provider、不取得 process ownership，并只在已验证的本地执行世界启用。

归因数据流如下：

1. Session events 在 Tool dispatch 前缓存 `tool/call` 的 Session、Turn、Step、root Call ID 和原始参数。
2. `tools/execute` wrapper 为每个 ToolExecution 建立 AsyncLocalStorage frame，保存 Session/Agent、Call ID、root Call ID、Tool name、command 和最终工作目录。
3. Subprocess observer Proxy 调用原 provider 方法并保留原 handle identity。取得有效 PID 后，在当前 ALS frame 下登记 Process origin，并立即读取 Windows process creation identity。
4. `run_in_background` 的新增 Job 通过 `ctx.jobs.onJobsChanged`、同一 ALS frame 和新增 Job ID diff 关联；`tools/result.jobId` 用作交叉校验。Terminal 从 spawn spec 的 `DSH_PTY_SESSION_ID` 关联 Terminal session。
5. Windows scanner 获取 TCP listeners、PID、ParentProcessId、creation time、executable 和最佳可用项目目录。沿父子进程链向上匹配 root PID 与 creation identity。
6. 完整身份和 ancestry 匹配为 `verified`；非唯一线索为 `inferred`；证据不足为 `unattributed`。
7. DSH managed target 优先通过 Job/Terminal lifecycle 关闭；外部同用户 target 只在重新身份复核和用户确认后直接结束选中的单个 PID。

方案只保证当前 DSH 运行周期内、Windows local execution world 的 verified attribution。Persistent PowerShell 的首次 Terminal 创建可精确归因；同一个 persistent terminal 后续命令创建的 descendant 不承诺精确到后续 Call ID。

## User Stories

1. As a Coding Agent developer, I want to see all current TCP listening ports, so that I can identify development-server conflicts without opening a separate Windows tool.
2. As a Coding Agent developer, I want each listener to show PID, executable, address, port, and creation time, so that I can distinguish two same-named processes.
3. As a developer with multiple projects, I want a listener’s best available project directory, so that I can identify which workspace owns the service.
4. As a DSH user, I want a listener to show whether it was started by DSH, so that I can distinguish managed runtime state from unrelated system state.
5. As a DSH user, I want verified attribution to show Session, Turn, Step, Call ID, Tool name, command, and workdir, so that I can trace a port back to the exact Agent action.
6. As a DSH user, I want verified attribution to require PID and creation-time identity matching, so that a reused Windows PID is never presented as the original process.
7. As a DSH user, I want a listener’s confidence to be visibly marked as verified, inferred, or unattributed, so that I can judge how much trust to place in the origin.
8. As a DSH user, I want inferred attribution to show its supporting clues, so that I can use it as a lead without confusing it with proof.
9. As a DSH user, I want inferred attribution to remain ineligible for managed-owner termination, so that a heuristic never gains the authority of a verified lifecycle link.
10. As a user running two DSH Sessions, I want same-named services to remain separately attributable, so that concurrent sessions do not collapse into one origin.
11. As a user running Code Mode, I want an inner PowerShell call to retain both its own Call ID and its root Call ID, so that nested execution is traceable to the correct Turn and Step.
12. As a user running a background PowerShell task, I want the root PID to be linked to its Job ID after the Job is registered, so that I can close the managed Job through DSH.
13. As a user running a persistent PowerShell terminal, I want its first terminal creation to be attributable, so that I know which Call created the long-lived shell.
14. As a user running later commands in a persistent terminal, I want the UI to state that command-level attribution is not verified, so that the product does not claim a false Call relationship.
15. As a DSH user, I want a managed listener to identify its Job or Terminal lifecycle owner, so that shutdown uses DSH’s ownership and cleanup semantics.
16. As a DSH user, I want managed shutdown to wait for process-tree quiescence, so that the UI does not report success while a child still owns the port.
17. As a DSH user, I want managed shutdown failure to be reported without automatic PID escalation, so that a failed lifecycle operation does not silently become a broader kill.
18. As a developer who started an external same-user service, I want to terminate one explicitly selected listener after identity revalidation, so that I can resolve a port conflict without terminating its whole process tree.
19. As a developer, I want external termination to recheck PID, creation time, and executable immediately before the action, so that PID reuse cannot cause an accidental termination.
20. As a developer, I want protected, other-user, system, or access-denied processes to remain read-only, so that the tool does not require administrator privileges or cross security boundaries.
21. As a DSH user, I want the plugin to avoid automatic UAC elevation, so that installing Runtime Inspector does not change the privilege level of DSH.
22. As a DSH user, I want termination to trigger a fresh scan and report whether the port was released, so that I can verify the result instead of trusting a request acknowledgment.
23. As a DSH user, I want the UI to search and sort by port, application, PID, project, and Session, so that large listener lists remain usable.
24. As a DSH user, I want to open a known project directory and copy a listener’s redacted details, so that common investigation actions are quick and low risk.
25. As an Agent, I want a read-only `port_list` Tool, so that I can diagnose a port conflict without being able to terminate a process.
26. As an Agent, I want `port_list` to expose full redacted attribution for my current Session, so that I can reason about my own work.
27. As an Agent, I want `port_list` to disclose only that another DSH Session owns a conflicting port, so that another Session’s command and Call history are not exposed.
28. As a DSH user, I want command and argv data to be redacted and bounded before UI, RPC, logs, or Tool output, so that tokens and passwords are not echoed by the inspector.
29. As a DSH user, I want Process origins to remain available after a root PowerShell exits while its descendant still listens, so that ancestry attribution is not lost prematurely.
30. As a DSH user, I want origins to be memory-only and cleared on DSH restart, so that the MVP does not create a cross-restart process history.
31. As a DSH user, I want the plugin to run in a clearly labeled read-only degraded mode when compatibility checks fail, so that I still receive port visibility without false attribution or termination controls.
32. As a DSH user, I want installation, update, and removal to use the normal DSH Bundle lifecycle, so that I do not need to edit DSH source or maintain a private fork.
33. As a DSH user, I want one restart after Bundle installation to activate the plugin, so that installation behavior follows the official DSH composition model.
34. As a DSH user, I want unloading Runtime Inspector not to terminate existing user processes, so that observation lifecycle is independent from process ownership.
35. As a DSH maintainer, I want the plugin to declare one tested DSH compatibility baseline, so that changes to Cordis internal behavior fail closed instead of silently corrupting attribution.
36. As a DSH maintainer, I want future upstream `subprocess/started` support to remain possible, so that the MVP’s internal observer can later migrate to a public provider-neutral lifecycle seam.

## Implementation Decisions

- The MVP is a Windows-only Bundle targeting the stock DSH `dsh-0.1.0-rc.8` and the Windows local execution world. Unknown versions must be rejected for verified mode and placed in read-only degraded mode.
- The highest existing seam is the Cordis `internal/get` waterfall. The observer must call the built-in `next()` first, create a Proxy around the returned subprocess service, and never call `ctx.subprocess` again from inside that Proxy.
- The pinned stock path can expose the provider before `internal/get` is reached. In that case the plugin may wrap only the actual `LocalSubprocessRuntime` `spawn`/`spawnTerminal` descriptors as a reversible fallback, using exact compare-and-swap disposal and the same active fence. This is observation, not provider replacement or ownership; both seams must deduplicate by exact handle identity.
- The Proxy wraps only `spawn` and `spawnTerminal`. It binds the original methods to the original service, preserves synchronous errors and returned handle identity, and does not alter argv, cwd, environment, stdio, timeout, cancellation, termination, or ownership behavior.
- A plugin-wide active fence is cleared before observer disposal. A previously returned Proxy remains a pass-through after disposal; a fresh lookup returns the original service once the listener is removed.
- The observer ignores invalid or unavailable PID values. PID `-1`, missing PID, delayed remote PID, failed spawn, and failed Windows identity reads cannot produce verified attribution.
- Tool attribution uses an AsyncLocalStorage frame installed around the `tools/execute` waterfall. The frame contains Session/Agent identity, Call ID, root Call ID, Turn, Step, Tool name, command, and final workdir. It is read at spawn time, not frozen at service lookup time.
- Session `tool/call` events are cached before dispatch to resolve Turn and Step. Code Mode inner calls retain their own Call ID and root Call ID; the outer Call event is the Turn/Step lookup key.
- Process origin is one-to-many: one Tool Call may create multiple root processes. Ticket 02 stores root PID, the lossless process creation-time identity, Session/Turn/Step/Call/root Call, Tool, redacted command, final workdir, and observation time. It intentionally does not retain raw argv; later Job/Terminal lifecycle work may add bounded redacted metadata and owner identity without changing the root-PID source.
- Process origins are memory-only for the current DSH run. Root exit does not immediately evict an origin. A high-water record limit is required; eviction must not make a live listener appear verified under another PID because matching always includes creation identity.
- Job association uses `jobs.onJobsChanged` and a per-owner newly observed Job ID diff in the same ALS execution context. The returned structured Job ID is a cross-check, not the root PID source. Job termination uses owner-fenced `jobs.kill` followed by bounded `jobs.wait`.
- Terminal association reads the stock terminal session identity carried into the terminal spawn specification and cross-checks the public terminal snapshot. Terminal termination uses exact-Agent-fenced `terminals.kill` and waits for backend quiescence.
- Persistent PowerShell root creation is supported only for the first terminal-creation Call. Later commands sent through the existing terminal are displayed without verified command-level Call attribution.
- Windows process identity is PID plus creation time; the canonical in-memory creation-time representation is an unsigned decimal FILETIME string (never a JavaScript number). Scanner adapters must normalize native `high:low` forms into this representation before comparison. Executable is added to the pre-termination fence. ParentProcessId ancestry is cycle-safe and must degrade when an ancestor is unreadable, exited, escaped, or otherwise unverified.
- Ticket 03 listener discovery uses a bounded `netstat.exe -ano -p tcp` snapshot and a lazy Toolhelp32 process-table adapter. Native boundaries are injectable for tests; listener visibility can remain available when process metadata is denied, but such rows are never verified or actionable.
- Verified ancestry requires one unambiguous captured root, exact root creation identity, a readable creation identity for every traversed process, and a cycle-free ParentProcessId path. Missing identities may produce `inferred` only when the candidate root PID is unique; PID reuse, ambiguous roots, cycles, and escaped chains remain `unattributed`.
- Attribution states are `verified`, `inferred`, and `unattributed`. Inferred records may show candidate Session/Call and evidence, but cannot obtain managed-owner authority or verified wording.
- DSH-managed targets are closed through Job/Terminal APIs. A managed shutdown timeout or failure returns a failure result and never automatically falls back to PID or process-tree termination.
- External termination is limited to one explicitly selected same-user PID after a fresh PID/creation-time/executable check. It does not recursively terminate an external process tree, does not auto-elevate, and is unavailable for protected, other-user, or incomplete-identity targets.
- `port_list` is read-only. It shows all visible listeners, full redacted attribution for the current Session, and only a coarse “another DSH Session” owner indicator for other Sessions.
- The model-facing `port_list` Tool has no arguments and is registered through the injected DSH Tool registry. Its canonical result is marked `readOnly: true`, carries listener-scan completeness and truncation state, and is bounded to 128 listener rows. The Tool result contains no origin id, shutdown callback, or termination callback; unregistering the Bundle removes the Tool.
- `port_list` projects attribution only after scanner matching: a current-Session origin may include bounded Session/Agent/Turn/Step/Call/root Call/Tool, redacted command, redacted workdir, and a verified lifecycle owner; an origin from another Session becomes only `ownership: another-dsh-session` with no Session, Call, command, workdir, project, or owner id. Degraded mode passes no origins to the projection and remains visible/read-only.
- All commands, argv, executable paths, and project paths crossing UI, RPC, logs, or Tool output go through a redaction and length-boundary layer. Environment variables are not collected.
- UI and Host RPC expose current listeners, attribution confidence, lifecycle owner, redacted command, project, and safe action state. The UI must distinguish managed shutdown from direct external termination and from read-only/degraded states.
- The plugin Bundle uses the normal DSH installation model. Installation, update, or removal becomes active after a target Profile restart; no DSH source modification, private fork, or manual composition edit is required.
- A future public `subprocess/started` upstream event remains a follow-up architecture improvement. It is not part of this MVP’s runtime dependency.

## Testing Decisions

Tests must assert observable behavior and safety outcomes, not the fact that a particular private helper or Proxy implementation was used. The central test oracle is the resulting Process origin, lifecycle owner, confidence state, and termination behavior.

The implementation must include:

- Compatibility and health tests: the supported DSH baseline activates verified mode; an unknown version or failed observer contract check activates read-only degraded mode.
- Subprocess observer tests: process and terminal lookup returns the original service behavior and handle identity; invalid PID does not create an origin; observer exceptions do not alter spawn success; dispose turns cached proxies into pass-through; no provider teardown is triggered.
- Tool attribution tests: foreground native PowerShell, background PowerShell, Code Mode inner PowerShell, concurrent Agents, nested execution, cancellation, and thrown Tool bodies preserve the correct ALS frame and root Call mapping.
- Job association tests: a root spawned before Job ID allocation is linked to the one newly published Job ID through the synchronous jobs-changed callback; a failed `spec.run()` creates no managed link; structured Job result is used only as cross-check.
- Terminal association tests: terminal PID and session identity are linked at spawn; persistent terminal first creation is attributed; subsequent sends do not claim command-level verified attribution.
- Windows identity tests: PID reuse, creation-time mismatch, unreadable parent, parent-cycle, exited root, and escaped daemon paths degrade instead of becoming verified.
- Ancestry tests: a PowerShell → npm → Node listener is verified; same-named unrelated Node listeners remain separate; multiple roots from one Call are represented one-to-many.
- Termination tests: managed Job uses kill then wait; Terminal uses owner-fenced kill; managed failure never auto-escalates; external termination rechecks identity and affects only the selected PID; access denied and protected processes remain read-only; post-action scan reports release state.
- Privacy tests: command/argv redaction and size bounds apply consistently to UI, RPC, logs, and `port_list`; other Session details are coarse in Tool output while UI retains intended visibility.
- `port_list` tests: current-Session full attribution, other-Session coarse ownership, inferred-owner suppression, secret/path redaction, incomplete-scan reporting, row/output bounds, degraded-mode read-only behavior, and reversible Tool registration without termination capability.
- Lifecycle tests: roots and descendants remain attributable after a Turn ends; origins survive root exit while a descendant listens; DSH restart clears origins; plugin unload removes observers without terminating an existing background process.
- End-to-end acceptance: two Sessions start same-named services, a background service is associated with a Job, a terminal service is associated with a Terminal, one external listener remains unattributed, one verified target is closed, and a rescan proves the selected port changed without affecting the other service.

Prior art to follow includes DSH Agent initiator AsyncLocalStorage isolation tests, subprocess-local process-tree and identity-fencing tests, jobs-local start/notification tests, terminal ownership and teardown tests, Cordis waterfall and listener lifecycle tests, and existing Windows Toolhelp32/GetProcessTimes inspector coverage.

## Out of Scope

- Modifying DSH core or requiring a `subprocess/started` upstream event for MVP operation.
- Replacing or subclassing the PowerShell or subprocess provider as the production implementation; the narrowly scoped reversible method fallback is the only exception and is limited to the pinned local provider.
- Cross-version verified attribution beyond the declared DSH baseline.
- E2B or other remote execution worlds where a real PID is delayed or not observable from the Windows host.
- Exact Call-level attribution for descendants created by later commands sent through an existing persistent PowerShell terminal.
- Cross-DSH-restart origin history or durable process-origin persistence.
- UDP listeners, macOS, Linux, full general-purpose task-manager features, history statistics, automatic cleanup, and orphan-process policy.
- Bulk termination, a second force/escalation action, automatic UAC elevation, or termination of external process trees.
- Direct termination from the model-facing `port_list` Tool.
- Reading arbitrary process environment blocks, secrets, or full command lines without redaction.
- Reworking DSH’s public subprocess abstraction or implementing the future provider-neutral lifecycle event.

## Further Notes

The first implementation slice should be a tracer-bullet integration that activates the observer on the supported stock DSH, runs one native foreground PowerShell and one `run_in_background` call, records root PID and Process origin, links the Job, and proves observer unload leaves the process alive. This is an implementation acceptance test, not a separate prototype.

The repository uses a local Markdown issue tracker under `.scratch/`, with the canonical triage mappings documented in `docs/agents/triage-labels.md`. The source Spec is copied to `.scratch/<feature-slug>/spec.md`; `/to-tickets` publishes its implementation tickets as separate files under `.scratch/<feature-slug>/issues/` without changing the accepted decisions.
