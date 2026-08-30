# DSH Port Inspector：DeepSeek Harness 集成机制与类图

> 状态：代码核对版
> 日期：2026-08-25
> 范围：说明 Port Inspector 作为 DeepSeek Harness 插件时实际使用的 DSH/Cordis 机制、服务契约和 Host/Browser 边界。

## 说明

本文档只描述代码和现有设计文档明确支持的关系。图中的 `Dsh*` 类型是 DSH 服务或事件契约的接口模型，不表示这些类都定义在本项目中。

图例：

- 实线：插件直接创建、调用或提供的对象。
- 虚线：事件监听、服务查找、可选能力或上游间接依赖。
- `<<internal contract>>`：Cordis/DSH 内部运行时 seam，不应描述成稳定的公开扩展 API。
- `<<optional>>`：能力不存在时，插件仍可保留其他功能，但会按能力降级。

## 1. DSH 集成点总览

| DSH 机制或组件 | 插件的实际用法 | 关系性质 |
| --- | --- | --- |
| Bundle composition | `package.json` 声明 `dsh.bundle.patch`，由 `cordis.patch.yml` 插入 `dsh-port-inspector` Bundle | 直接 |
| Cordis Context | Host 入口使用 `ctx.provide`、`ctx.get`、`ctx.on` 和 `ctx.effect` | 直接 |
| `internal/get` waterfall | 在读取 `subprocess` 时创建 non-mutating Proxy，只包装 `spawn` 和 `spawnTerminal` | 直接，内部 seam |
| `internal/service` | 监听 `subprocess`、`tools`、`webServer` 的延迟发布 | 直接，内部 seam |
| `tools/execute` | 为每个 Tool Execution 建立 AsyncLocalStorage 上下文 | 直接 |
| `tools/result` | 读取结果中的 `jobId`，与生命周期捕获结果交叉校验 | 直接 |
| `session/event` | 缓存 `tool/call` 的 Session、Turn、Step、Call ID 和 Tool 信息 | 直接 |
| `subprocess` | 观察 `spawn`、`spawnTerminal` 返回的句柄和 PID；不接管 Provider 所有权 | 直接 |
| `jobs` | 使用 `list`、`onJobsChanged`、`kill`、`wait` 关联并关闭受管后台任务 | 直接，通过 Tool Execution context 获取 |
| `terminals` | 使用 `list`、`kill` 关联并关闭受管持久终端 | 直接，通过 Tool Execution context 获取 |
| `tools.register` | 注册只读 `port_list` Tool | 直接 |
| `webServer.register` | 注册同源 Web Route，连接 Browser 和 Host | 可选 |
| `apiProxy.host.openPath` | 由 Host 打开项目目录 | 可选 |
| `dsh.client` | 声明 Web Client 入口，并注入 `@deepseek-ai/dsh-client-runtime` | 直接 |
| Client `slots` / `sessions` | 注册 Sidebar/Overlay 插槽，读取当前 Session 的展示上下文 | 直接 |

### 1.1 插件自有的兼容性 Gate

兼容性探测不是 DSH 提供的一个服务，而是插件围绕 DSH runtime contract 建立的安全边界。`src/compatibility.ts` 会检查平台、observer contract、`subprocess` provider、`spawn` 和 `spawnTerminal` 能力；`src/version.ts` 读取已安装 DSH 包版本作为诊断信息。版本号不是公共功能总开关，只有 delayed-Terminal PID 的私有 shape 修复使用精确版本和形状 gate。

因此，图中应把兼容性探测标成插件自有组件，而不是画成 `DshCompatibilityService`。

相关实现和依据：

- [package.json](../package.json)、[cordis.patch.yml](../cordis.patch.yml)
- [src/index.ts](../src/index.ts)、[src/attribution.ts](../src/attribution.ts)、[src/lifecycle.ts](../src/lifecycle.ts)
- [src/web-bridge.ts](../src/web-bridge.ts)、[src/dsh-adapters.ts](../src/dsh-adapters.ts)
- [src/client/index.ts](../src/client/index.ts)、[src/client/slots.ts](../src/client/slots.ts)、[src/client/bridge.ts](../src/client/bridge.ts)

## 2. Bundle 与 Cordis 集成类图

