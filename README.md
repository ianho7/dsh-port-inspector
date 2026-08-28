<div align="center">
  <img src="./assets/logo-candidates/A1-v4-rounded.png" alt="DSH Runtime Inspector logo" width="128" height="128">
  <h1>DSH Runtime Inspector</h1>
  <p>DSH Web 内面向 Windows 本地开发的端口来源追踪与安全处理工具。</p>
</div>

Coding Agent 启动 Vite、Next.js、Node API 或其他本地服务后，用户通常只能看到“某个端口被占用”，却不知道它来自哪个项目、哪个 DSH Session、哪次 Tool Call，也不知道应该停止 DSH 任务还是处理一个外部进程。

在来源 observer、Windows 进程身份和父进程链均可用时，Runtime Inspector 把这条关系连接起来：

```text
TCP 监听端口 → 监听 PID → Windows 父进程链 → DSH 根进程
→ Session / Tool Call → 生命周期 owner → 安全处理并确认端口释放
```

它不是通用任务管理器，也不是自动清理器；它是 DSH Web 中用于调查开发端口冲突、确认来源并安全处理目标的运行时工具。

## 为什么存在

DSH 已经通过 Job、Terminal 和 subprocess 管理受管进程，但用户仍需要一个地方回答：

- 哪些 TCP 端口正在监听；
- 监听进程属于哪个应用、PID 和项目；
- 它是否由当前 DSH 运行周期中的某次操作启动；
- 如果由 DSH 启动，应通过哪个 Job 或 Terminal 生命周期关闭；
- 如果不是 DSH 受管进程，是否可以安全地处理这个明确选中的 PID。

后台任务可以在 Turn 结束后继续运行，外部 PowerShell、第三方插件、daemonized 服务、强制退出或清理失败也可能留下用户可感知的端口占用。Runtime Inspector 填补的是 DSH 生命周期与 Windows 实际监听状态之间的观察和处理缺口，不替代 DSH 的资源管理。

## 一个真实的全栈开发场景

一名开发者让 DSH 为一个前后端分离项目增加订单状态功能。Agent 需要启动 Vite 前端、Go API，并通过 Docker Compose 启动 PostgreSQL 和 Redis。任务完成后，四个端口仍在监听，但用户无法仅凭端口判断它们来自哪个项目、哪个 Session，或者哪些服务可以安全停止。

Runtime Inspector 将这次运行拆成两类事实：Go 和 Vite 通过真实的 DSH Session、Tool Call、进程身份和父进程链建立 `verified` 来源；PostgreSQL 和 Redis 通过 Compose 文件、服务、镜像、容器和 published port 关联到当前项目，但仍保持“启动方未确认”和只读处理。这样，当前项目可以诚实地显示四个运行中的服务，同时不会把 Docker Desktop 的进程伪装成由 DSH 启动。

### DSH 任务上下文

下面的画面记录了在 DeepSeek Harness 中选择 `runtime-story` 工作区并打开 Runtime Inspector 入口的任务上下文。图中的徽标是截图时刻的已有监听数量，不作为四服务验收数字；完整运行结果见下一张图。

![DeepSeek Harness 中的 runtime-story 工作区与 Runtime Inspector 入口](<./assets/DeepSeek Harness (28.08.2026 22_33) (1).png>)

### Runtime Inspector 运行结果

在完整演示中，当前项目分组包含 Vite、PostgreSQL、Redis 和 Go 四条记录，侧边栏徽标显示 `4`。其中 Docker 服务的 Compose 项目关联已确认，但启动方仍显示为未确认；这两个状态分别表达“属于哪个项目”和“由谁启动”。

![Runtime Inspector 展示四个全栈演示服务及其来源边界](<./assets/DSH Runtime Inspector 全栈演示 — DeepSeek Harness (28.08.2026 22_33) (1).png>)

| 服务 | 启动方式 | 端口 | Runtime Inspector 中的含义 |
| --- | --- | ---: | --- |
| Vite | DSH 后台 Job 执行 `npm run dev` | 5173 | 当前项目、当前 Session、verified 来源，可停止 DSH 任务 |
| Go API | DSH 后台 Job 执行 `go run .` | 8080 | 当前项目、当前 Session、verified 来源，可停止 DSH 任务 |
| PostgreSQL | Docker Compose | 5432 | 当前项目 Compose 关联、镜像/容器证据，启动方未确认、仅可查看 |
| Redis | Docker Compose | 6379 | 当前项目 Compose 关联、镜像/容器证据，启动方未确认、仅可查看 |

