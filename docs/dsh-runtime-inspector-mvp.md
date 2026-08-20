# DSH Runtime Inspector：Windows 第一版 MVP

> 状态：选题与实现边界已收敛，尚未进入开发。首发平台确定为 Windows。

## 一句话定位

在 DSH Web 中找出占用开发端口的进程，并回答它是否由 DSH 启动、由哪个会话、哪一轮、哪次工具调用启动，最后允许用户安全关闭一个明确选中的进程。

建议产品名为 **DSH Runtime Inspector**，中文可称“DSH 服务坞”或“Agent 服务管家”。它不是通用任务管理器，而是面向 Coding Agent 开发场景的运行时检查和来源追踪工具。

## 要解决的问题

Coding Agent 经常启动 Vite、Next.js、API Server 等后台服务。任务或对话结束后，用户可能看到多个同名 `node` 进程占用端口，却很难快速回答：

- 哪些 TCP 端口正在监听；
- 端口属于哪个应用、PID 和项目；
- 这个进程是否由 DSH 启动；
- 如果由 DSH 启动，它来自哪个 Session、Turn、Step 和 Tool Call；
- 应通过 DSH 的生命周期能力关闭，还是按外部进程处理。

其中，**“端口 → DSH 会话来源”是本插件区别于普通端口查看器的核心价值**。

## DSH 是否会遗留后台服务

DSH 正常托管的后台进程比一般命令行 Agent 更不容易成为“无人认领的野进程”：

- `run_in_background: true` 创建的任务进入 `ctx.jobs`，拥有 job id、owner 和清理路径；
- 持久终端进入 `ctx.terminals`，按 Agent 隔离；
- `ctx.subprocess` 管理进程树、信号发送与退出等待；
- Agent scope 或相关服务销毁时会执行受管资源清理。

但以下情况仍会造成用户可感知的端口占用：

1. Turn 已结束，但 Agent 仍存活，后台服务按设计继续运行；
2. Agent 完成任务后忘记调用 `job_kill` 或关闭终端；
3. 命令通过 daemonize 等方式逃逸托管；
4. 第三方插件绕过 DSH 生命周期直接创建进程；
5. DSH 被强制终止、系统崩溃或清理失败。

因此产品定位应是：

> 统一观察 DSH 受管任务与 Windows 系统监听端口，追踪端口的 Agent 来源，并发现无法被 DSH 归因的进程。

## MVP 核心目标

第一版验证两个连在一起的闭环：

```text
端口占用
→ 监听进程 PID
→ Windows 父子进程链
→ DSH 启动根进程
→ Session / Turn / Step / Tool Call
→ 用户确认终止
→ 再次扫描并确认端口释放
```

核心目标不是“显示尽可能多的系统信息”，而是可靠回答：

> 这个开发端口是谁启动的？它和我刚才的哪次 DSH 操作有关？我能否安全地关闭它？

## MVP 范围

### 必须实现

| 能力 | 第一版要求 |
| --- | --- |
| Windows TCP 监听扫描 | 列出地址、端口、PID、应用名、创建时间与可执行文件 |
| 项目来源展示 | 优先使用 DSH 已知工作目录；外部进程仅展示最佳可用信息 |
| DSH 来源追踪 | 展示 Session、Turn、Step、Call ID、工具名和启动命令 |
| 归因置信度 | 每条记录明确标记“已验证 / 推断 / 未归因” |
| 搜索和排序 | 支持按端口、应用、PID、项目、会话搜索 |
| 打开目录和复制信息 | 提供高频、低风险操作 |
| 单进程终止 | 用户确认后终止一个明确选中的目标 |
| 终止前身份复核 | 同时校验 PID、进程创建时间和可执行文件，防止 PID 复用误杀 |
| 终止后复查 | 重新扫描并明确反馈端口是否释放 |
| 只读 `port_list` Tool | 允许 Agent 诊断端口冲突，不允许模型直接终止进程 |
| 可逆插件生命周期 | 卸载时撤销 Tool、RPC、UI、事件监听和刷新任务 |

### 第一版归因承诺

MVP 只对以下范围承诺“已验证”归因：

