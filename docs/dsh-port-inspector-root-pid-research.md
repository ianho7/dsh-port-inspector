# DSH Port Inspector Windows MVP：Tool Call → root PID 源码调研

> 调研日期：2026-08-21
> 权威源码：本地 `D:\project\deepseek-harness`，commit `141eb6fef83422698aef7a981029e843e8161534`（`dsh-0.1.0-rc.8` 合并提交，2026-08-19）
> 源码状态：存在与本调研无关的未跟踪文件 `deepseek-harness-deep-dive.html`、`deepseek-harness-deep-dive.md`、`scratch-plugin/`；本调研未修改 DSH 工作树。
> 结论标签：**Verified** = 源码直接证明；**Inferred** = 由已验证调用链推导；**Unknown** = 当前证据不足。

本调研只回答当前运行周期内的 `Tool Call → DSH root PID → Windows ancestry`。不重新设计产品，也不展开端口 UI、完整 scanner、跨平台或历史统计。

## 1. Executive Conclusion

### 最佳方案

**推荐方案 A，但应把扩展点放在 `ctx.subprocess` seam，而不是只给 `ShellProcess` 加 `pid`：新增一个“真实 PID 已可用”的只读 `subprocess/started` 通知；Port Inspector 用 `tools/execute` waterfall 建立调用级 `AsyncLocalStorage<ToolExecution>`，在通知到达时写入 `ProcessOriginRegistry`。**

