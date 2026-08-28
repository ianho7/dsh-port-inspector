# DSH Runtime Inspector Windows MVP：Implementation Spec

> 状态：Implemented and accepted（Windows MVP）
> 日期：2026-08-23
> 回归基线：Stock DSH `dsh-0.1.0-rc.8`、`dsh-0.1.1-rc.1`、`dsh-0.1.1-rc.2`；其他版本按 Windows local runtime capability probe 启用
> 来源：[MVP 文档](./dsh-runtime-inspector-mvp.md)、[决策记录](./dsh-runtime-inspector-mvp-decisions.md)、[ADR-0001](./adr/0001-stock-dsh-root-pid-observation.md)、[ADR-0002](./adr/0002-process-termination-policy.md)、[ADR-0003](./adr/0003-delayed-terminal-pid-compatibility.md)、[ADR-0004](./adr/0004-web-client-dual-face-bundle.md)、[ADR-0005](./adr/0005-capability-based-dsh-compatibility.md)、[ADR-0007](./adr/0007-verified-launch-chain.md)

## Problem Statement

Coding Agent 经常启动 Vite、Next.js、Node API 等开发服务。Windows 上同名进程可能同时存在，用户能够看到端口被占用，却无法可靠回答：

- 哪个进程正在监听端口；
- 它是否由 DSH 当前运行周期启动；
- 它来自哪个 Session、Turn、Step、Call ID 和 Tool；
- 它属于哪个项目目录；
- 应通过 DSH 的 Job/Terminal lifecycle 关闭，还是作为外部进程处理。

真正的技术风险是 `Tool Call → root PID → Windows process ancestry → listening PID` 的可靠连接。仅凭命令行、目录、启动时间或端口号会在并发调用和 PID reuse 场景中产生错误归因。

## Solution

Runtime Inspector 作为可安装的 DSH Bundle 运行于未经修改的官方 DSH。用户安装后重启一次目标 Profile，插件通过运行时 contract probe 检查 Windows local provider、`spawn`/`spawnTerminal` 和 observer seam；版本号只进入内部诊断，不作为总开关，也不产生用户提示。能力存在时优先使用 Cordis `internal/get` waterfall：每次 `ctx.subprocess` service lookup 时返回一个 non-mutating Subprocess observer Proxy，仅包装 `spawn` 和 `spawnTerminal`。对 stock DSH 中绕过该 waterfall 的同一 `LocalSubprocessRuntime` service read，插件再安装可逆的 method-level fallback；它不替换 provider、不取得 process ownership。

依赖公开可探测 contract 的能力允许在未知版本正常工作；只有 delayed Terminal PID 私有 shape 修复继续按精确回归版本启用。单项能力失败只关闭依赖它的路径：来源追踪不可用不等于外部单 PID 处理不可用，后者仍由 Windows 身份、权限和保护级别的执行时复核独立决定。

归因数据流如下：

1. Session events 在 Tool dispatch 前缓存 `tool/call` 的 Session、Turn、Step、root Call ID 和原始参数。
2. `tools/execute` wrapper 为每个 ToolExecution 建立 AsyncLocalStorage frame，保存 Session/Agent、Call ID、root Call ID、Tool name、command 和最终工作目录。
3. Subprocess observer Proxy 调用原 provider 方法并保留原 handle identity。对于已认证版本中初始 PID 为 `0` 的已知 `LocalTerminalHandle`，先有限等待 private PTY readiness 并修复 handle 中过早缓存的 PID/root identity；取得有效 PID 后，在当前 ALS frame 下登记 Process origin，并立即读取 Windows process creation identity。
4. `run_in_background` 的新增 Job 通过 `ctx.jobs.onJobsChanged`、同一 ALS frame 和新增 Job ID diff 关联；`tools/result.jobId` 用作交叉校验。Terminal 从 spawn spec 的 `DSH_PTY_SESSION_ID` 关联 Terminal session。
5. Windows scanner 获取 TCP listeners、PID、ParentProcessId、creation time、executable 和最佳可用项目目录。沿父子进程链向上匹配 root PID 与 creation identity。
6. 完整身份和 ancestry 匹配为 `verified`；非唯一线索为 `inferred`；证据不足为 `unattributed`。
7. DSH managed target 优先通过 Job/Terminal lifecycle 关闭；外部同用户 target 只在重新身份复核和用户确认后直接结束选中的单个 PID。

