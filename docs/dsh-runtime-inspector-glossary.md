# DSH Runtime Inspector：MVP 术语表

> 状态：随设计讨论更新
> 更新日期：2026-08-21

| 术语 | 通俗定义 | MVP 中的身份/边界 |
| --- | --- | --- |
| Stock DSH | 用户从官方渠道获得、没有私有源码补丁的 DSH | Runtime Inspector MVP 必须直接运行于此环境 |
| Tool Call | Agent 发起的一次工具调用 | 由 Session、Turn、Step、Call ID 和 Tool name 描述 |
| Root process / root PID | DSH 为一次受观察调用直接创建的第一个 OS 进程及其 PID | 进程归因链的起点；PID 必须与创建时间共同使用 |
| Process identity | 防止把复用 PID 当成原进程的身份 | 至少包含 PID + creation time；危险操作再校验 executable |
| Process origin | Tool Call 与 root process 的关联记录 | 当前 DSH 运行期内存数据，不跨重启持久化 |
| Listener process | 实际拥有 TCP listening socket 的进程 | 可能是 root 的多层后代，例如 PowerShell → npm → node |
| Verified attribution | root 身份匹配，且监听 PID 可沿 Windows 父链追溯到该 root | 可以陈述为“由这次 Tool Call 启动” |
| Inferred attribution | 只有非唯一线索支持，例如命令、目录或时间接近 | 只能辅助用户判断，不能冒充 verified 事实 |
| Unattributed | 没有足够证据关联到 DSH Tool Call | 仍可展示端口和最佳可用系统信息 |
| Lifecycle owner | 对进程拥有受管关闭语义的 DSH Job 或 Terminal | 已知时优先通过 owner 关闭，而不是直接杀一个后代 PID |
| Persistent PowerShell | 多次 Tool Call 复用的同一个 PowerShell terminal | 只保证首次 terminal 创建的 Call 级精确归因 |
| Provider | 为 `ctx.subprocess`、shell 等能力提供具体实现的 DSH 服务插件 | 替换 provider 可能改变所有消费者的资源所有权与卸载行为 |
| Subprocess observer Proxy | 方案 D 在一次 `ctx.subprocess` lookup 外临时返回的透明代理 | 只观察 `spawn`/`spawnTerminal`，不修改或替换 provider，不拥有进程资源 |
| Managed shutdown | 通过 DSH Job/Terminal owner 的公开生命周期 API 关闭资源 | Job 使用 kill + wait；Terminal kill 会等待其进程树收敛 |
| Direct external termination | 通过 Windows 系统能力结束一个经身份复核的外部 PID | 仅限同一用户、明确确认的单个 PID；不是 managed shutdown |
| Read-only degraded mode | PID 接入点或兼容性检查失败后的运行模式 | 仍可列 TCP listeners，但全部 unattributed，且不允许终止 |
| Compatibility contract | 插件声明并经过测试的精确 DSH 版本与 LocalSubprocessRuntime 环境 | MVP 基线为 `dsh-0.1.0-rc.8`；未知版本不承诺归因 |