- **Verified：PID 的真正公共产生点是 subprocess handle。** `SubprocessHandle.pid` 明确定义为进程树 root PID；本地 provider 在 `child_process.spawn()` 后取得 `child.pid` 并把它返回在 handle 上。参见 [`SubprocessHandle`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/subprocess/subprocess/src/types.ts#L158-L193)、[`spawnSubprocess`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/subprocess/subprocess-local/src/spawn.ts#L349-L361) 和 [handle 构造](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/subprocess/subprocess-local/src/spawn.ts#L377-L378)。
- **Verified：标准 `pwsh` provider 取得了 handle，却没有向上暴露 PID。** foreground 把 handle 保存在局部变量并仅返回 `ShellRunResult`；background 把它包装为没有 `pid` 的 `ShellProcess`。参见 [`PwshLocalExecutor.runArgv/startArgv`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/shell/pwsh-local/src/index.ts#L255-L346) 与 [`ShellProcess`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/shell/shell/src/types.ts#L161-L182)。
- **Verified：现有插件事件没有 subprocess started / shell process started。** `SubprocessRuntime` 只有 `resolveExecutable`、`spawn`、`spawnTerminal` 三个抽象操作；`tools/execute` 能看到调用上下文但看不到 handle。参见 [`SubprocessRuntime`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/subprocess/subprocess/src/index.ts#L74-L140) 与 [`tools/execute`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/core/tools/src/index.ts#L142-L197)。
- **Inferred：一个 provider 内部、PID 有效后发布、监听失败被隔离的通知，是当前 abstraction 最自然且最小的长期 seam。** 它同时覆盖 foreground、background、sandbox 以及普通 terminal 创建，不要求复制 PowerShell 行为。

### 是否需要修改 DSH core？

**生产推荐需要一个很小的 DSH upstream change。** Windows MVP 的最小变更是：在 subprocess 公共包定义事件 payload/事件类型，并在 `subprocess-local` 的 `spawn`、`spawnTerminal` 获得有效 PID 后发布；再加契约测试。`ShellProcess.pid` 单独不充分。

若暂时完全不能改 DSH，存在一个源码可行的 **方案 C**：插件用自定义 provider 继承公开的 `LocalSubprocessRuntime`，override `spawn`/`spawnTerminal`，调用 `super` 后读取 `handle.pid`；composition patch 先 disable base bundle 的 `id: subprocess` 行，再 insert 一个不同 id 的 tracked provider 行。它比重写 PowerShell provider 小得多，但会成为整个 `ctx.subprocess` 的资源所有者；provider 卸载会终止并等待所有受管进程，这与 Port Inspector “卸载只撤销观察能力、不杀用户进程”的产品边界冲突。因此它适合无 core 改动的临时 fallback，不是长期最佳方案。[`LocalSubprocessRuntime` 生命周期](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/subprocess/subprocess-local/src/index.ts#L37-L101)

### 约束补充：必须运行于未经修改的官方 DSH

> 2026-08-21 后续决策新增约束：普通用户安装插件即可使用，不允许把 DSH core change 作为 MVP 前提。

在这个约束下，补充源码调查发现了更合适的 **方案 D：利用 Cordis typed `internal/get` waterfall，在每次 `ctx.subprocess` service lookup 时返回一个不修改 target 的 Proxy，仅包装 `spawn`/`spawnTerminal`。** Plugin 仍以 `tools/execute` ALS 提供 Tool Call 上下文；wrapper 调用原方法、保持原 handle identity，在 PID 有效时登记 origin。

- **Verified：plugin context 的普通 service property read 会经过 `internal/get` waterfall，listener 可以先调用 `next()` 取得原 service，再替换本次 lookup 的返回值。** root fiber read 与 `ctx.reflect.get()` 绕过该 waterfall。[`ReflectService` get trap](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/vendor/cordis/src/reflect.ts#L135-L167)、[`internal/get` typed contract](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/vendor/cordis/src/events.ts#L321-L347)、[`waterfall`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/vendor/cordis/src/events.ts#L224-L243)
- **Verified：当前 PowerShell foreground/background 在每次执行时动态读取 `this.ctx.subprocess.spawn`，没有缓存 provider 或 bound method。** [`PwshLocalExecutor.runArgv/startArgv`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/shell/pwsh-local/src/index.ts#L259-L287)
- **Verified：`ctx.on` listener 是当前 plugin fiber 的 effect，卸载会自动移除。** [`EventsService.register/on`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/vendor/cordis/src/events.ts#L245-L301)
- **Inferred/validated by local runtime probe：** decorator 不替换 provider、不取得 handle ownership；plugin-wide `active` flag 在 dispose 时关闭后，旧 consumer 即使缓存 decorator Proxy 也只透传到原 service，因此卸载不会终止现有进程。
- **Verified limitation：** `internal/get` 是 Cordis internal contract，不是稳定的 DSH subprocess public extension point；安装前缓存的 service/method、root-context lookup 或 `ctx.reflect.get('subprocess')` 会绕过。当前目标 PowerShell 生产调用点逐次动态读取，所以固定版本 MVP 可覆盖；跨版本兼容不能据此承诺。

因此推荐结论按部署约束分为两种：

- **允许 core change：A 仍是长期正确的公共设计。**
- **必须 stock DSH + 固定兼容版本：D 优于 C/B/直接 monkey-patch，是当前 MVP 推荐。**

## 2. Current Execution Path

### 标准 Windows `pwsh`（foreground）

```text
Agent loop
  Agent.run() / step
  [session, turn, step]
      ↓
executeToolCalls()
  append tool/call(callId, name, raw arguments, turn, step)
  ToolExecutionInput(callId, name, parsed args, agent, signal)
      ↓
ToolRuntime.prepare / tools/pre-execute
      ↓
ToolRuntime.dispatchScheduledExecution
  tools/execute(exec, next)
  [callId, rootCallId, tool name, parsed args, agent/session, signal]
      ↓
dsh-tool-pwsh execute(args, exec)
  resolve workdir; shellEnv.collect(exec)
      ↓
ctx.shell.resolve(...) → ctx.shell.run(...)
      ↓
SandboxPwshExecutor.run()
  sandbox.wrap(argv, cwd, ...)
      ↓
PwshLocalExecutor.runArgv()
      ↓
ctx.subprocess.spawn(SubprocessSpawnSpec)
  [actual argv, actual cwd, env, signal]
      ↓
LocalSubprocessRuntime.spawn()
      ↓
spawnSubprocess() → node:child_process.spawn()
      ↓
SubprocessHandle.pid = child.pid       ← root PID 在这里可用
```

证据：

- **Verified：tool/call 在真正 dispatch 前写入。** agent loop 构造包含 `callId/name/arguments/agent/signal` 的 input，并在 prepare/dispatch 前 append `tool/call`；该事件携带 `turn/step`。参见 [`executeToolCalls`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/core/agent-loop/src/tool-calls.ts#L59-L80)、[开始调用](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/core/agent-loop/src/tool-calls.ts#L198-L230) 和 [`tool/call` append](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/core/agent-loop/src/tool-calls.ts#L261-L264)。
- **Verified：`tools/execute` 包围实际 tool body。** registry 先进入 waterfall，再调用 `tool.execute(exec.arguments, exec)`；工具身份不可变，仅 signal 可由 wrapper 临时替换。参见 [`dispatchToolBody`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/core/tools/src/index.ts#L1527-L1559) 和 [`dispatchScheduledExecution`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/core/tools/src/index.ts#L1569-L1598)。
- **Verified：Windows base composition 使用 `subprocess-local + pwsh-sandbox + tool-pwsh`。** [`base/cordis.patch.yml`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/bundle/base/cordis.patch.yml#L163-L186) 与 [tool 行](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/bundle/base/cordis.patch.yml#L207-L216)。
- **Verified：sandbox provider 继承本地 PowerShell executor，最终仍进入同一个 `ctx.subprocess.spawn`。** [`SandboxPwshExecutor`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/shell/pwsh-sandbox/src/index.ts#L52-L53) 在 `run/start` 中包装请求后调用继承的 `runArgv/startArgv`（[源码](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/shell/pwsh-sandbox/src/index.ts#L92-L149)）。

### `run_in_background: true`

```text
tool-pwsh execute
  → ctx.jobs.start({ owner: exec.agent, run() { ... } })
  → JobsLocal.start() 同步调用 spec.run()
  → ctx.shell.start(...)
  → PwshLocalExecutor.startArgv()
  → ctx.subprocess.spawn(...)
  → handle.pid
```

- **Verified：spawn 仍发生在当前 ToolExecution 生命周期中。** `tool-pwsh` 的 `run()` 内同步调用 `ctx.shell.start`；`jobs-local.start` 在返回 job id 前同步调用 `spec.run()`。参见 [`tool-pwsh` background 分支](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/shell/tool-pwsh/src/index.ts#L366-L395) 与 [`JobRegistry.start`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/jobs/jobs-local/src/index.ts#L131-L190)。
- **Verified：tool 返回后 job/process 可继续运行。** job 由 exact Agent owner 管理，Agent 生命周期结束时取消、等待并删除；服务 teardown 对全部 job 做同样清理。参见 [`jobs-local` owner/service cleanup](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/jobs/jobs-local/src/index.ts#L443-L499)。

### Code Mode

```text
outer run_code ToolExecution(callId = outer, rootCallId = outer)
  → inner pwsh ToolExecution(
      callId = `${outer}:code:n`,
      rootCallId = outer,
      parent = outer.token)
  → 同一 tools/execute pipeline
  → pwsh → subprocess → PID
```

- **Verified：nested call 有独立 `callId`，并保留 `rootCallId`。** [`ToolExecutionInput/ToolExecution`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/core/tools/src/index.ts#L314-L383)；Code Mode 用 `<outer>:code:<n>` 生成 subCallId 并传播 `exec.rootCallId`（[`code-mode.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/core/tools/src/code-mode.ts#L466-L481)）。
- **Verified：sub-dispatch start 在执行前写入 session。** [`tool/code-dispatch-start`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/core/tools/src/code-mode.ts#L530-L547)。

因此来源记录必须同时保存 `callId` 与 `rootCallId`。Turn/Step 应由 `rootCallId` 查外层 durable `tool/call`；不能假设 inner `callId` 本身存在普通 `tool/call`。

## 3. PID Availability

| 层 | PID 是否存在/可访问 | 结论 |
| --- | --- | --- |
| Node `ChildProcess` | `child.pid` | **Verified**：OS spawn 后最先产生 |
| `SubprocessHandle` | `readonly pid` | **Verified**：公共契约，进程树 root PID；失败为 `-1` |
| `SubprocessTerminalHandle` | `readonly pid` | **Verified**：终端顶层进程 PID |
| `LocalSubprocessRuntime.spawn/spawnTerminal` | 可读取返回 handle 的 `pid` | **Verified** |
| `PwshLocalExecutor.runArgv/startArgv` | 局部 `handle/running.pid` 可读 | **Verified**，但没有向上返回 |
| `ShellRunResult` | 无 PID | **Verified** |
| `ShellProcess` | 无 PID | **Verified** |
| `tool-pwsh` / `tools/result` | 无 PID | **Verified**：foreground 返回 shell result，background 只返回 job id |
| 普通插件的 `tools/execute` listener | 无 handle/PID | **Verified**：只有 ToolExecution 与 `next()` |

PID 丢失的精确位置是：

```text
ctx.subprocess.spawn() 返回 SubprocessHandle(pid)
  → PwshLocalExecutor.runArgv(): await handle.done，组装 ShellRunResult（不含 pid）
  → PwshLocalExecutor.startArgv(): 组装 ShellProcess（不含 pid）
  → tool-pwsh 只收到 ShellRunResult / ShellProcess
  → foreground result 或 background job id（均不含 pid）
```

**Verified：`ShellProcess.pid` 单独扩展仍不充分。** 它最多解决 background：foreground 路径根本不产生 `ShellProcess`；并且现有 tool 与 hook 仍没有观察 `ShellProcess` 的通用生命周期事件。[`ShellProcess`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/shell/shell/src/types.ts#L161-L182)

**Verified：远程 provider 证明事件语义不能写成“`spawn()` 返回即 PID 有效”。** `E2BSubprocessHandle.pid` 在远程启动期间为 `-1`，随后才在 process group publication 后设置 `remotePid`。参见 [`E2BSubprocessHandle.pid`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/e2b/subprocess-e2b/src/process.ts#L158-L231) 与 [实际赋值](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/e2b/subprocess-e2b/src/process.ts#L330-L365)。因此 upstream 事件的契约必须是“provider 已取得有效真实 PID 时发布”，而不是机械包装 `SubprocessRuntime.spawn()` 的返回点。

### 现有 plugin extension points 逐项判定

| 候选扩展点 | 源码结论 |
| --- | --- |
| `ctx.subprocess` Context API | **Verified：直接调用者可从返回 handle 读 PID；旁路插件不能观察其他调用者拿到的 handle。** |
| Subprocess Service / Provider | **Verified：可替换且只有一个 provider。** 这是 C 的可行 seam，也是其接管全局资源 ownership 的原因。 |
| `tools/execute` hook | **Verified：能可靠包围 tool body并取得调用身份；不能直接取得 PID。** 适合作 attribution carrier，不是 PID source。 |
| `tools/result` lifecycle | **Verified：shell tool 的结果中没有 PID；到这里已经丢失。** |
| `subprocess/*` event | **Verified：当前没有 process-started 事件。** `SubprocessRuntime` 公共面只有 resolve/spawn/spawnTerminal。 |
| Shell / PowerShell Provider | **Verified：内部局部变量有 PID，但公共 `ShellRunResult` / `ShellProcess` 没有；没有 after-spawn hook。** |
| `ctx.jobs` | **Verified：有 owner/status/cleanup，但 snapshot 没有 PID/Call ID。** |
| `ctx.terminals` | **Verified：published session 可有顶层 PID；只覆盖 terminal，并且 persistent shell 后续 send 不创建新 terminal。** |
| shell-env contributor | **Verified：contributor 能收到 ToolExecution，内建只注入 `DSH_SESSION_ID` 等环境；它不观察 OS process handle。** 不能仅靠环境获得 host PID。 |

结论是：**当前插件 API 没有同时处于 ToolExecution 上下文与实际 PID 创建点的只读扩展点。** A 补上这个缺口；C 通过成为 provider owner 绕过这个缺口。

## 4. Attribution Context

| 字段 | 可靠来源 | 与 process creation 的关系 |
| --- | --- | --- |
| Session ID | `exec.agent.id` / `exec.agent.session.id` | **Verified**：ToolExecution 直接持有 Agent；当前 Agent id 就是 SessionId |
| Agent ID | `exec.agent.id` | **Verified**：当前实现不是第二套独立 id，而是 SessionId |
| Turn | 外层 `session/event` 的 `tool/call.data.turn` | **Verified**：在 tool dispatch 前已提交 |
| Step | 外层 `session/event` 的 `tool/call.data.step` | **Verified**：同上 |
| Call ID | `exec.callId` | **Verified**：当前执行的精确调用；Code Mode 为 subCallId |
| Root Call ID | `exec.rootCallId` | **Verified**：原始 model-requested call；Code Mode 归属 turn/step 的索引键 |
| Tool name | `exec.name` | **Verified** |
| Command | `exec.arguments.command`；审计可同时保留 session 中 raw JSON | **Verified**：parsed args 与 model 原始参数分别可取 |
| Workdir | 最终 `SubprocessSpawnSpec.cwd` | **Verified**：这是 provider 实际收到的 cwd，优于只读 tool 参数/default 推断 |
| root PID | `subprocess/started.pid`（A）或 tracked provider 返回 handle（C） | 需要新增可观察 seam 或替换 provider |
| Process creation identity | PID 到达后立即用 Windows `GetProcessTimes` 查询 | **Inferred**：现有本地 inspector 已采用同一身份模型 |

关键时序：`Session.append('tool/call')` 先 push append-only log，再向 `session/event` observer 发布，且 observer 失败被隔离；tool prepare/dispatch 在其后。因此插件可维护 `(sessionId, rootCallId) → {turn, step}` 的同步缓存，再由 `tools/execute` 把完整 execution frame 放入 ALS。[`Session.append`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/core/session/src/index.ts#L604-L648) 与 [`session/event` 契约](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/core/session/src/index.ts#L42-L76)

推荐 frame：

```ts
interface ProcessAttributionFrame {
  sessionId: string
  callId: string
  rootCallId: string
  turn: number
  step: number
  tool: string
  command?: string
}
```

**Verified：DSH 自身已经用 `AsyncLocalStorage` 做 Agent causal attribution，并有跨 await、并发隔离、嵌套恢复、异常恢复测试。** [`AgentRegistry` ALS](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/core/agent/src/index.ts#L250-L322)、[进入 boundary](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/core/agent/src/index.ts#L639-L650)、[并发隔离测试](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/core/agent/tests/agent-initiator.spec.ts#L104-L124)。这不是 Port Inspector ALS 的现成 API，但直接验证了同一 runtime 中该关联模型。

## 5. Option Comparison

| 方案 | 可靠性 | DSH 改动 | 插件复杂度 | 维护成本 | 推荐度 |
| --- | --- | --- | --- | --- | --- |
| **A：subprocess/started upstream event** | 高；在 PID 的 owner seam 发布，覆盖 foreground/background/terminal | 小；公共事件类型 + provider 发布点 + tests | 低；`tools/execute` ALS + registry | 低；不复制 provider 行为，不改变资源所有权 | **最高，生产推荐** |
| A 的弱版本：只暴露 `ShellProcess.pid` | 低到中；漏 foreground，插件仍没有通用观察入口 | 小 | 仍需额外 hook | 中，且契约不完整 | **不推荐单独采用** |
| **B：tracked PowerShell Provider** | 理论上高 | 无 core，但要替换 shell provider | 高；需复制或侵入 PowerShell/sandbox 路径 | 高；跟随 pwsh、sandbox、output、timeout、cancellation 变化 | 低 |
| **C：tracked LocalSubprocessRuntime + ALS** | Windows local one-shot 路径高；persistent 后续 send 有边界 | 无 core；patch 替换 `id: subprocess` | 中低；薄 subclass | 中到高；绑定 concrete local provider，且接管全部 subprocess 生命周期 | **可靠 fallback，不作长期默认** |
| **D：`internal/get` non-mutating Proxy + ALS** | 固定 stock DSH 版本、当前 pwsh 动态 lookup 路径高 | 无 core；普通 observer plugin row | 中；需严格 pass-through、active fence 和兼容性探针 | 中；依赖 Cordis internal contract，但不接管进程 ownership | **stock DSH MVP 推荐** |

### 方案 A 细节

**Verified：subprocess 是实际创建进程且持有真实 cwd/argv/PID 的最窄公共 seam。** 相比 shell 事件，它也覆盖 `terminal_open`、persistent shell 的首次 terminal 创建，以及其他真正使用 `ctx.subprocess` 的受管进程。

建议事件 payload 只描述进程事实，不把 ToolExecution 硬塞进 subprocess abstraction：

```ts
interface SubprocessStarted {
  kind: 'process' | 'terminal'
  pid: number
  argv: readonly string[]
  cwd: string
}
```

事件应满足：

1. 仅在 `pid > 0` 且 provider 认为实际 start 成功后发布；
2. local provider 在返回 handle 前发布；remote provider 在真实 PID 后发布；
3. observer 是只读、fire-and-forget，异常被 containment，不能把成功 spawn 改成失败；实现时不能裸用 `ctx.emit`（它会同步传播 listener throw），应采用 `void ctx.parallel(...).catch(log)` 或等价的 settled-and-log helper；Cordis `parallel` 内部先对全部 listener 做 `Promise.allSettled`，再把拒绝汇总为 `AggregateError`，因此 provider 侧必须终结该 rejection；[`EventsService.emit/parallel`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/vendor/cordis/src/events.ts#L177-L196)
4. payload 做不可变快照，不暴露可 terminate 的 handle；
5. plugin 通过外层 ALS 添加 Session/Turn/Call，而不是让 subprocess seam 依赖 Agent/Tool 包。

**Inferred：这不会破坏现有 abstraction。** 它没有修改 `spawn` 返回类型、termination/teardown 或 shell result，只增加一个 telemetry/lifecycle observation seam；对 tracing、审计、进程资源面板也有通用价值。

### 方案 B 细节

**Verified：Provider architecture 允许替换当前单一 shell service，但同时加载第二个 provider会报 duplicate service。** [`ShellExecutor` provider 契约](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/shell/shell/src/index.ts#L47-L100)。

问题在于现有 `PwshLocalExecutor` 的 PID 只存在于 `runArgv/startArgv` 内部局部变量；没有一个 protected “after spawn” hook 可供薄 wrapper 使用。要直接登记 PID，就要复制/重写这段执行逻辑，或继续改 upstream。这样会耦合：

- PowerShell executable/argv 与 encoding preamble；
- cwd 与 environment 收集；
- stdout/stderr collect、spill 和 output budget；
- timeout、abort、tree termination；
- `SandboxPwshExecutor` 的 argv 包装、sandbox facts/classification；
- background `ShellProcess` 与 jobs 语义。

因此 **B 能做，但相较 A/C 没有优势**。它最容易产生与现有 PowerShell Tool 不一致的 lifecycle/cancellation/background 行为。

### 方案 C 细节

**Verified：`LocalSubprocessRuntime` 是包根公开导出的 class，可 subclass。** 它的 `spawn`/`spawnTerminal` 是可 override 的 public 方法；package root exports `index.js/types`。[class](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/subprocess/subprocess-local/src/index.ts#L37-L47)、[methods](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/subprocess/subprocess-local/src/index.ts#L146-L183)、[`package.json` exports](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/subprocess/subprocess-local/package.json#L14-L26)。

**Verified：base bundle 的 provider 行有稳定 `id: subprocess`，但 patch 不能原地替换它的 `name`。** `applyEntryPatches` 把 `name` 当成 target-name guard；若与原行不同就 warning 并跳过，真正可覆盖字段是 `disabled/config/...`。因此 C 的正确 composition 是：按 `id: subprocess` 将原行设为 `disabled: true`，再通过 `insert` 加一个不同 id 的 tracked provider；不能写成“同 id 改 name”。[base row](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/bundle/base/cordis.patch.yml#L163-L164)、[`applyEntryPatches`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/vendor/include/src/index.ts#L58-L125)、[`PatchOptions`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/vendor/include/src/index.ts#L144-L155)

C 的优点：调用 `super`，foreground/background/sandbox/stdio/timeout/cancellation/terminal 行为全部继承；`run_in_background` 的同步 `spec.run()` 保证 spawn 在当前 ToolExecution ALS 中发生。应只在 ALS 有目标 shell tool frame 时登记，避免把 LSP、subagent、搜索等其他 subprocess 错归因。

C 的阻塞性缺点：

- **Verified：provider 自己拥有所有 live handles；其 fiber 卸载会 terminate 并 await 全部 process trees/terminals。** 这意味着卸载/热替换 Port Inspector provider 会杀掉整个 DSH 的受管进程，不只是撤销观察器。[teardown](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/subprocess/subprocess-local/src/index.ts#L47-L101)
- **Inferred：它与产品现有“插件卸载不自动终止用户进程”要求冲突。** 除非把 tracked provider 视为部署基础设施、禁止独立热卸载，否则不能作为默认生产设计。
- **Verified：它绑定 `subprocess-local` concrete provider，不适用于 E2B 等其他 execution world。** 对 Windows MVP 可接受，但长期耦合高于事件消费方。

### 方案 D 细节

Plugin 注册 `internal/get` waterfall listener。仅当 `name === 'subprocess'` 时，在 `next()` 返回的原 service 外创建 Proxy；Proxy 的 `spawn`/`spawnTerminal` wrapper 在**调用时**读取 ALS，而不是在 lookup 时固化 ToolExecution frame。

关键约束：

1. 先保存 `service.spawn.bind(service)` / `service.spawnTerminal.bind(service)`，wrapper 不得再次读取 `ctx.subprocess`，避免递归；
2. `spawn` 保留同步 throw，返回完全相同的 handle object；`spawnTerminal` await 原 promise 后返回同一 handle；
3. `pid <= 0` 跳过，不猜测；observer、Windows creation identity 和 registry failure 全部 containment；
4. 不修改 service target，不调用 `ctx.set`，不提供第二个 service；
5. dispose 时先关闭 `active` fence，再移除 listener，使已缓存的旧 Proxy 也退化为纯 pass-through；
6. Windows MVP 只对 stock `LocalSubprocessRuntime` 宣告支持。E2B 普通 spawn 返回时 PID 可能仍为 `-1`，D 没有 PID-ready callback，不能在 E2B 上提供 verified attribution。

**Verified：直接替换或修改 service 不是更自然的等价方案。** `ctx.set('subprocess', ...)` 只允许原 provider fiber；第二次 provide 会报 duplicate。`ctx.intercept` 只合并 service config，`ctx.mixin` 只转发成员，均不是 method decorator。[`ReflectService.set/provide`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/vendor/cordis/src/reflect.ts#L245-L304)、[`Service` config resolution](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/vendor/cordis/src/service.ts#L75-L101)、[`mixin`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/vendor/cordis/src/reflect.ts#L338-L389)

## 6. Recommended Design

```text
session/event: tool/call
  → cache[(sessionId, rootCallId)] = { turn, step, rawArgs }

tools/execute(exec, next)
  → AsyncLocalStorage.run({
      sessionId: exec.agent.id,
      callId: exec.callId,
      rootCallId: exec.rootCallId,
      turn/step: cache[rootCallId],
      tool: exec.name,
      command: exec.arguments.command
    }, next)
                        │
                        │ pwsh / shell / terminal creates process
                        ▼
subprocess provider obtains a valid real PID
  → subprocess/started { kind, pid, argv, cwd }
                        ▼
Port Inspector listener reads ALS frame
  → immediately query Windows creation identity (GetProcessTimes)
                        ▼
ProcessOriginRegistry.add({
  rootPid: pid,
  processCreatedAt: FILETIME identity,
  sessionId,
  turn,
  step,
  callId,
  rootCallId,
  tool,
  command,
  argv,
  workdir: cwd
})
                        ▼
Windows PID + ParentProcessId + creation-time ancestry matching
```

实现约束：

- 一个 Tool Call 理论上可能产生多个 root，registry 应为一对多，不要硬编码 `callId → 单 PID`。
- `pid <= 0` 不登记；创建身份读取失败时不能标 “Verified”。
- workdir 取 event 的最终 `cwd`；command 保留用户语义，argv 保留 provider 实际执行事实。
- Code Mode 同时保存 `callId` 与 `rootCallId`；turn/step 用 rootCallId 关联。
- observer 不应改变 spawn；记录失败应降级为 unattributed/diagnostic，不应使工具失败。

### 并发、background 与生命周期

- **并发 Tool Call — Verified/Supported。** DSH 只有 tool 明确 `isConcurrencySafe === true` 才并行，否则 fail-closed 为 exclusive；标准 pwsh 未声明 concurrency-safe。不同 Agent 与 Code Mode sub-dispatch 仍可能重叠，ALS 可隔离。[`executionMode`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/core/tools/src/index.ts#L1270-L1284)
- **`run_in_background` — Verified/Supported。** root spawn 在 `jobs.start` 返回前同步发生；进程可在 Tool/Turn 之后继续，registry origin 必须至少存活到该进程结束或 Agent dispose。
- **`ctx.jobs` — Verified/Not sufficient for PID。** job snapshot/record 提供 job id、kind、owner、label、时间和状态，但不携带 subprocess PID 或 Call ID；它适合受管关闭和生命周期观察，不是 root PID 来源。[`JobSnapshot`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/jobs/jobs/src/types.ts#L97-L127)
- **`ctx.terminals` — Partially useful。** terminal session snapshot 可有 `pid`，`terminal_open` 的 Tool result 也会返回 spawn result；但它只覆盖 terminal provider，不覆盖普通 pwsh foreground/background。[terminal types](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/terminal/terminal/src/types.ts#L133-L176)、[`TerminalSessionService.spawn`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/terminal/terminal/src/index.ts#L147-L195)
- **Agent/Turn end — Verified。** Turn 结束不等于 Agent dispose；background job/terminal 可继续。Agent dispose 与 subprocess service dispose 才触发各自 owner/tree cleanup。来源记录不能在 `turn/end` 删除。

### Managed Job / Terminal owner 关联补充

**Job — Verified：可以可靠建立 `root PID / Call ID → jobId`，但不是在 spawn 原子时刻取得。** `LocalJobRegistry.start` 先同步执行 `spec.run()`（其中 `tool-pwsh` spawn root），随后才分配 jobId、写入 store、调用 `notifyChanged(owner)` 并返回 id。因此 process wrapper 捕获 PID 时 jobId 尚不存在。[`LocalJobRegistry.start`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/jobs/jobs-local/src/index.ts#L131-L190)

公开的 `ctx.jobs.onJobsChanged` 在 record 已提交后同步回调；plugin 可启动时 seed 已见 JobId，随后在同一 ToolExecution ALS 中对 `jobs.list(owner)` 做新增 ID diff，把唯一新增 jobId 附到当前 call/root。测试证明 start 返回前通知已经发生且 list 可读。[`JobRegistry` observer contract](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/jobs/jobs/src/index.ts#L142-L167)、[local notify](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/jobs/jobs-local/src/index.ts#L289-L294)、[start-notify test](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/jobs/jobs-local/tests/jobs.spec.ts#L992-L1013)。`tool-pwsh` 最终返回的 structured `{kind:'background', jobId}` 可通过 `tools/result` 按 callId 做交叉校验。[background result](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/shell/tool-pwsh/src/index.ts#L366-L395)

**Terminal — Verified：stock `terminal-bash` 在进入 `ctx.subprocess.spawnTerminal` 前已把 `DSH_PTY_SESSION_ID` 与 owner `DSH_SESSION_ID` 放入 spec.env。** D wrapper 可在取得 handle.pid 时直接读取 terminal sessionId/owner；公开 snapshot 也包含 `sessionId/pid/status`，可用于校验。[terminal env](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/terminal/terminal-bash/src/index.ts#L56-L70)、[spawn spec](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/terminal/terminal-bash/src/index.ts#L176-L194)、[`TerminalSessionSnapshot`](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/terminal/terminal/src/types.ts#L133-L145)

**安全关闭 — Verified：** managed link 存在时，Job 使用 owner-fenced `jobs.kill` 后 bounded `jobs.wait`；Terminal 使用 exact-Agent-fenced `terminals.kill`，其 backend close 契约会终止并等待所拥有的 process tree。[jobs kill/wait](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/jobs/jobs-local/src/index.ts#L215-L227)、[terminal kill](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/terminal/terminal/src/index.ts#L278-L301)、[backend close contract](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/terminal/terminal/src/types.ts#L147-L163)

### Persistent PowerShell 的明确边界

**Verified：`tool-pwsh-persistent` 每个 Agent 只在第一次调用时 `ctx.terminals.spawn`；后续调用只对已有 terminal `startSend`/写入命令。** [lazy creation](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/shell/tool-pwsh-persistent/src/index.ts#L264-L333) 与 [命令复用](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/shell/tool-pwsh-persistent/src/index.ts#L336-L461)。

因此：

- 首次创建 persistent pwsh root 可以精确归因到创建 terminal 的 Call ID；
- 后续 Call 在同一个 pwsh 内启动的 `node`/server 不再经过 `ctx.subprocess.spawn`；仅凭 shell root 无法把这个 descendant 精确归到“后续哪一个 Call ID”；
- **Unknown/Out of current MVP guarantee：persistent terminal 后续命令级 Tool Call → descendant PID 精确归因。** 若 MVP 验收要求精确到每个后续 persistent call，A/B/C 的 root-only 方案都不充分，需要另一个 command-level process-diff/terminal foreground identity 设计；本调研不扩展该方向。

## 7. Minimal Change Set

### 生产推荐 A：Windows MVP 最小 upstream change

| 文件 | symbol | 修改内容 | 为什么需要 |
| --- | --- | --- | --- |
| `packages/subprocess/subprocess/src/types.ts` | 新 `SubprocessStarted` | 定义只读 `{kind,pid,argv,cwd}` payload，明确 `pid > 0`、真实 PID 已可用 | 给插件稳定的 provider-neutral 事实类型 |
| `packages/subprocess/subprocess/src/index.ts` | Cordis `Events` augmentation / `SubprocessRuntime` 文档 | 声明 `subprocess/started` 事件及 non-veto、failure-contained、timing contract | 当前没有可观察 PID lifecycle |
| `packages/subprocess/subprocess-local/src/index.ts` | `LocalSubprocessRuntime.spawn` / `spawnTerminal` | 在 handle 已创建并取得有效 pid 后发布 immutable event；用 `void ctx.parallel(...).catch(log)`（或等价 helper）隔离同步/异步 listener failure | Windows MVP 的实际 provider 产生点；裸 `ctx.emit` 会传播同步异常 |
| `packages/subprocess/subprocess-local/tests/*` | provider contract tests | 验证 process/terminal 各发布一次、PID/cwd/argv 正确、failed spawn 不发布、listener failure 不改变 spawn | 固化可靠性和非侵入语义 |

**Upstream-quality completeness（建议同一个 PR 做，但不是 Windows MVP 的运行时必需）：**

| 文件 | symbol | 修改内容 |
| --- | --- | --- |
| `packages/e2b/subprocess-e2b/src/process.ts` | `E2BSubprocessHandle` remote PID publication | 在 `remotePid` 真正设置后通知 runtime；不能在 `spawn()` 返回时发送 `-1` |
| `packages/e2b/subprocess-e2b/src/index.ts` | `spawn` / `spawnTerminal` | 普通过程接收 PID-ready callback；terminal 在 async allocation 返回有效 PID 后发布 |
| `packages/e2b/subprocess-e2b/tests/*` | event timing tests | 验证 delayed PID、失败不发布、terminal 发布 |

插件本身无需修改 PowerShell、sandbox、jobs 或 terminal provider。它只消费 `session/event`、`tools/execute`、`subprocess/started`，并持有自己的 registry/Windows identity reader。

### 若 core 暂不可改：C 的最小插件 change

1. 新建 `TrackedLocalSubprocessRuntime extends LocalSubprocessRuntime`；只 override `spawn`/`spawnTerminal`，先 `super`，再在目标 ALS frame 下读取 `handle.pid` 并登记。
2. 注册 `tools/execute` wrapper，`AsyncLocalStorage.run(frame, () => next())`；正确恢复嵌套/异常边界。
3. 监听 `session/event`，缓存 native `tool/call` 与 Code Mode `tool/code-dispatch-start` 的调用身份；用 `rootCallId` 回查 turn/step。
4. Bundle/profile patch 按 `id: subprocess` disable base provider，再 insert 一个不同 id 的 tracked provider；不得尝试原地改 `name`。
5. 明确禁止把这个 provider 当成可独立热卸载的普通观察插件；否则卸载会清理全部受管 subprocess。

### 必须 stock DSH：D 的最小插件 change

1. 插件注入 `subprocess`、`tools` 与 Session 来源服务，注册 `tools/execute` ALS wrapper。
2. 注册 `internal/get` waterfall listener；只代理本次 lookup 返回值的 `spawn`/`spawnTerminal`，不修改 provider target。
3. 在 wrapper 调用时读取 ALS，调用原方法后用有效 PID 登记；返回原 handle identity，所有观察异常隔离。
4. 增加 active fence 与 dispose pass-through test，证明卸载 observer 不终止或改变现有 process/terminal。
5. 启动时验证 DSH/Cordis 兼容版本和 LocalSubprocessRuntime execution world；不满足时进入明确的只读、unattributed 模式。
6. 集成测试覆盖 native pwsh foreground/background、Code Mode inner pwsh、并发 Agent、observer unload with live background process，以及安装前已存在的 pwsh executor 仍在执行时动态 lookup 被命中。
7. 用 `jobs.onJobsChanged` + ALS + 新增 JobId diff 建立 managed job link，并用 `tools/result.jobId` 交叉校验；从 terminal spawn spec.env 读取 `DSH_PTY_SESSION_ID` 建立 terminal link。

## 8. Risks / Unknowns

只列可能影响 root PID MVP 的项：

1. **Persistent PowerShell 后续命令精确归因 — Unknown / scope blocker only if required。** 后续 send 不经过 subprocess seam，不能把 descendant 精确归到后续 Call ID。MVP 应明确只承诺 one-shot `pwsh`/直接受观察 spawn，或为 persistent shell 单列“不精确”。
2. **事件 failure containment — design requirement。** Cordis `emit` 会同步调用 listener 并传播同步异常；`parallel` 会 `allSettled` 后拒绝一个 `AggregateError`。新增 started 通知应采用 `void ctx.parallel(...).catch(log)` 或等价 helper，并分别测试同步 throw 与 async reject，不能让监控插件把已成功的 spawn 变成 tool failure。
3. **Remote PID timing — verified cross-provider trap。** E2B 的 `spawn()` 返回时 PID 仍可能是 `-1`；若事件进入公共 subprocess contract，必须由每个 provider 在真实 PID 可用时发布，而不能由抽象 base 在 return point 猜测。
4. **C 的 provider ownership — verified lifecycle risk。** 采用 C 时 Port Inspector 的卸载/热替换将触发全部受管 subprocess teardown；这是真正阻止 C 成为长期默认的因素。
5. **PID reuse / unreadable process — expected degraded path。** 获取 root PID 后应立即查询 Windows creation identity；读不到时不能标 verified。权限不足是降级，不是错误关联。

### Windows ancestry 可行性检查

**Verified：不存在明显不可行因素。** DSH 现有 `windows-inspector.ts` 已经：

- 用 Toolhelp32 枚举 `(pid, parentPid)`；
- 用 `GetProcessTimes` 读取创建 identity；
- 做有 cycle guard 的 transitive descendants walk；
- `isAlive` 同时校验 `pid + started`，防 PID reuse。

证据：[`windowsProcessTree` 与 identity fencing](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/subprocess/subprocess-local/src/windows-inspector.ts#L17-L119)、[Toolhelp32/GetProcessTimes bindings](https://github.com/deepseek-ai/deepseek-harness/blob/141eb6fef83422698aef7a981029e843e8161534/packages/subprocess/subprocess-local/src/windows-inspector.ts#L264-L323)。Windows 官方契约也明确：`PROCESSENTRY32.th32ParentProcessID` 提供创建者 PID，而 `Win32_Process.ParentProcessId` 警告 PID 会被复用，应再用 `CreationDate` 等信息确认身份；`GetProcessTimes` 返回进程创建时间。[`PROCESSENTRY32`](https://learn.microsoft.com/en-us/windows/win32/api/tlhelp32/ns-tlhelp32-processentry32)、[`Win32_Process`](https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-process)、[`GetProcessTimes`](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getprocesstimes)

**Inferred：** 在 root 仍可观察、未 daemonize/escape、权限允许的 MVP 范围内，`root PID + root creation identity + ParentProcessId chain` 足以做 verified ancestry。root 已退出、PPID 被复用或中间祖先不可读时应降级；不能只凭数值 PID。另需注意这些 inspector helpers 当前是 `subprocess-local/src` 内部实现，不应把内部源码路径当作 Port Inspector 的稳定包根 API；插件应拥有自己的窄 Windows identity/scanner boundary，或另提公共化变更。

## 9. Prototype Recommendation

**结论：已经足够进入 `/to-spec`，无需先做 `/prototype`。**

理由：

1. root PID 的产生位置、丢失位置和当前插件不可见性已由实际调用链直接证明；
2. `tools/execute` 提供完整 call identity，session event 在 process creation 前提供 turn/step，Code Mode 的 root/sub-call 关系也已确定；
3. foreground、`run_in_background`、jobs owner cleanup、terminal PID 与 persistent terminal 的边界均已沿源码核验；
4. upstream A 的发布点和最小文件集合明确，C fallback 的可行性与生命周期代价也明确；
5. Windows parent/creation identity 方法已有 DSH 自身的实现与测试先例。

进入 spec 时应把以下两条写成验收条件，而不是另开 prototype：

- `subprocess/started` 对 local process/terminal **恰好发布一次，PID 有效，observer failure 不影响 spawn**；
- native pwsh、Code Mode inner pwsh、`run_in_background` 三条 integration test 都能得到正确 `{sessionId, turn, step, callId, rootCallId, rootPid, cwd}`，并明确 persistent-shell 后续 command 不属于 verified 范围。

最终决策一句话：

> **给 DSH subprocess seam 增加一个很小、非侵入、真实 PID-ready 的 started 通知；Port Inspector 用 ToolExecution ALS 与 session event 完成归因。不要只暴露 `ShellProcess.pid`，也不要重写 PowerShell provider。完全不能改 core 时，tracked `LocalSubprocessRuntime` 可作为受生命周期限制的 fallback。**