对于 `verified` listener，Host 还会按 [ADR-0007](./adr/0007-verified-launch-chain.md) 对已验证 ancestry 中的存活 PID 做一次有界的固定 PowerShell/CIM 读取，并在查询后再次校验 PID、parent PID 和 creation time。公开 DTO 可附带脱敏的 root-to-listener `launchChain`，帮助用户看到 launcher、运行时和最终 listener；读取失败只省略该附加证据，不改变来源状态、生命周期权限或 Compose 关联。该机制不读取 manifest、环境变量、端口约定，也不为新框架维护专用解析器。

方案只保证当前 DSH 运行周期内、Windows local execution world 的 verified attribution。Persistent PowerShell 的首次 Terminal 创建可精确归因；同一个 persistent terminal 后续命令创建的 descendant 不承诺精确到后续 Call ID。

Runtime Inspector 的 Web UI 与 Host 运行时属于同一个 DSH Bundle 和同一个源码仓库。Bundle 同时提供 Node Host 半与 Browser Client 半：Host 继续拥有扫描、归因、生命周期和终止安全边界；Browser 只渲染可信的序列化 Host RPC 结果。Web UI 不启动独立 HTTP 服务，也不直接访问 scanner、Process origin registry、Job/Terminal API 或 Windows process primitive。

Web 入口使用全局 `sidebar.footer.action`，显示端口监听/冲突状态；点击后通过 `shell.overlay` 打开完整 Runtime Inspector 面板。Browser 使用 DSH Client Bundle 机制加载，Client 源码经过 TypeScript 与兼容 DSH 的 client bundler 构建为 Browser artifact。Host 与 Browser 之间使用 DSH 现有的 Host-to-Client bridge；在认证版本中若没有 typed Remote seam，可使用受同源保护的 WebServer API route，但不得创建独立服务。

Runtime Inspector 的弹窗 Chrome 对齐 DSH 原生 `ui-settings-general` Modal：全屏遮罩与背景模糊、视口居中的 `1040px` 面板、`min(800px, 100vh - 48px)` 高度、`24px` 圆角和 `--dsw-shadow-lv3` 阴影。面板不使用只有一个菜单项的左侧导航栏，使用 54px Header 直接显示 `Runtime Inspector`，下方为可滚动 Options 内容区；端口列表和详情作为面板内容中的产品专属双栏区域保留。桌面宽度下工具栏使用稳定的单行网格布局；视口宽度低于 `960px` 时搜索框独占一行，其余控件按完整控件组换行。Options 区域本身不整体垂直滚动，列表列在固定可视高度内独立滚动，详情列保持可见并独立滚动。来源追踪降级和扫描未完成只作为按需出现的 Header 状态提示，不展示默认的“观察模式”。Browser 必须支持遮罩点击关闭、document 级 Escape、打开后的初始焦点、关闭后的焦点恢复，以及窄窗口下的居中响应式布局。

Browser 注入 DSH `sessions` 服务，以当前 `sessions.list.current` 作为展示上下文：Session 显示标题，项目优先显示 Host 已确认的 origin workdir、缺失时显示经过脱敏的当前 Session cwd，用户请求从当前 conversation 中按 Call ID/root Call ID/Turn 映射。Browser 传给 Host 的 current Session ID 只影响 `current-session` 展示和 fresh scan 投影，不授予 managed 或 external action 权限。

面板默认查看“开发相关”而非完整任务管理器视图。Host 用 Session、项目路径、已脱敏命令和 executable 等确定性证据输出独立的开发相关性与工具链展示字段；Browser 依次显示“当前项目”“开发环境”“固定显示”，无开发依据的系统服务和桌面应用进入默认折叠的“其他监听”。工具栏将“查看范围”“启动方筛选”和“仅显示可处理”作为三个不同语义的紧凑控制，不再使用与筛选重复的顶部统计摘要。搜索覆盖完整 inventory，“全部监听”可恢复系统视图。常见端口号不能单独建立开发相关性，分组和 Logo 也不得改变 Process origin、Lifecycle owner 或 action kind。