```mermaid
classDiagram
    class PackageManifest {
        <<DSH metadata>>
        +main: lib/index.js
        +bundlePatch: cordis.patch.yml
        +clientExport: lib/client.js
        +clientPlatform: web
    }

    class CordisCompositionPatch {
        <<Cordis composition>>
        +insertBundle(id)
    }

    class RuntimeInspectorHostEntry {
        <<plugin entry>>
        +apply(ctx)
    }

    class CordisContext {
        <<DSH/Cordis contract>>
        +provide(name, value)
        +get(name)
        +on(event, listener)
        +effect(factory)
    }

    class RuntimeInspectorService {
        <<plugin service>>
        +health
        +host
        +origins
        +listeners()
        +shutdown()
        +terminateExternal()
    }

    class DshToolRegistry {
        <<DSH service>>
        +register(definition)
    }

    class DshWebServer {
        <<optional DSH service>>
        +register(route)
    }

    class DshApiProxyHost {
        <<optional DSH capability>>
        +openPath(rpcId, path)
    }

    PackageManifest --> CordisCompositionPatch : dsh.bundle.patch
    CordisCompositionPatch --> RuntimeInspectorHostEntry : inserts Bundle
    RuntimeInspectorHostEntry --> CordisContext : apply(ctx)
    RuntimeInspectorHostEntry --> RuntimeInspectorService : provide(runtimeInspector)
    RuntimeInspectorHostEntry ..> DshToolRegistry : get / late publication
    RuntimeInspectorHostEntry ..> DshWebServer : get / late publication
    RuntimeInspectorHostEntry ..> DshApiProxyHost : apiProxy.host
```

## 3. Tool、Subprocess 与生命周期类图

```mermaid
classDiagram
    class RuntimeInspectorHostEntry {
        <<plugin>>
        +apply(ctx)
    }

    class RuntimeAttribution {
        <<plugin>>
        +observeSessionEvent()
        +runToolExecution()
        +observeToolResult()
        +decorateSubprocessService()
        +patchSubprocessProvider()
    }

    class DshEventSeams {
        <<Cordis internal contract>>
        +sessionEvent
        +toolsExecute
        +toolsResult
        +internalGet
        +internalService
    }

    class DshToolExecution {
        <<DSH payload>>
        +agent
        +session
        +callId
        +rootCallId
        +turn
        +step
        +name
    }

    class DshSubprocessService {
        <<DSH service>>
        +spawn(spec)
        +spawnTerminal(spec)
    }

    class LocalSubprocessRuntime {
        <<DSH provider; gated fallback>>
        +spawn(spec)
        +spawnTerminal(spec)
    }

    class ProcessOriginRegistry {
        <<plugin>>
        +record(origin)
        +list()
        +update()
    }

    class LifecycleOwnerRegistry {
        <<plugin>>
        +beginExecution()
        +bindingFor(originId)
        +shutdown(originId)
    }

    class DshJobService {
        <<DSH service>>
        +list(owner)
        +onJobsChanged(listener)
        +kill(id, owner)
        +wait(id, timeout)
    }

    class DshTerminalService {
        <<DSH service>>
        +list(owner)
        +kill(owner, sessionId)
    }

    class WindowsListenerScanner {
        <<plugin>>
        +scanWithStatus(origins)
    }

    class ExternalProcessTerminator {
        <<plugin>>
        +terminate(target, request)
    }

    class RuntimeInspectorHost {
        <<plugin Host boundary>>
        +inventory()
        +performAction()
    }

    LocalSubprocessRuntime ..|> DshSubprocessService
    RuntimeInspectorHostEntry --> RuntimeAttribution : creates
    RuntimeInspectorHostEntry --> LifecycleOwnerRegistry : creates
    RuntimeInspectorHostEntry --> WindowsListenerScanner : creates
    RuntimeInspectorHostEntry --> ExternalProcessTerminator : creates
    RuntimeInspectorHostEntry --> RuntimeInspectorHost : wires callbacks

    RuntimeAttribution ..> DshEventSeams : registers observers
    DshEventSeams ..> DshToolExecution : execution payload
    RuntimeAttribution ..> DshSubprocessService : internal/get Proxy
    RuntimeAttribution ..> LocalSubprocessRuntime : reversible method patch
    RuntimeAttribution --> ProcessOriginRegistry : records verified roots
    RuntimeAttribution --> LifecycleOwnerRegistry : captures lifecycle

    RuntimeAttribution ..> DshJobService : reads from agent context
    RuntimeAttribution ..> DshTerminalService : reads from agent context
    LifecycleOwnerRegistry ..> DshJobService : kill + wait
    LifecycleOwnerRegistry ..> DshTerminalService : kill

    RuntimeInspectorHost ..> ProcessOriginRegistry : visible origins
    RuntimeInspectorHost ..> WindowsListenerScanner : scan
    RuntimeInspectorHost ..> LifecycleOwnerRegistry : managed callback
    RuntimeInspectorHost ..> ExternalProcessTerminator : external callback
    ExternalProcessTerminator --> WindowsListenerScanner : re-scan
```