- 当前 DSH 运行周期内启动；
- 经插件能够观察并记录根 PID 的 PowerShell / subprocess 启动链创建；
- 能从监听 PID 沿 Windows 父进程链追溯到该根 PID；
- 根 PID 与进程创建时间均匹配，排除 PID 复用。

以下情况不承诺精确归因：

- DSH 重启之前启动、重启后仍存活的进程；
- daemonize 后脱离原父进程链的服务；
- 第三方插件直接创建且未上报的进程；
- 权限不足，无法读取父进程或创建时间；
- 系统服务、其他用户会话和受保护进程。

这些记录必须显示为“推断”或“未归因”，不能伪装为确定事实。

### 第一版明确不做

| 排除项 | 原因 |
| --- | --- |
| UDP | TCP 已覆盖大多数开发服务器，可缩小 Windows API 与测试范围 |
| macOS / Linux | 首版专注验证 Windows 体验与来源追踪 |
| 自动清理 | 来源判断尚未覆盖全部逃逸场景 |
| 多选批量终止 | 增加误操作风险，单进程足以验证闭环 |
| managed shutdown 失败后的强制升级入口 | 第一版优先受管关闭和安全失败；外部进程的单 PID 直接结束是另一条明确确认、严格身份复核的路径 |
| 读取任意进程环境变量 | Windows 下涉及权限、位数和底层进程内存访问，不适合作为 MVP 主路径 |
| 跨 DSH 重启的归因历史 | 需要持久化事件设计和启动时校验，推迟到后续版本 |
| “孤儿进程”自动判定 | 没有活动不代表进程已无用途 |
| 历史统计与图表 | 当前状态和操作闭环足以验证价值 |

## Windows 平台实现要点

Windows 可通过 `Get-NetTCPConnection` 或对应系统 API 获得监听地址、端口和 `OwningProcess`。再通过 `Win32_Process` 获取 PID、父 PID、创建时间、可执行路径和命令行。

主要限制是：

- `Win32_Process` 没有稳定的公开 cwd 字段，外部进程项目目录只能推测；
- SYSTEM、受保护进程和其他用户进程可能无法读取完整信息；
- 终止父进程不一定终止全部子进程；
- `Stop-Process` 可能需要管理员权限；
- PID 会复用，因此任何危险操作都不能只依赖 PID。

第一版应优先利用 DSH 启动时已知的 `workdir` 来展示可靠项目目录；对于外部进程，则显示可执行路径、命令行推断结果或“未知”。

## 会话与轮次归因设计

### 可利用的 DSH 信息

DSH 在 Shell 执行环境中注入 `DSH_SESSION_ID` 等信息；Tool Execution 同时具有 `callId`、工具名、参数和所属 Agent。Session append-only events 可提供 Turn、Step 与 Tool Call 的关系。

但仅知道 Session ID 仍不够。真正需要补齐的是：

```text
Tool Call → 启动根 PID → 后代监听 PID → TCP 端口
```

### 推荐实现：在进程创建时记录根 PID

插件在 DSH 创建 PowerShell / subprocess 时取得根 PID，并保存一条当前运行周期内的来源记录：

```ts
interface ProcessOrigin {
  rootPid: number
  processCreatedAt: number
  sessionId: string
  turn: number
  step: number
  callId: string
  rootCallId: string
  tool: string
  command?: string
  argv: readonly string[]
  workdir: string
  startedAt: number
  jobId?: string
  terminalSessionId?: string
}
```

扫描到监听 PID 后，沿 `ParentProcessId` 向上查找。如果祖先命中 `rootPid`，且创建时间一致，则将该端口标记为“已验证”。

### 工程路线