工具链 Logo 的原始素材保存在 `assets/toolchains/`，维护脚本只用简洁的工具链 ID 到 URL 清单补齐缺失素材，并从本地文件生成 Browser artifact。面板运行时不得联系工具链官网；未审核或未知工具链使用本地通用占位。用户可把“其他监听”固定到开发端口视图，偏好仅保存在带命名空间和版本的 Browser 本地状态中，稳定键不含 PID 或创建时间。

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
31. As a DSH user, I want each unavailable runtime capability to degrade visibly and independently, so that I still receive port visibility without false attribution and retain only actions whose separate safety checks remain available.
32. As a DSH user, I want installation, update, and removal to use the normal DSH Bundle lifecycle, so that I do not need to edit DSH source or maintain a private fork.
33. As a DSH user, I want one restart after Bundle installation to activate the plugin, so that installation behavior follows the official DSH composition model.
34. As a DSH user, I want unloading Runtime Inspector not to terminate existing user processes, so that observation lifecycle is independent from process ownership.
35. As a DSH maintainer, I want the plugin to declare one tested DSH compatibility baseline, so that changes to Cordis internal behavior fail closed instead of silently corrupting attribution.
36. As a DSH maintainer, I want future upstream `subprocess/started` support to remain possible, so that the MVP’s internal observer can later migrate to a public provider-neutral lifecycle seam.
37. As a DSH Web user, I want a persistent Runtime Inspector entry in the global sidebar, so that I can discover port conflicts without opening a separate Windows tool.
38. As a DSH Web user, I want the sidebar entry to show a bounded listener/conflict count, so that I can notice a possible port problem before opening the panel.
39. As a DSH Web user, I want the Runtime Inspector panel to open over the main Web UI, so that I can investigate listeners without losing my current Session or Conversation.
40. As a DSH Web user, I want the panel to show loading, empty, incomplete-scan, degraded, success, and failure states as readable text, so that a missing row is not confused with a successful scan.
41. As a DSH Web user, I want managed Job/Terminal shutdown and external single-PID termination to be visibly different actions, so that I understand the ownership and impact before confirming.
42. As a DSH Web user, I want the Web UI to remain read-only when compatibility, permissions, identity, or client loading is insufficient, so that a browser failure cannot expand process authority.
43. As a DSH Web user, I want the panel controls to have accessible names and stable user-facing targets, so that keyboard users, screen readers, browser automation, and Agent-assisted investigation can operate the critical flow.
44. As a DSH maintainer, I want Host and Browser code to ship from one Bundle and one repository, so that UI/runtime changes are versioned and tested together without a second feature repository.

## Implementation Decisions