完整的启动 Prompt、直接命令、脚本包装模式、取材顺序和清理步骤见 [`demo/runtime-story/DSH-DEMO-GUIDE.md`](./demo/runtime-story/DSH-DEMO-GUIDE.md)。

## 和已有方案的区别

| 方案 | 能看到或做到什么 | 缺少什么 |
| --- | --- | --- |
| `netstat` / `Get-NetTCPConnection` | 端口、地址和 PID | 不知道哪个 DSH Session 或 Tool Call 启动了进程 |
| 任务管理器 / Process Explorer | 进程信息、父子关系和结束进程 | 不理解 DSH Job / Terminal 生命周期 |
| DSH Jobs / Terminals | 管理已知的受管资源 | 不提供统一的 Windows 监听端口视图，也不覆盖外部进程 |
| Runtime Inspector | 端口、项目、来源、Session、Call、生命周期 owner 和安全处理方式 | 有意不做通用系统监控或批量清理 |

核心差异是：**从操作系统端口反查到 Agent 行为，并根据资源所有权选择正确的关闭路径。**

## 适合谁

Runtime Inspector 适合：

- 在 Windows 本地使用 DSH Web 的 Coding Agent 开发者；
- 经常让 Agent 启动本地开发服务器、API、数据库或其他开发工具的人；
- 同时运行多个项目或多个 DSH Session，需要区分同名进程的人；
- 需要解决端口冲突，但不想误杀其他服务的人。

Windows MVP 不面向 macOS/Linux、UDP、远程主机、跨重启历史、批量终止或自动治理“孤儿进程”。

## 最小使用路径

### 前置条件

- Windows；
- Node.js `>=22.19.0`；
- 可用的 `pnpm`（在 `PATH` 中，或通过 `-PnpmCliPath` 指定 `pnpm.cjs`）；
- 可运行的 Stock DSH checkout；
- 目标 DSH Profile，默认使用 `web`。

### 安装并启动

在仓库目录安装依赖，然后使用仓库脚本构建、打包并安装 Bundle：

```powershell
cd D:\project\dsh-runtime-inspector
npm install
.\scripts\reinstall-dsh-plugin.ps1 `
  -DshRepo 'D:\project\deepseek-harness' `
  -Profile web
```

脚本会安装当前版本的 `dsh-runtime-inspector`。完成后，完全退出并重新启动目标 DSH Web Profile。

正式发布到 npm 后，普通用户无需克隆源码，直接在目标 DSH Profile 中安装：

```powershell
dsh plugin --profile web add dsh-runtime-inspector@latest
# 或固定到某个版本
dsh plugin --profile web add dsh-runtime-inspector@0.1.0
```

安装后完全退出并重新启动目标 DSH Web Profile；卸载时使用 `dsh plugin --profile web remove dsh-runtime-inspector`。

### 调查端口

1. 创建一个新的 DSH Session，让 Agent 启动本地服务。
2. 在 DSH Web 侧边栏打开 **Runtime Inspector**；必要时点击“刷新”。
3. 查看端口、PID、应用、项目、创建时间、来源和处理方式。
4. 受管资源选择“停止 DSH 任务”；符合安全条件的外部进程选择“结束该进程”。
5. 确认后等待 fresh scan，检查界面报告的 `portReleased` 结果。

安装或更新 Bundle 后必须重启目标 Profile，并创建新的任务才能获得来源归因。来源记录只保留在当前 DSH 运行周期内，不会追溯归因重启前已经存在的进程。

## 产品能力

- 在 DSH Web 侧边栏打开 Runtime Inspector 面板；
- 显示 TCP 监听地址、端口、PID、应用、项目和本地化创建时间；
- 对当前 Session 中已验证且成功映射的来源显示 Session、Turn、Step、Call ID、工具和用户请求；其他来源只显示实际可用的会话摘要；
- 默认优先展示当前项目和已识别的开发环境，其他监听仍可搜索和展开；
- 将来源和处理方式分开表达：
  - 来源：`由 DSH 启动` / `启动方未确认`；
  - 处理：`停止 DSH 任务` / `结束该进程` / `仅可查看`；
