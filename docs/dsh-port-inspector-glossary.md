# DSH Port Inspector：MVP 术语表

> 状态：随设计讨论更新
> 更新日期：2026-08-24

| 术语 | 通俗定义 | MVP 中的身份/边界 |
| --- | --- | --- |
| Stock DSH | 用户从官方渠道获得、没有私有源码补丁的 DSH | Port Inspector MVP 必须直接运行于此环境 |
| Tool Call | Agent 发起的一次工具调用 | 由 Session、Turn、Step、Call ID 和 Tool name 描述 |
| Root process / root PID | DSH 为一次受观察调用直接创建的第一个 OS 进程及其 PID | 进程归因链的起点；PID 必须与创建时间共同使用 |
| Process identity | 防止把复用 PID 当成原进程的身份 | 至少包含 PID + creation time；危险操作再校验 executable |
| Process origin | Tool Call 与 root process 的关联记录 | 当前 DSH 运行期内存数据，不跨重启持久化 |
| Listener process | 实际拥有 TCP listening socket 的进程 | 可能是 root 的多层后代，例如 PowerShell → npm → node |
| Verified attribution | root 身份匹配，且监听 PID 可沿 Windows 父链追溯到该 root | 可以陈述为“由这次 Tool Call 启动” |
| Verified launch chain | 已完成 Verified attribution 的 listener，其当前存活 ancestry 经过 PID、parent PID 和 creation time 复核后形成的 root-to-listener 只读投影 | 仅展示 Host 当前读取到的进程名和脱敏 command line；不是新的来源等级、Lifecycle owner 或操作权限；读取失败时保守省略 |
| Inferred attribution | 只有非唯一线索支持，例如命令、目录或时间接近 | 只能辅助用户判断，不能冒充 verified 事实 |
| Unattributed | 没有足够证据关联到 DSH Tool Call | 仍可展示端口和最佳可用系统信息 |
| 启动方状态 | 面向用户的进程启动归因摘要 | 主标签使用“由 DSH 启动 / 启动方未确认”；inferred/unattributed 作为内部证据状态和详情层区别，不把“启动方未确认”表达成“非 DSH” |
| 来源线索 | 支持 DSH 关联的非唯一证据 | 只能辅助核对，不能获得 Lifecycle owner 权限，也不能被呈现为已确认来源 |
| 处理方式 | 面向用户的当前操作能力摘要 | 使用“可由 DSH 停止 / 可结束单个进程 / 仅可查看”等产品文案；它与来源状态是两条独立维度 |
| 由 DSH 启动 | 监听器已通过完整、无歧义的 root PID、创建时间和父链身份校验 | 可以展示 DSH Session/Tool 来源，并在存在 Lifecycle owner 时使用 DSH 托管关闭；这不等于所有由 DSH 启动的进程都可直接结束 |
| 启动方未确认 | 尚未达到 verified attribution 标准的统一用户状态 | 可在详情中区分“有 DSH 线索”和“未找到可靠 DSH 关联”；不等于已证明是非 DSH |
| 来源追踪暂不可用 | observer/provider contract 实际不可用导致的面板级来源能力限制 | 必须与单行“来源未确认”区分；只影响来源判断和 DSH 托管路径，不自动关闭可独立安全复核的外部单 PID 操作 |
| Lifecycle owner | 对进程拥有受管关闭语义的 DSH Job 或 Terminal | 已知时优先通过 owner 关闭，而不是直接杀一个后代 PID |
| Persistent PowerShell | 多次 Tool Call 复用的同一个 PowerShell terminal | 只保证首次 terminal 创建的 Call 级精确归因 |
| Provider | 为 `ctx.subprocess`、shell 等能力提供具体实现的 DSH 服务插件 | 替换 provider 可能改变所有消费者的资源所有权与卸载行为 |
| Subprocess observer Proxy / local fallback | 方案 D 的两层观察入口：lookup 外的透明代理，以及 stock lookup 绕过 waterfall 时对具备所需 runtime shape 的 `LocalSubprocessRuntime` 方法的可逆包装 | 两者只观察 `spawn`/`spawnTerminal`，不替换 provider、不取得进程资源；fallback 经 descriptor preflight 后安装并以 CAS 恢复 |
| Managed shutdown | 通过 DSH Job/Terminal owner 的公开生命周期 API 关闭资源 | Job 使用 kill + wait；Terminal kill 会等待其进程树收敛 |
| Direct external termination | 通过 Windows 系统能力结束一个经身份复核的外部 PID | 仅限同一用户、明确确认的单个 PID；不是 managed shutdown |
| Read-only degraded mode | 来源 observer/provider contract 实际失败后的来源模式 | 仍可列 TCP listeners，DSH 来源不作确认；处理方式按其独立能力决定，不再等同于“所有操作禁用” |
| Compatibility contract | 当前运行时实际提供的 Windows local provider、spawn 方法、observer 和 action safety 能力 | 版本号只供开发诊断与回归记录；未知版本默认按能力启用，不向用户展示版本提示；私有 Terminal repair 仍按精确版本控制 |
| 开发相关性 | 监听器与当前项目或本机开发环境的展示关系 | 只决定 Web 列表分组和视觉优先级；与 Process origin、来源状态、Lifecycle owner 和处理方式正交，不能赋予操作权限 |
| 工具链标识 | Host 依据 executable、项目、Session 和已脱敏命令确定的开发运行时、框架或基础设施身份 | 用于选择 Browser 中的工具链名称与 Logo；证据不足时回退到通用运行时或未知标识，不使用端口号单独猜测 |
| 工具链 Logo | 帮助用户快速扫读的本地品牌视觉 | 只表达已识别的工具链，不表达 DSH 来源或可操作性；运行时不从第三方官网加载 |