- The MVP is a Windows-only Bundle with stock DSH `dsh-0.1.0-rc.8`, `dsh-0.1.1-rc.1`, and `dsh-0.1.1-rc.2` as regression baselines, limited to the Windows local execution world. DSH version is diagnostic metadata rather than a general feature gate: unknown versions use the same runtime capability probes, while only the private delayed-Terminal repair remains exact-version and exact-shape gated.
- The highest existing seam is the Cordis `internal/get` waterfall. The observer must call the built-in `next()` first, create a Proxy around the returned subprocess service, and never call `ctx.subprocess` again from inside that Proxy.
- The pinned stock path can expose the provider before `internal/get` is reached. In that case the plugin may wrap only the actual `LocalSubprocessRuntime` `spawn`/`spawnTerminal` descriptors as a reversible fallback, using exact compare-and-swap disposal and the same active fence. This is observation, not provider replacement or ownership; both seams must deduplicate by exact handle identity.
- The Proxy wraps only `spawn` and `spawnTerminal`. It binds the original methods to the original service, preserves synchronous errors and returned handle identity, and does not alter argv, cwd, environment, stdio, cancellation, termination, or ownership behavior. The only timing/field exception is ADR-0003's bounded wait and repair for an exact known delayed-PID Terminal shape.
- A plugin-wide active fence is cleared before observer disposal. A previously returned Proxy remains a pass-through after disposal; a fresh lookup returns the original service once the listener is removed.
- The observer ignores invalid or unavailable PID values. PID `-1`, missing PID, delayed remote PID, failed spawn, and failed Windows identity reads cannot produce verified attribution. A local Terminal PID `0` may enter the ADR-0003 exact-version/exact-shape readiness repair; unsupported shape, exit, timeout, disabled compatibility, or incomplete identity remains unverified.
- Tool attribution uses an AsyncLocalStorage frame installed around the `tools/execute` waterfall. The frame contains Session/Agent identity, Call ID, root Call ID, Turn, Step, Tool name, command, and final workdir. It is read at spawn time, not frozen at service lookup time.
- Session `tool/call` events are cached before dispatch to resolve Turn and Step. Code Mode inner calls retain their own Call ID and root Call ID; the outer Call event is the Turn/Step lookup key.
- Process origin is one-to-many: one Tool Call may create multiple root processes. Ticket 02 stores root PID, the lossless process creation-time identity, Session/Turn/Step/Call/root Call, Tool, redacted command, final workdir, and observation time. It intentionally does not retain raw argv; later Job/Terminal lifecycle work may add bounded redacted metadata and owner identity without changing the root-PID source.
- Process origins are memory-only for the current DSH run. Root exit does not immediately evict an origin. A high-water record limit is required; eviction must not make a live listener appear verified under another PID because matching always includes creation identity.
- Job association uses `jobs.onJobsChanged` and a per-owner newly observed Job ID diff in the same ALS execution context. The returned structured Job ID is a cross-check, not the root PID source. Job termination uses owner-fenced `jobs.kill` followed by bounded `jobs.wait`.
- Terminal association reads the stock terminal session identity carried into the terminal spawn specification and cross-checks the public terminal snapshot. For the certified delayed-PID versions, association occurs only after the original handle has a positive PID and exact creation identity. Terminal termination uses exact-Agent-fenced `terminals.kill` and waits for backend quiescence.
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
- The Host/UI boundary uses an opaque listener row id and a serializable inventory query sorted by port, application, PID, project, or Session. Copy returns bounded redacted details; opening a project directory is an injected host callback and refuses unavailable or redacted paths.
- Host actions require a fresh pre-action listener lookup and explicit confirmation. Verified managed owners route only to Job/Terminal lifecycle APIs; external rows route only to the existing identity-fenced single-PID terminator; rows whose action state is read-only or degraded cannot invoke either action. Source-tracking degradation alone does not convert an independently safe external row into read-only. Every attempted action performs a fresh scan and reports `portReleased` only when that scan is complete.
- The plugin Bundle uses the normal DSH installation model. Installation, update, or removal becomes active after a target Profile restart; no DSH source modification, private fork, or manual composition edit is required.
- Host and Browser halves ship from one repository and one distributable Bundle. The existing Node entry remains the Host half; a separate Browser entry is exported through the package’s `./client` surface and declared through `dsh.client` for the `web` platform. The package continues to use its Bundle composition patch and includes the built Browser artifact.
- Browser source is authored in TypeScript and compiled by a DSH-compatible client bundler into the lazy client-module format. `window.__ModuleLoader__.load` is a generated artifact contract, not hand-authored application source. Host and Browser builds must not share imports of native process code; only serializable DTOs and UI-safe types may cross the boundary.
- The trusted UI composition uses the additive `sidebar.footer.action` entry point and the additive `shell.overlay` panel surface. The Runtime Inspector does not replace the Sidebar, Conversation, composer, or another product-owned root surface. The sidebar entry is global rather than Session-scoped because listener ownership can span Sessions.
- Browser calls only a serializable Runtime Inspector Host RPC contract for inventory, redacted copy, project-directory opening, and confirmed actions. The transport uses the existing DSH Host-to-Client bridge; a same-origin WebServer API route is an allowed baseline adapter when the certified DSH version does not expose a typed Remote seam. The Bundle never starts a second Web server for the feature.
- The Web panel must distinguish loading, empty, complete inventory, incomplete scan, observing, read-only, degraded, action confirmation, action failure, and post-action fresh-scan states. Search, sort, and selected-listener state should be reproducible through URL/query state or the host application’s equivalent navigation state when that state mechanism is available.
- Critical controls use semantic HTML or the DSH client’s accessible primitives, have visible and programmatic names, are keyboard reachable, and expose stable user-facing locators for the entry, refresh, row selection, confirmation, copy, directory-open, and action-result controls.
- A future public `subprocess/started` upstream event remains a follow-up architecture improvement. It is not part of this MVP’s runtime dependency.