- 支持搜索、排序、复制脱敏详情、打开可用的项目目录和固定显示；
- 受管 Job/Terminal 只通过 DSH 生命周期关闭；
- 外部目标只允许用户确认后，重新校验身份并结束明确选择的单个同用户 PID；
- 每次处理后重新扫描，并报告端口是否实际释放。

来源状态与处理方式不是同一个概念：推断来源不能获得 DSH 生命周期权限；来源未确认的外部进程，在身份完整且安全检查通过时，仍可能允许单 PID 处理。

## 运行机制

### 从 Agent 工具调用归因到监听端口

Runtime Inspector 在 `tool/call` 阶段缓存调用证据，由 `tools/execute` 的 AsyncLocalStorage 执行帧把它带到 `spawn` 或 `spawnTerminal`。随后，根 PID 与创建时间共同形成进程身份，Job/Terminal 提供生命周期归属，Windows 祖先链再把实际监听进程连接回这次 Agent 操作。

![Agent 工具调用到监听端口的归因工作流](./docs/assets/agent-tool-call.svg)

只有完整进程身份与祖先链均匹配时，来源才是 `verified`。非唯一线索只能得到 `inferred`，证据不足则保持 `unattributed`；观察器不会替换 subprocess provider，也不取得进程的关闭所有权。

### 用户操作如何穿过 Host 安全边界

浏览器面板只通过同源、可序列化的 RPC 请求 Host，不会接触 Windows 扫描器、进程句柄或终止原语。用户确认操作后，Host 会先重新扫描并校验当前监听记录，再根据所有权进入托管关闭或外部单 PID 处理路径。

![浏览器确认操作后的 Host RPC 与安全处理时序](./docs/assets/api-request.svg)

托管资源只调用对应的 Job/Terminal 生命周期 owner；外部目标则使用 PID、创建时间、端口等证据再次核验。无论操作成功、失败还是被拒绝，Host 都会在处理后重新扫描，并通过 `freshScan` 返回最新事实，避免界面继续展示旧状态。

### Terminal 延迟 PID 如何完成归因

部分 Stock DSH 与 Windows ConPTY 组合会先返回 `PID = 0` 的 `LocalTerminalHandle`。仅在精确版本和精确句柄形状均匹配时，兼容层才等待 PTY 发布正 PID，再通过 `processTree(PID)` 获取创建身份并补齐 `pid` 与 `rootIdentity`。

![Terminal 从 PID 为零到完成归因的异步时序](./docs/assets/async-roundtrip.svg)

原生句柄已经包含正 PID 时不会进入修复路径。句柄不受支持、Terminal 提前退出或等待超时时，能力会安全降级为 `unavailable`，不会写入未经验证的 PID，也不会据此建立 `verified` 归因。

## Agent 的只读能力

项目提供只读 `port_list` Tool，帮助 Agent 诊断端口冲突，但模型不能通过该 Tool 直接执行进程操作。

- 当前 Session 可以获得有界、脱敏后的来源信息；
- 其他 DSH Session 只显示粗粒度的占用关系，不暴露其命令、Call 或项目细节；
- 输出有行数上限并携带扫描完整性状态；
- 不读取环境变量秘密，也不返回终止回调或进程句柄。

## 安全与运行边界

- 仅支持 Windows local execution world 和 TCP listeners；
- `Verified attribution` 需要 PID、创建时间和可验证的 Windows 父进程链，不能只凭命令、目录、时间或端口号猜测；
- DSH 受管目标优先使用 Job/Terminal lifecycle；`Managed shutdown` 失败时不会自动升级为 PID 强杀；
- 外部处理只针对用户明确选择的单个同用户 PID，并在操作前重新校验 PID、创建时间、可执行文件、用户、保护级别和监听身份；
- 不终止外部进程树、不自动提权、不读取环境秘密；
- 系统进程、其他用户进程、受保护进程、身份不完整或权限不足的目标保持只读；
- DSH 版本号只用于诊断和回归记录，公开功能按实际 runtime capability 独立启用；
- 卸载插件只清理自身资源，不自动终止用户进程。

## 开发与验证

```powershell
npm install
npm run typecheck
npm test
```