核心运行链路：

```text
session/event(tool/call)
    → tools/execute
    → AsyncLocalStorage Tool Context
    → subprocess.spawn / spawnTerminal
    → ProcessOriginRegistry
    → Job / Terminal owner association
    → WindowsListenerScanner
    → Host inventory / action
```

需要区分两种操作路径：

- Managed shutdown：Host → `LifecycleOwnerRegistry` → DSH `jobs.kill + wait` 或 `terminals.kill`。
- External termination：Host → `ExternalProcessTerminator` → Windows 单 PID 身份复核和终止；这不是 DSH 的生命周期 API。

## 4. DSH Browser Client 与 Host 桥接类图

```mermaid
classDiagram
    class RuntimeInspectorClientEntry {
        <<plugin Client entry>>
        +inject: slots, sessions
        +apply(ctx)
    }

    class DshClientRuntime {
        <<@deepseek-ai/dsh-client-runtime>>
    }

    class DshSlotsService {
        <<DSH Client service>>
        +inject(slot, factory)
        +register(component)
    }

    class DshSessionsService {
        <<DSH Client service>>
        +list
        +binding(sessionId)
    }

    class SidebarFooterSlot {
        <<DSH slot>>
        +sidebar.footer.action
    }

    class ShellOverlaySlot {
        <<DSH slot>>
        +shell.overlay
    }

    class RuntimeInspectorBrowserRpc {
        <<plugin Browser>>
        +inventory()
        +copyDetails()
        +openProjectDirectory()
        +performAction()
    }

    class RuntimeInspectorWebRoute {
        <<plugin same-origin route>>
        +POST inventory
        +POST copy
        +POST open-project-directory
        +POST action
    }

    class RuntimeInspectorHostRpc {
        <<serializable Host RPC>>
        +inventory()
        +copyDetails()
        +openProjectDirectory()
        +performAction()
    }

    class RuntimeInspectorHost {
        <<plugin Host>>
        +inventory()
        +performAction()
    }

    RuntimeInspectorClientEntry ..> DshClientRuntime : injected by dsh.client
    DshClientRuntime --> DshSlotsService
    DshClientRuntime --> DshSessionsService

    RuntimeInspectorClientEntry --> RuntimeInspectorBrowserRpc : creates
    RuntimeInspectorClientEntry --> SidebarFooterSlot : injects
    RuntimeInspectorClientEntry --> ShellOverlaySlot : injects
    RuntimeInspectorClientEntry ..> DshSessionsService : presentation context

    RuntimeInspectorBrowserRpc --> RuntimeInspectorWebRoute : same-origin POST
    RuntimeInspectorWebRoute --> RuntimeInspectorHostRpc : dispatches serializable data
    RuntimeInspectorHostRpc --> RuntimeInspectorHost : invokes Host boundary
```

Browser 侧只负责展示和发起序列化请求：

- 不接触 Windows Scanner、Koffi、进程句柄、Job/Terminal API 或终止原语。
- `sessions` 提供的 Session ID、标题、cwd 和 conversation 只用于展示和隐私投影。
- Browser 传入的 `currentSessionId` 不授予任何 managed 或 external action 权限。
- Host 仍然是进程状态、身份复核和操作权限的唯一决策边界。

## 5. 运行时组件关系图

这张图将 DSH 提供的服务、插件自有组件和 Browser 半放在同一张图中。`Shell` 或 PowerShell Tool 没有作为插件的直接调用者绘制；它们最终使用 `subprocess`，属于插件观察到的上游执行路径。