## Testing Decisions

Tests must assert observable behavior and safety outcomes, not the fact that a particular private helper or Proxy implementation was used. The central test oracle is the resulting Process origin, lifecycle owner, confidence state, and termination behavior.

The implementation must include:

- Compatibility and health tests: each regression-baseline version and an unknown version with the required public contracts activate the corresponding capabilities without a user-facing version warning; a failed observer contract disables verified attribution without disabling an independently safe external single-PID action.
- Subprocess observer tests: process and terminal lookup returns the original service behavior and handle identity; invalid PID does not create an origin; observer exceptions do not alter spawn success; dispose turns cached proxies into pass-through; no provider teardown is triggered.
- Tool attribution tests: foreground native PowerShell, background PowerShell, Code Mode inner PowerShell, concurrent Agents, nested execution, cancellation, and thrown Tool bodies preserve the correct ALS frame and root Call mapping.
- Job association tests: a root spawned before Job ID allocation is linked to the one newly published Job ID through the synchronous jobs-changed callback; a failed `spec.run()` creates no managed link; structured Job result is used only as cross-check.
- Terminal readiness and association tests: native positive PID passes through untouched; delayed `0 → positive` PID repairs the original handle without consuming early data; unsupported shape, exit, timeout, disabled compatibility, and failed repair remain unverified; terminal PID and session identity are linked at spawn; persistent terminal first creation is attributed; subsequent sends do not claim command-level verified attribution.
- Windows identity tests: PID reuse, creation-time mismatch, unreadable parent, parent-cycle, exited root, and escaped daemon paths degrade instead of becoming verified.
- Ancestry tests: a PowerShell → npm → Node listener is verified; same-named unrelated Node listeners remain separate; multiple roots from one Call are represented one-to-many.
- Termination tests: managed Job uses kill then wait; Terminal uses owner-fenced kill; managed failure never auto-escalates; external termination rechecks identity and affects only the selected PID; access denied and protected processes remain read-only; post-action scan reports release state.
- Privacy tests: command/argv redaction and size bounds apply consistently to UI, RPC, logs, and `port_list`; other Session details are coarse in Tool output while UI retains intended visibility.
- `port_list` tests: current-Session full attribution, other-Session coarse ownership, inferred-owner suppression, secret/path redaction, incomplete-scan reporting, row/output bounds, degraded-mode read-only behavior, and reversible Tool registration without termination capability.
- Host/UI tests: inventory fields and Session visibility, search/sort, redacted copy, safe project-directory opening, distinct managed/external/read-only/degraded action states, confirmation and action routing, unavailable-action rejection, and post-action fresh-scan release reporting.
- Development presentation tests: current-project precedence, framework-before-runtime classification, executable-backed infrastructure, port-only rejection, collapsed-other global search, local Logo fallback, versioned pin persistence, no duplicate rows, and classification/action orthogonality.
- Web package tests: the package declares the required Browser entry and `dsh.client` metadata, the built client artifact is included in the distributable Bundle, missing/unsupported client loading fails without expanding Host process authority, and Bundle disposal removes the Browser contribution.
- Web slot and panel tests: the global Sidebar entry renders with a bounded listener/conflict count, the overlay panel opens and closes without replacing the host layout, and the panel renders loading, empty, incomplete, observing, degraded, confirmation, failure, and post-action states with accessible names and stable critical-action locators.
- Host-to-Browser bridge tests: Browser requests expose only the serializable Host RPC surface, command/path redaction is preserved, other-Session privacy remains enforced, stale listener rows are revalidated by Host, and read-only/degraded rows cannot invoke actions.
- Native Web acceptance: on each declared DSH Web version, restart the Profile, verify the client artifact is served and loaded, verify the global entry and overlay panel, run a real listener inventory, exercise one managed or external action through the Web surface, and confirm the fresh scan result plus unaffected listeners. The test must not replace the Web path with a direct Host helper call.
- Lifecycle tests: roots and descendants remain attributable after a Turn ends; origins survive root exit while a descendant listens; DSH restart clears origins; plugin unload removes observers without terminating an existing background process.
- End-to-end acceptance: a real Stock DSH Windows gate starts two Sessions with same-named services, associates a background service with a Job and a persistent service with a positive-PID Terminal, exercises managed Job/Terminal shutdown and one identity-fenced external single-PID action, then proves selected ports were released while foreground and external control listeners remain.
- Native Terminal smoke: on Windows, spawn a persistent PowerShell Terminal through Stock DSH, wait for readiness, assert PID greater than zero, send and read a unique token, terminate through the Terminal owner, and prove no listener/process residue. Unit doubles for `0 → positive` are necessary but cannot replace this gate.