`npm test` 会构建 Host 与 Browser，并运行确定性 Node 测试。需要 Stock DSH 或浏览器的真实验收门禁默认跳过。

核心 Windows MVP 已实现；确定性测试和真实 Stock DSH Web 路径已有通过记录。当前开发端口改动后的独立原生 G1–G6 fixture 因 Terminal listener readiness 仍需在环境恢复后复跑；新增 DSH、Node-PTY 版本或 Host/Browser 生命周期边界变更时，也仍需执行原生 G1–G6 release gate 和真实 Web smoke。

完整的打包、Profile 安装、DSH 端口、PowerShell 外部端口和 opt-in smoke 步骤见[测试与手工验收指南](./docs/dsh-runtime-inspector-testing.md)。

## 维护者发布

`scripts/publish-release.ps1` 将检查、构建、测试、npm tarball、npm 发布和 GitHub Release 串成一个流程。默认只检查并生成 `.tgz`，不会发布或推送：

```powershell
.\scripts\publish-release.ps1 -DryRun
```

正式发布前，先确认 `package.json` 的版本已经提交，仓库工作树干净，并准备好实际的 `LICENSE` 文件、`repository.url`、npm 登录状态和 GitHub CLI 登录状态。需要运行真实 Stock DSH 门禁时：

```powershell
.\scripts\publish-release.ps1 `
  -Version 0.1.0 `
  -DshRepo 'D:\project\deepseek-harness' `
  -RequireStockDshGates `
  -DryRun
```

确认产物后执行完整发布。`-CreateTag` 和 `-PushTag` 是显式的 Git 写操作，脚本不会自动覆盖已有 Tag：

```powershell
.\scripts\publish-release.ps1 `
  -Version 0.1.0 `
  -DshRepo 'D:\project\deepseek-harness' `
  -RequireStockDshGates `
  -Publish `
  -CreateTag `
  -PushTag
```

脚本会把同一份 tarball 发布到 npm，并作为附件上传到 `v0.1.0` GitHub Release；已有 npm 版本不会被覆盖，已有 Release 会以 `--clobber` 更新附件。需要自定义 Release 文案时传入 `-ReleaseNotesPath`。脚本不自动修改版本号、不创建提交，也不替代 GitHub Actions 的 npm Trusted Publishing 配置。

### 更新工具链 Logo

正式素材保存在 `assets/toolchains/`，`src/client/toolchain-logo-data.ts` 是生成文件，不要直接编辑。批量更新时执行：

```powershell
node scripts/download-s2-toolchain-logo-candidates.mjs
npm run normalize:toolchain-logo-candidates
# 人工替换 assets/toolchains/s2-candidates/normalized/ 下的错误 Logo
npm run sync:toolchain-logo-candidates
```

同步脚本会将候选 Logo 统一为 `64×64 PNG`，复制到正式素材目录，并重新生成 TS 导入映射。只手动替换正式素材时，执行 `npm run update:toolchain-logos` 即可重新生成映射。

## 文档

- [Windows MVP](./docs/dsh-runtime-inspector-mvp.md)
- [Implementation Spec](./docs/dsh-runtime-inspector-mvp-spec.md)
- [产品与技术决策](./docs/dsh-runtime-inspector-mvp-decisions.md)
- [术语表](./docs/dsh-runtime-inspector-glossary.md)
- [测试与手工验收指南](./docs/dsh-runtime-inspector-testing.md)
- [ADR-0001：Stock DSH 根 PID 观察](./docs/adr/0001-stock-dsh-root-pid-observation.md)
- [ADR-0002：进程终止策略](./docs/adr/0002-process-termination-policy.md)
- [ADR-0004：单仓库 Web 双半 Bundle](./docs/adr/0004-web-client-dual-face-bundle.md)
- [ADR-0005：以运行时能力代替版本总开关](./docs/adr/0005-capability-based-dsh-compatibility.md)

## Real Stock DSH Web smoke

```powershell
$env:DSH_REPO = 'D:\project\deepseek-harness'
$env:DSH_WEB_E2E = '1'
node --test tests/dsh-web-smoke.test.mjs
```

该测试启动临时 Stock DSH Web Profile，通过 Chromium 验证 Browser artifact、Slots、真实 inventory、Host bridge、一次经过身份复核的外部操作和 fresh scan 结果。
