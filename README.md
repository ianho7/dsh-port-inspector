# DSH Runtime Inspector

> DSH Web 内面向 Windows 本地开发的端口来源追踪与安全处理工具。

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