Prior art to follow includes DSH Agent initiator AsyncLocalStorage isolation tests, subprocess-local process-tree and identity-fencing tests, jobs-local start/notification tests, terminal ownership and teardown tests, Cordis waterfall and listener lifecycle tests, and existing Windows Toolhelp32/GetProcessTimes inspector coverage.

## Out of Scope

- Modifying DSH core or requiring a `subprocess/started` upstream event for MVP operation.
- Replacing or subclassing the PowerShell or subprocess provider as the production implementation; the narrowly scoped reversible method fallback is the only exception and is limited to the pinned local provider.
- Cross-version verified attribution beyond the declared certified DSH version set.
- E2B or other remote execution worlds where a real PID is delayed or not observable from the Windows host.
- Exact Call-level attribution for descendants created by later commands sent through an existing persistent PowerShell terminal.
- Cross-DSH-restart origin history or durable process-origin persistence.
- UDP listeners, macOS, Linux, full general-purpose task-manager features, history statistics, automatic cleanup, and orphan-process policy.
- Bulk termination, a second force/escalation action, automatic UAC elevation, or termination of external process trees.
- Direct termination from the model-facing `port_list` Tool.
- Maintaining Runtime Inspector Browser UI in a second feature repository.
- Starting a separate local Web server, companion page, or extra process for the Runtime Inspector UI.
- Replacing the DSH Web Sidebar, Conversation, composer, or application root instead of using additive Client Slots.
- Reading arbitrary process environment blocks, secrets, or full command lines without redaction.
- Reworking DSH’s public subprocess abstraction or implementing the future provider-neutral lifecycle event.

## Further Notes

The first implementation slice should be a tracer-bullet integration that activates the observer on the supported stock DSH, runs one native foreground PowerShell and one `run_in_background` call, records root PID and Process origin, links the Job, and proves observer unload leaves the process alive. This is an implementation acceptance test, not a separate prototype.

The Web integration tracer-bullet should then build the Browser half from the same Bundle, register the global Sidebar entry, open the overlay panel, fetch one serializable inventory snapshot through the Host bridge, and render the read-only/degraded state before adding action controls. The Web path must be verified on the declared DSH versions before the panel is allowed to dispatch managed or external actions.

The repository uses a local Markdown issue tracker under `.scratch/`, with the canonical triage mappings documented in `docs/agents/triage-labels.md`. The source Spec is copied to `.scratch/<feature-slug>/spec.md`; `/to-tickets` publishes its implementation tickets as separate files under `.scratch/<feature-slug>/issues/` without changing the accepted decisions.
