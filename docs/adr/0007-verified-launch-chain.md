# ADR-0007：展示经身份复核的启动链

- 状态：Accepted
- 日期：2026-08-28
- 适用范围：DSH Port Inspector Windows MVP

## Context

监听器的最终 executable 经常不是开发者在 DSH Tool Call 中输入的入口：编译型 launcher 会产生临时原生程序，脚本和包管理器会再启动运行时，未来工具也可能经过多层 wrapper。Port Inspector 已经用 root PID、父进程链和 creation time 建立 Verified attribution，但只展示最终 listener executable 会丢失这条可核对的事实链。

为每个生态解析 manifest、环境变量、端口约定或维护不断增长的框架规则表，会增加低可信推断和隐私范围。MVP 需要一个更小的、可跨生态的事实投影：只读取已验证 ancestry 中当前仍存活进程的系统报告命令行。

## Decision

1. 复用现有 Windows listener-to-root ancestry。只有 `confidence = verified` 且存在 Process origin 的 listener 才进入命令行读取集合；inferred、unattributed、Compose 代理和外部进程不触发读取。
2. Host 使用固定 PowerShell/CIM `Win32_Process` 查询 `ProcessId`、`ParentProcessId`、`Name` 和 `CommandLine`。PID 先在 Host 内验证为正整数，再通过 stdin 传给固定脚本；Browser、Workspace、项目命令和用户文本不进入查询参数。
3. 查询结果在公开前核对 PID、parent PID 和原始快照，并再次读取 PID creation identity。身份变化、进程退出、权限拒绝、超时、输出超限或 JSON 形状未知时，只省略附加 command evidence，不影响 listener、Process origin、Compose 关联或 action state。
4. Host 在当前调用栈中立即使用现有脱敏逻辑处理 command，并限制单条公开 command 为 1,024 个字符。原始 command 不写入 registry、日志、诊断、文件、搜索索引、剪贴板或持久 Browser 状态。查询最多处理 64 个 PID、单链最多 16 层、超时 2 秒、输出 256 KiB。
5. 公开 inventory 行增加可选 `launchChain`，节点仅包含 PID、脱敏 executable、可选脱敏 command 和 `root`/`intermediate`/`listener` 角色，按 root-to-listener 排列。Browser 详情显示“启动链（已确认）”；缺失 command 使用中性文案。
6. 启动链不创建新的 attribution 等级，不影响 Lifecycle owner、Managed shutdown、Direct external termination、搜索、排序、固定项或复制摘要。已有工具链 Logo 可把链中的完整 command token 或 executable basename 作为附加扫读证据；未知工具保留真实名称和通用视觉，不做低可信分类。
7. Docker Desktop/Compose published listener 继续使用独立的 Compose 项目关联证据，保持“启动方未确认”和只读；不得把 `docker compose` CLI 或 Docker Desktop 代理 ancestry 伪装成 DSH launch chain。

## Consequences

- Go、Vite、Python、Java、Rust、.NET 和自定义工具共享同一 OS 事实路径，不需要为每个生态增加解析器。
- 新框架即使没有专属 ToolchainId，也能看到真实进程名和 command；代价是权限、生命周期竞态或 CIM 不可用时覆盖率下降，这是精确率优先的预期降级。
- 命令行属于敏感运行时事实，Host/Browser 边界只能传递脱敏、有界投影；MVP 不提供长期历史或跨平台实现。
- PowerShell/CIM 是当前 Windows MVP 的最小实现，不等同于未来必须保留的 native reader；只有真实性能或兼容性证据不足时才重新评估。

## Rejected alternatives

- 读取 `package.json`、`go.mod`、`pyproject.toml` 等 manifest：依赖项目约定，不能证明当前 listener 进程实际使用了该入口。
- 读取环境变量、端口或目录存在：隐私范围更大或容易形成弱推断，不能替代 PID/creation identity。
- 为每个框架维护关键字/Logo 规则表：新工具覆盖率低且会把工具识别误当成来源归因。
- 通过 Docker Desktop 代理 PID 或 Compose CLI ancestry 建立 DSH 来源：缺少 DSH root 证据且会越过 Compose 只读边界。
