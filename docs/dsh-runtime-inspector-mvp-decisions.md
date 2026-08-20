# DSH Runtime Inspector Windows MVP：决策记录

> 状态：已收敛，可进入 `/to-spec`
> 更新日期：2026-08-21
> 依据：`dsh-runtime-inspector-mvp.md`、`dsh-runtime-inspector-root-pid-research.md`

本文只记录会改变 MVP 实现、兼容性、安全边界或验收标准的决定。尚未完成的决定明确标为“开放”，不作为实现依据。

## 已确定

### D1：必须运行于未经修改的官方 DSH

**决定：** Runtime Inspector 不得要求用户安装私有 DSH fork 或等待 upstream core change；普通用户安装插件后即可使用。

**后果：**

- `subprocess/started` 仍是理想的长期 upstream seam，但不能成为 MVP 的运行前提。
- MVP 必须在 stock DSH 已有插件 API 和运行时能力内取得 root PID。
- tracked provider 的组合、热更新与卸载行为必须重新审查，不能接受“卸载观察插件时终止用户进程”。
- 若 stock DSH 不存在满足安全边界的稳定 seam，必须明确选择兼容性、归因能力或生命周期安全之间的取舍，不能静默降级或伪造 verified attribution。

### D2：Persistent PowerShell 后续命令不承诺 Call 级精确归因

首次创建 persistent terminal 可以标为已验证。复用同一个 terminal 的后续命令不再经过 subprocess 创建 seam，因此不能把后代进程精确归到后续某个 Call ID。

### D3：归因不限于 `pwsh` 工具名

任何发生在 Tool Execution 上下文内、且通过受观察 `ctx.subprocess` 创建的 process/terminal，都可以形成 verified root origin。没有 Tool Execution 上下文的 DSH 内部进程不得编造 Call 来源。

### D4：终止遵循资源所有权

已知 DSH lifecycle owner 时，终止操作关闭对应 Job/Terminal 及其受管子进程；外部进程才按经身份复核的 PID 处理。确认界面必须说明实际影响范围。

stock DSH 的实现证据已经闭环：Job 通过 `jobs.onJobsChanged`、当前 ToolExecution ALS 与新增 JobId diff 关联，`tools/result.jobId` 交叉校验；Terminal 从 spawn spec 的 `DSH_PTY_SESSION_ID` 直接关联。关闭时 Job 使用 `jobs.kill` + bounded `jobs.wait`，Terminal 使用 `terminals.kill`。

### D5：允许终止满足安全条件的外部进程

同一用户、PID + 创建时间 + executable 复核通过的外部监听进程可以由用户确认终止。系统进程、其他用户进程、受保护进程或身份信息不足的目标保持只读。

### D6：命令只在当前运行期内存保存并统一脱敏

不持久化归因历史，不采集环境变量。command/argv 在 RPC、UI、日志和只读 Tool 输出前统一做敏感参数脱敏与长度限制。

### D7：公共 subprocess 事件若未来 upstream，应覆盖所有 provider

若未来增加公共 `subprocess/started` 契约，应由 local 与 E2B 等 provider 在真实 PID 可用时正确发布，不能定义一个只在 Windows/local 偶然有效的公共事件。此决定不改变 D1：MVP 不能依赖该 upstream change。

### D8：首版只支持一个经过完整验证的官方 DSH 版本

MVP 固定支持当前源码研究基线 `dsh-0.1.0-rc.8`。插件启动时执行兼容性检查；后续每验证一个官方版本，再显式扩大兼容范围，不承诺在未知版本上保持精确归因。

### D9：归因能力不可用时降级为明确的只读扫描模式

DSH 版本不兼容或 root PID 接入点初始化失败时，插件仍可列出 Windows TCP listeners，但必须明确显示“DSH 来源追踪不可用”，所有记录均为 unattributed。不得用时间、命令或目录猜测结果冒充 verified attribution；降级模式不开放终止操作。

### D10：stock DSH 使用 `internal/get` non-mutating Proxy 观察 subprocess

MVP 采用方案 D：注册 Cordis `internal/get` waterfall listener，在每次 `ctx.subprocess` lookup 时返回只包装 `spawn`/`spawnTerminal` 的 non-mutating Proxy，并用 ToolExecution ALS 完成来源关联。

接受该方案依赖 Cordis internal contract 的版本耦合，使用 D8 的精确版本兼容声明、启动 contract check 和 D9 的只读降级控制风险。不得修改原 service target、替换 provider 或取得 process handle ownership；dispose 后旧 Proxy 必须通过 active fence 退化为纯 pass-through。

### D11：标准安装、更新或移除后允许重启一次 DSH

“安装即用”定义为：用户不修改 DSH 源码、不维护私有 fork、不手工编辑 composition；通过标准 Bundle 安装后重启目标 Profile，插件自动启用。更新和移除同样允许在下一次 Profile 启动时生效，不要求绕过官方机制实现热安装。

### D12：inferred attribution 可以展示候选 Call，但不获得可信权限

命令、项目目录、启动时间等非唯一证据可以形成候选 Session/Call，并必须同时展示推断依据。inferred 永远不能升级为 verified，也不能据此认定 DSH lifecycle owner；终止时仍按外部进程执行完整的 PID + creation time + executable 身份复核。

### D13：managed shutdown 失败时不自动升级为 PID 终止

Job 使用 `jobs.kill` + bounded `jobs.wait`，Terminal 使用 `terminals.kill`。若受管关闭失败或超时，停止操作并报告失败；MVP 不自动、也不通过二次按钮升级为系统级 PID/process-tree termination。

### D14：外部进程只终止用户明确选择的单个 PID

对同一用户的外部进程，在 PID + creation time + executable 复核通过并获得明确确认后，可以使用 Windows 系统终止能力结束该 PID。不得扩展为整棵外部进程树；确认文案明确称为“直接结束外部进程”，不伪装成 DSH 受管关闭。

### D15：MVP 不自动请求管理员权限

扫描或终止遇到 access denied 时显示权限不足并保持只读。插件不触发 UAC，也不要求 DSH 以管理员身份运行。

### D16：模型 Tool 限制跨 Session 细节

人类 UI 可以显示完整的脱敏跨 Session 归因。`port_list` Tool 可以列出所有可见 TCP listeners；当前 Session 展示完整脱敏归因，其他 Session 只说明“由另一个 DSH Session 占用”，不向模型暴露其 command、Turn、Step 或 Call ID。

### D17：Process Origin 保留到当前 DSH 运行周期结束

root 退出时不立即删除 origin，以保留对仍存活后代 listener 的归因。记录仅驻留内存，使用 PID + creation time 防复用，并设置高水位数量上限；DSH 重启后清空，不实现跨重启历史。

### D18：直接进入 `/to-spec`，不另做独立 prototype

方案 D 已有源码链路、Cordis runtime probe、动态 lookup、dispose pass-through 与 managed owner 关联证据。端到端 tracer-bullet 将作为实现的首项验收，而不是独立 `/prototype`。

## 开放决定

无。若后续发现会改变上述产品、安全或兼容边界的新事实，应新增 ADR，而不是在实现中静默改变决定。