| 路线 | 做法 | 评价 |
| --- | --- | --- |
| A：为 DSH 补充通用 subprocess started 事件 | provider 在真实 PID ready 时发布只读通知 | 长期最自然，但 DSH 暂不接受普通开发者 PR，不能作为 MVP 前提 |
| **D：Cordis `internal/get` observer Proxy** | 在固定 stock DSH 版本中，为每次 `ctx.subprocess` lookup 返回只包装 `spawn`/`spawnTerminal` 的透明 Proxy | **MVP 推荐**。不修改 core、不替换 provider、不取得资源 ownership；依赖 internal contract，因此必须锁定兼容版本并自检 |
| C：tracked LocalSubprocessRuntime Provider | disable 原 subprocess provider，再安装继承版 provider | 能取 PID，但插件卸载/替换会清理全部受管进程，不符合可逆生命周期 |
| B：tracked PowerShell Provider | 重写或替换 PowerShell Provider | 侵入深，容易偏离 sandbox、timeout、background 和 cancellation 语义 |

首版必须运行于未经修改的官方 DSH，因此采用 D。A 保留为未来官方 extension point 建议，不阻塞 MVP；B/C 不作为生产 fallback。

### 不推荐作为主路径的方法

| 方法 | 问题 |
| --- | --- |
| 执行前后扫描进程并按时间猜测 | 并发运行时容易错配，只能标记为“推断” |
| 读取其他进程的 `DSH_SESSION_ID` | Windows 下通常需要读取目标进程 PEB / 环境块，受权限与 32/64 位兼容影响 |
| 仅凭命令行、目录或端口号匹配 | 这些字段都不具备唯一性，不能作为安全终止依据 |

## 预计使用的 DSH 特性

| DSH 特性 | 第一版用途 |
| --- | --- |
| `cordis.yml` / Bundle | 安装、启用和配置插件 |
| `apply(ctx)` | Host 与 Client 插件入口 |
| `inject` | 声明 Tool、RPC、UI、Session 等依赖 |
| Service seam / Provider | 隔离 Windows 端口扫描、进程追踪和终止能力 |
| `ctx.subprocess` | 由官方 provider 创建并管理进程树；插件只透明观察返回 handle 的 root PID |
| Cordis `internal/get` waterfall | 在不修改 provider 的前提下透明观察 `ctx.subprocess.spawn/spawnTerminal`；仅对锁定版本使用 |
| Tool Execution | 取得 Call ID、工具名、参数和所属 Agent |
| Session events | 建立 Session、Turn、Step 与 Tool Call 的关系 |
| `ctx.jobs` / `ctx.terminals` | 识别受管后台任务，并优先走 DSH 生命周期关闭 |
| `ctx.tools` | 注册只读 `port_list` Tool |
| Host RPC / Typert Gateway | 将可信宿主进程信息提供给浏览器 UI |
| UI slot | 在 DSH Web 中挂载端口表格 |
| Config schema | 配置刷新周期和常用端口 |
| `ctx.effect()` | 清理刷新器、事件监听和进程追踪资源 |
| 工具 waterfall | 后续为模型发起的终止操作实现 allow / ask / deny |

这组能力覆盖了 DSH 的配置组合、插件生命周期、依赖注入、Service / Provider、Tool、Session、Agent Loop 数据、subprocess、Job、RPC 和 Web UI，是一个适合教学的纵向切片。

## 最小架构

```text
DSH Tool Execution / Session events
             ↓
      Process origin registry
       Session / Turn / Call
             ↕
Windows TCP scanner → PID / parent chain
             ↓
      PortInspector Service
        ├── port_list Tool（只读）
        └── Host RPC → Web UI
                         ↓
                 人工确认并终止
```

建议的最小契约：

```ts
interface PortInspector {
  list(): Promise<Listener[]>
  terminate(target: ProcessIdentity): Promise<TerminateResult>
}

interface ProcessIdentity {
  pid: number
  startedAt: number
  executable?: string
}

type AttributionConfidence = 'verified' | 'inferred' | 'unattributed'
```

## 安全规则

1. 默认只读，终止只能由用户从 UI 明确发起；
2. 终止前展示 PID、应用、项目、端口和 DSH 来源；
3. 操作前重新扫描并校验 PID、创建时间和可执行文件；
4. 禁止终止 DSH 自身和明确识别出的关键父进程；
5. 系统服务、其他用户进程和信息不足的目标默认只读；
6. DSH 受管任务优先调用 Job 或 Terminal 生命周期 API；失败时报告，不自动升级为 PID 强杀；
7. “推断”和“未归因”必须在 UI 中明显展示；
8. 插件卸载只清理自身资源，不自动终止用户进程。
9. 同一用户的外部进程只有在 PID、创建时间、executable 复核通过并由用户明确确认后，才可直接结束选中的单个 PID；不扩展到整棵外部进程树。
10. 不自动请求管理员权限；access denied 时降级为只读。