```mermaid
flowchart LR
    subgraph DSH["DeepSeek Harness / Cordis"]
        Context["Cordis Context"]
        Events["Event seams<br/>session/event · tools/execute · tools/result"]
        Internal["Internal service seams<br/>internal/get · internal/service"]
        Tools["tools service"]
        Subprocess["subprocess service<br/>spawn / spawnTerminal"]
        Jobs["jobs service"]
        Terminals["terminals service"]
        WebServer["webServer<br/>(optional)"]
        ApiProxy["apiProxy.host.openPath<br/>(optional)"]
        ClientRuntime["@deepseek-ai/dsh-client-runtime"]
        Slots["slots"]
        Sessions["sessions"]
    end

    subgraph Host["Port Inspector Host 半"]
        Entry["src/index.ts<br/>apply(ctx)"]
        Gate["Capability gate<br/>compatibility.ts"]
        Attribution["RuntimeAttribution"]
        Origins["ProcessOriginRegistry"]
        Lifecycle["LifecycleOwnerRegistry"]
        Scanner["WindowsListenerScanner"]
        Terminator["ExternalProcessTerminator"]
        HostRpc["RuntimeInspectorHost<br/>Host RPC boundary"]
        PortList["port_list Tool"]
        Route["Same-origin Web Route"]
        Adapters["DSH Host adapters"]
    end

    subgraph Browser["Port Inspector Browser 半"]
        ClientEntry["src/client/index.ts"]
        BrowserRpc["RuntimeInspectorBrowserRpc"]
        Ui["Sidebar entry + shell overlay"]
    end

    Context --> Entry
    Entry --> Gate
    Entry --> Attribution
    Entry --> Origins
    Entry --> Lifecycle
    Entry --> Scanner
    Entry --> Terminator
    Entry --> HostRpc

    Events -. observe .-> Attribution
    Internal -. proxy / late publication .-> Attribution
    Subprocess -. spawn handles .-> Attribution
    Attribution --> Origins
    Attribution --> Lifecycle
    Jobs -. owner APIs .-> Lifecycle
    Terminals -. owner APIs .-> Lifecycle
    Tools -. register .-> PortList
    Origins --> Scanner
    Scanner --> HostRpc
    Lifecycle --> HostRpc
    Terminator --> HostRpc

    WebServer -. register route .-> Route
    Route --> HostRpc
    ApiProxy -. open directory .-> Adapters
    Adapters --> HostRpc

    ClientRuntime --> Slots
    ClientRuntime --> Sessions
    ClientEntry --> BrowserRpc
    ClientEntry --> Ui
    Slots --> Ui
    Sessions -. presentation context .-> ClientEntry
    BrowserRpc --> Route
```

## 6. 端口来源归因时序图

这条时序展示一次 Tool Call 如何从 Session 事件变成可用于端口匹配的 Process origin。`internal/get` Proxy 和 `LocalSubprocessRuntime` fallback 是两种可选观察 seam，不代表插件同时替换两个 Provider。

```mermaid
sequenceDiagram
    autonumber
    participant Session as DSH Session
    participant Events as Cordis event seams
    participant Attribution as RuntimeAttribution
    participant Dispatcher as DSH Tool dispatcher
    participant Tool as Tool body
    participant Provider as subprocess provider
    participant Jobs as DSH jobs
    participant Terminals as DSH terminals
    participant Lifecycle as LifecycleOwnerRegistry
    participant Origins as ProcessOriginRegistry
    participant Scanner as WindowsListenerScanner
    participant Host as RuntimeInspectorHost

    Session->>Events: publish session/event(tool/call)
    Events->>Attribution: observeSessionEvent(subject, event)
    Attribution->>Attribution: cache Session, Call ID, root Call ID, Turn, Step, Tool

    Dispatcher->>Events: tools/execute(execution, next)
    Events->>Attribution: runToolExecution(execution, next)
    Attribution->>Lifecycle: beginExecution(agent, callId)
    Lifecycle->>Jobs: snapshot list(owner)
    Lifecycle->>Terminals: snapshot list(owner)

    Tool->>Events: lookup subprocess service
    alt internal/get seam is observed
        Events->>Attribution: internal/get(subprocess, next)
        Attribution->>Events: call next() for original service
        Events-->>Attribution: original subprocess service
        Attribution-->>Tool: non-mutating decorated Proxy
    else provider read bypasses internal/get
        Attribution->>Provider: reversible spawn method wrapper already installed
        Provider-->>Tool: original provider behavior retained
    end

    Tool->>Provider: spawn(spec) or spawnTerminal(spec)
    Provider-->>Attribution: subprocess handle
    Attribution->>Attribution: read PID and Windows creation identity
    Attribution->>Origins: record verified Process origin

    opt background Job is published
        Jobs-->>Lifecycle: onJobsChanged()
        Lifecycle->>Origins: associate new jobId with captured origin
    end

    opt persistent Terminal is created
        Terminals-->>Lifecycle: terminal snapshot / session identity
        Lifecycle->>Origins: associate terminalSessionId
    end

    Tool-->>Dispatcher: Tool result
    Dispatcher->>Events: tools/result(execution, value)
    Events->>Attribution: observeToolResult()
    Attribution->>Lifecycle: finish(structured jobId cross-check)

    Host->>Scanner: scanWithStatus(origins)
    Scanner->>Origins: read retained origins
    Scanner->>Scanner: match PID ancestry and creation identity
    Scanner-->>Host: listener rows and attribution status
```

## 7. 安全处理决策图

安全决策必须在 Host 侧完成。Browser 和 `port_list` 只能获得序列化结果，不能绕过以下分支。

```mermaid
flowchart TD
    Request["Host action request<br/>Browser RPC or service call"] --> Fresh{"Fresh scan complete?"}
    Fresh -- "No" --> ReadOnly["Read-only<br/>do not dispatch action"]
    Fresh -- "Yes" --> Operation{"Requested operation?"}

    Operation -- "inventory / port_list" --> Redacted["Return bounded,<br/>redacted inventory"]
    Operation -- "action" --> Stale{"Row and action still<br/>match fresh scan?"}
    Stale -- "No" --> RejectStale["Reject stale request"]
    Stale -- "Yes" --> Confirm{"Explicit confirmation?"}
    Confirm -- "No" --> RejectConfirm["No action"]
    Confirm -- "Yes" --> Managed{"Observing mode and<br/>verified lifecycle owner?"}

    Managed -- "Yes" --> ManagedShutdown["Managed shutdown through DSH<br/>Job kill + bounded wait<br/>or Terminal kill"]
    ManagedShutdown --> ManagedSettled{"Owner settled?"}
    ManagedSettled -- "No" --> ManagedFailure["Report failure<br/>never escalate to PID kill"]
    ManagedSettled -- "Yes" --> PostScan["Fresh post-action scan"]
    ManagedFailure --> PostScan

    Managed -- "No" --> ExternalFields{"PID + creation time +<br/>executable available?"}
    ExternalFields -- "No" --> ReadOnly
    ExternalFields -- "Yes" --> Revalidate["Revalidate immediately:<br/>PID, creation time, executable,<br/>user, protected/system flags,<br/>permission and canTerminate"]
    Revalidate -- "Fail" --> Blocked["Remain read-only / blocked"]
    Revalidate -- "Pass" --> ExternalKill["Terminate one selected PID only<br/>no process-tree kill"]
    ExternalKill --> PostScan

    PostScan --> Released{"Port released?"}
    Released -- "Yes" --> Success["Report success<br/>portReleased = true"]
    Released -- "No" --> StillListening["Report result<br/>listener still present"]
```

## 8. 需要在 README 中避免的关系

以下关系与当前代码不符：

```text
Browser → DshJobService
Browser → DshSubprocessService
RuntimeInspectorHost → DshShellProvider（直接调用）
RuntimeAttribution → owns subprocess provider
RuntimeInspectorHost → owns ExternalProcessTerminator
```

更准确的表述是：

- Shell、PowerShell Tool、后台任务和持久终端是插件观察到的 DSH 上游执行路径，不是插件的主要直接调用入口。
- 插件直接依赖的是 `tools/execute`、`session/event`、`subprocess`、`jobs` 和 `terminals` 等契约。
- `RuntimeInspectorHost` 接收 Scanner、origin provider 和 action callbacks，不拥有这些资源。
- `internal/get` Proxy 和 `LocalSubprocessRuntime` fallback 是兼容性观察机制，不是 Provider replacement。

## 9. 代码与文档依据

- [MVP 文档](dsh-port-inspector-mvp.md)
- [Implementation Spec](dsh-port-inspector-mvp-spec.md)
- [Root PID research](dsh-port-inspector-root-pid-research.md)
- [ADR-0001：Stock DSH root PID observation](adr/0001-stock-dsh-root-pid-observation.md)
- [ADR-0004：单仓库 DSH Web 双半 Bundle](adr/0004-web-client-dual-face-bundle.md)
- [ADR-0005：Capability-based DSH compatibility](adr/0005-capability-based-dsh-compatibility.md)
- [Bundle manifest tests](../tests/bundle-manifest.test.mjs)
- [Plugin lifecycle tests](../tests/plugin-lifecycle.test.mjs)
- [Browser slot tests](../tests/client-slots.test.mjs)
- [Stock DSH Bundle smoke test](../tests/dsh-bundle-smoke.test.mjs)