## 实现难度与工作量

| 工作项 | 难度 | 粗略工作量 |
| --- | --- | --- |
| Windows TCP 扫描与进程信息 | 中 | 1–2 天 |
| DSH Host Service、Tool 与 RPC | 中 | 1–2 天 |
| Web 表格、搜索、排序和操作反馈 | 中 | 2–3 天 |
| 单进程安全终止与释放验证 | 中到高 | 1–2 天 |
| Session / Turn / Call 来源采集 | 高 | 2–3 天 |
| PID 父链匹配、置信度与异常处理 | 高 | 2–3 天 |
| Windows 精确归因完整 MVP | 中高 | 熟悉 DSH 约 8–12 天；新手约 2–3 周 |

最大风险不是列端口或制作 UI，而是稳定取得 DSH 启动根 PID，并在 Windows 进程树中建立可验证的来源链。

## MVP 验收标准

1. 在两个不同 DSH Session 中分别启动同名 Node 开发服务；
2. UI 能按端口区分两个进程，并显示正确项目目录；
3. 两条记录分别显示正确的 Session、Turn 和 Call ID；
4. 来源链完整时显示“已验证”，不得只靠命令或时间猜测；
5. 手工从 DSH 外启动的服务显示“未归因”；
6. 无法读取完整信息时仍能列出端口，并显示“权限不足”或“未知”；
7. 终止其中一个测试进程后，另一个不受影响；
8. 终止前若发现 PID 创建时间变化，拒绝执行并提示目标已变化；
9. 重新扫描后，对应端口消失，并明确显示释放结果；
10. DSH 自身、受保护进程和其他用户进程不能被误终止；
11. 卸载插件后，Tool、RPC、UI、事件监听和刷新任务全部撤销，外部进程不被自动关闭。

## MVP 决策摘要

- **首发平台**：仅 Windows。
- **核心问题**：用户不仅不知道哪个进程占用端口，也不知道它来自哪次 Agent 操作。
- **核心差异**：从系统端口追溯到 DSH Session、Turn、Step 和 Tool Call。
- **第一版闭环**：发现 → 归因 → 人工确认 → 安全终止 → 验证释放。
- **精确归因边界**：当前 DSH 运行周期、受观察的 PowerShell / subprocess 启动链。
- **事实表达**：所有归因都标记为“已验证 / 推断 / 未归因”。
- **推荐技术路线**：固定支持 `dsh-0.1.0-rc.8`，用 Cordis `internal/get` non-mutating Proxy 观察 subprocess 创建，配合 ToolExecution ALS 与 Session events；兼容检查失败时进入只读未归因模式。
- **安装语义**：标准 Bundle 安装、更新或移除后允许重启一次目标 DSH Profile；用户不修改源码或 composition。
- **受管关闭**：Job 通过 `jobs.kill + wait`，Terminal 通过 `terminals.kill`；失败不自动补杀。
- **外部关闭**：仅结束身份复核通过、用户明确选择的单个同用户 PID；不自动提权。
- **来源保留**：只在当前 DSH 运行周期内存保留，root 退出不立即删除，重启后清空。
- **暂不承担**：UDP、跨平台、批量终止、自动治理和跨重启历史。
- **最重要的验证信号**：用户无需打开终端，就能知道一个端口由哪次 DSH 操作启动，并安全关闭它。

## 开发前决策状态

关键决策已经收敛：root PID 使用方案 D；persistent PowerShell 后续 command 不承诺 Call 级 verified attribution；模型 Tool 隐藏其他 Session 的详细轨迹；不兼容时只读降级；不另做独立 prototype。

可以进入 `/to-spec`。首个实现 tracer-bullet 必须端到端验证 native pwsh foreground/background、Code Mode、并发 Agent、Job/Terminal owner 关联，以及 observer 卸载不终止已有进程。
