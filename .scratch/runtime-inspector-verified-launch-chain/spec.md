# Runtime Inspector Verified launch chain：MVP 实现规格

**Status:** implemented; Stock DSH acceptance pending
**Labels:** ready-for-agent
**日期：** 2026-08-28

## Problem Statement

作为在 DSH 中启动本地开发服务的开发者，我看到的 TCP listener 往往不是自己输入命令时认知中的工具。例如 `go run` 最终由编译后的临时可执行文件监听，包管理器脚本最终可能由通用运行时进程监听，Java、Python、Rust、.NET 和未来工具也会经过各自的 launcher、脚本或编译产物。只显示最终 executable 会丢失关键上下文；为每个生态解析 manifest、环境变量或维护框架规则表，又会形成低可信、持续膨胀的识别系统。

Runtime Inspector 已经能够用 root PID、creation time 和 Windows 父进程链建立 `Verified attribution`，但当前只保留 ancestry PID 和 listener executable，没有把这条已经验证的进程链转化为用户可读的启动证据。用户需要看到 DSH Tool Call 到真实 listener 之间仍然存活的进程和命令，以便不依赖框架知识就能理解服务如何启动，同时保持 Process origin、Lifecycle owner 和处理方式的既有安全边界。

## Solution

Runtime Inspector 为已经达到 `Verified attribution` 的 listener 增加只读的 `Verified launch chain` 展示。Host 复用现有 listener-to-root ancestry，只对其中经过身份验证的 PID 批量读取 Windows 当前报告的 process name 与 command line，在查询后再次用 PID + creation time 校验进程身份，随后立即脱敏、截断并按 root-to-listener 顺序投影到现有 inventory 行。

Browser 在 listener 详情中展示“启动链（已确认）”，逐节点标记 root、intermediate 和 listener。启动链本身是 OS 事实与既有 Verified attribution 的可读投影，不是新的归因等级，不授予新的 Lifecycle owner、Managed shutdown 或 Direct external termination 权限。命令不可读、PID 身份变化、查询超时、权限不足或输出异常时，局部省略对应命令或整条启动链，现有 listener、来源状态和处理方式继续正常工作。

MVP 不读取项目 manifest、环境变量、端口约定、PE/ELF metadata，也不解析 Shell 或自动分类所有框架。已存在的工具链展示可以把 verified chain 中明确出现的已知 executable 或命令 token 作为附加 Logo 证据；未知工具直接显示真实进程名和脱敏命令，使用通用图标。这样新框架不需要预先进入规则表，用户仍可从启动链核对它的真实入口。

## User Stories

1. 作为 DSH 开发者，我希望看到从 DSH Tool Call root 到 listener 的真实进程链，以便理解最终监听进程是如何产生的。
2. 作为运行编译型开发服务的开发者，我希望同时看到 launcher 和最终二进制，以便理解为什么 listener executable 不是我输入的命令。
3. 作为运行解释型开发服务的开发者，我希望看到运行时进程的真实 command line，以便确认实际加载的模块、脚本、JAR 或程序集。
4. 作为运行包管理器脚本的开发者，我希望看到包管理器、脚本 launcher 和最终 listener 的进程节点，以便无需读取项目配置就能核对启动过程。
5. 作为使用未来新框架的开发者，我希望它即使没有专属 ToolchainId 或 Logo，也能以真实 executable 和 command line 出现在启动链中。
6. 作为使用 Go 的开发者，我希望 `go run` 的链路同时展示 `go` launcher 和最终临时 executable，以便不会把服务误认为未知独立程序。
7. 作为使用 Vite 的开发者，我希望 `npm run dev` 的链路能展示 npm launcher、Vite 命令和最终 Node listener，以便确认 Vite 确实是当前入口。
8. 作为使用 Python、Java、Rust 或 .NET 的开发者，我希望同一能力直接展示它们的 launcher、模块或应用参数，而不要求项目增加专用配置。
9. 作为使用自定义二进制的开发者，我希望系统显示它自己的真实名称和命令，而不是错误归类成某个已知框架。
10. 作为安全敏感用户，我希望只有已完成 Verified attribution 的 listener 才会读取 ancestry command line，以便不会扩大到本机所有进程。
11. 作为安全敏感用户，我希望每个进程节点都用 PID + creation time 重新验证，以便不会把 PID reuse 后的新进程命令放入旧链路。
12. 作为安全敏感用户，我希望命令在离开 Host 前已经脱敏和截断，以便 token、密码和私人路径不会泄露到 Browser。
13. 作为安全敏感用户，我希望原始 command line 不被持久化、写日志或加入搜索索引，以便减少敏感数据驻留范围。
14. 作为证据导向的用户，我希望缺失节点明确显示命令不可读取，而不是使用 manifest、端口或名称补猜。
15. 作为证据导向的用户，我希望启动链中的工具名称不会被描述成新的 Verified attribution，以便不混淆工具识别与来源归因。
16. 作为希望安全停止服务的用户，我希望启动链展示不会改变既有 Lifecycle owner 和 Managed shutdown 行为。
17. 作为处理外部 listener 的用户，我希望未归因或仅 inferred 的进程保持既有展示，不因新能力读取额外命令信息。
18. 作为 Docker Desktop 用户，我希望 Compose 基础设施继续使用 Compose 项目关联，不被错误塞入短命 `docker compose` CLI 的 DSH 启动链。
19. 作为 Runtime Inspector 用户，我希望命令行读取超时或被系统拒绝时，端口列表仍然可用，以便附加证据失败不会破坏主功能。
20. 作为 Runtime Inspector 用户，我希望详情中的链路按 root 到 listener 排序，并清楚标记两端，以便快速理解方向。
21. 作为 Runtime Inspector 用户，我希望已知工具仍可显示现有 Logo，但 Logo 只作为扫读辅助，以便视觉识别不会替代原始证据。
22. 作为插件维护者，我希望命令行查询只接受已经验证的数字 PID，并使用固定、受限的 Windows 查询，以便项目输入不能注入命令。
23. 作为插件维护者，我希望每轮查询的 PID 数量、链深、时间和输出大小都有硬上限，以便异常进程树不会拖垮 inventory。
24. 作为插件维护者，我希望 Browser 只接收简单可序列化的启动链投影，以便继续保持 Host/Browser 双半 Bundle 的安全边界。
25. 作为插件维护者，我希望确定性测试不依赖真实 CIM、PowerShell 或第三方工具链，以便 CI 和本地回归保持稳定。
26. 作为发布负责人，我希望真实 Stock DSH 验收至少覆盖 Go、Vite 和一个第三生态或自定义工具，以便证明能力来自通用进程链而不是两个特例。

## Implementation Decisions

- `Verified launch chain` 定义为现有 `Verified attribution` ancestry 的可读投影。它不创建新的 attribution confidence，不改变 Process origin，不替代 listener executable，也不成为 Lifecycle owner 或处理权限的输入。
- 复用现有 Windows listener scanner 作为唯一事实入口。scanner 在 listener-to-root ancestry 匹配完成后，收集所有 verified row 中的唯一 ancestry PID；inferred、unattributed 和没有 origin 的 row 不进入命令行查询集合。
- 新增一个可注入、Host-only 的批量 Windows process command-line reader。MVP 使用固定 PowerShell/CIM 查询 `Win32_Process` 的 ProcessId、ParentProcessId、Name 和 CommandLine；调用不经过 shell 字符串拼接，只允许由内部校验后的正整数 PID 形成输入，不接受 Browser、Workspace、命令文本或其他用户字符串。
- 一轮 inventory 最多查询 64 个唯一 PID；单条启动链最多保留 16 层；查询超时为 2 秒；原始输出最多 256 KiB；单条公开 command 最多 1,024 个字符。任一上限被触发时保守截断或省略附加证据，不能影响 TCP listener 主扫描。
- 每个命令行结果必须与原始进程快照的 PID、parent PID 和 creation time 对应。Host 在接收查询结果后重新读取 PID creation identity；身份缺失、creation time 不同、父 PID 形状冲突或进程已经退出时，不公开该节点的 command line。
- 原始 command line 仅在 Host 当前调用栈中短暂存在。进入 inventory DTO 前必须经过现有命令脱敏与长度限制；原始值不得写入 registry、日志、文件、诊断快照、搜索索引、剪贴板默认内容或 Browser 状态。
- 为避免高频 inventory 重复启动查询，允许使用一个仅存储脱敏结果的短时有界缓存，键为 PID + creation time，最多 256 项，最长 5 秒。身份变化、进程消失或缓存过期后必须重新读取；缓存不是持久化证据。
- 公开 inventory listener 行增加一个可选的、只读、可序列化 launch chain。节点只包含 PID、脱敏 executable、可选脱敏 command，以及 root/intermediate/listener 角色。链按 root-to-listener 顺序返回；缺失 command 的已验证节点仍可保留 executable 和角色。
- Browser 详情增加一个“启动链（已确认）”区块，复用现有详情面板、排版、i18n 与状态组件。列表行不增加复杂图形或额外控制；启动链不默认进入搜索、排序、固定项身份或复制摘要。
- 已有工具链展示可以从 verified chain 的完整命令 token 或 executable basename 获得附加候选，并继续使用现有 ToolchainId 和本地 Logo。匹配必须基于完整 token/basename，不使用端口、目录存在、时间接近或模糊子串。新工具没有已知 Logo 时显示真实名称或现有通用 runtime 图标；自动语义分类不是 MVP 验收条件。
- 命令行 reader 是局部可降级能力。CIM 不可用、PowerShell 不可启动、权限不足、命令为空、JSON shape 未知、超时或输出过大时，当前 listener inventory、Verified attribution、Compose 项目关联和所有 action state 保持原样，launch chain 省略或只保留已有 executable 事实。
- Docker Desktop published listener 不因为执行过 `docker compose up` 而建立 DSH launch chain。它继续依照既有 Compose 项目关联显示项目、服务、镜像和端口证据，同时保持“启动方未确认”、只读和无 Managed shutdown；不得读取或终止 Docker Desktop 代理 ancestry 来模拟 DSH 来源。
- 该能力仅适用于当前支持的 Windows local provider。它不扩展到 WSL 内部、Linux、macOS、远程主机或容器内部进程，也不新增 DSH provider 或独立服务。
- 新增领域术语和 ADR，明确 Verified launch chain 的事实来源、隐私范围、与 Verified attribution 的关系、失败降级、Docker 例外以及它不授予操作权限的边界。

## Testing Decisions

- 以 Host inventory 为最高主要测试接缝。测试注入现有 listener/process 快照、Process origins 和批量 command-line reader，断言最终公开 listener 行的 launch chain、顺序、角色、脱敏结果、工具链附加展示以及完全不变的来源状态和 action state；不测试内部函数调用顺序。
- Windows scanner 的低层测试只覆盖高层行为无法可靠证明的边界：verified ancestry PID 集合构造、64 PID 上限、16 层上限、CIM 输出验证、2 秒超时降级、256 KiB 输出上限、PID/parent/creation identity 二次校验、PID reuse、进程退出和部分 command 不可读。
- Browser 面板行为测试覆盖：verified listener 显示 root-to-listener 启动链；节点角色清晰；长命令安全截断；缺失命令使用中性文案；inferred/unattributed listener 不出现该区块；启动链不存在时既有详情布局不变化；不存在新增 action。
- 隐私测试覆盖：命令中的常见 token、密码、连接字符串和私人路径在公开 DTO 中脱敏；原始命令不进入搜索文本、复制摘要、诊断输出或持久状态；命令行 reader 只接收正整数 PID。
- 通用性 fixture 至少覆盖五种结构而不是只覆盖产品名：解释器加载模块、运行时加载脚本、运行时加载归档/程序集、编译/构建 launcher 产生原生 listener、自定义未知 executable。Go 和 Vite 作为真实 Demo 验收，不作为架构分支。
- 回归测试必须证明 launch chain 对 Process origin、Verified attribution、Lifecycle owner、Managed shutdown、Direct external termination、开发相关性和 Compose 项目关联没有影响。
- 确定性测试不启动真实 CIM 或 PowerShell，通过可注入 reader 使用受控 fixture。另设 Windows/Stock DSH 可选集成验收，运行真实 Go、Vite 和至少一个第三生态或自定义 listener，确认 UI 链路与 Windows 当前进程事实一致。
- 发布前运行主项目类型检查、完整确定性测试、打包清单检查和 whitespace 检查；Host/Browser 真实 DSH smoke 若受环境阻断，必须记录为未完成证据，不能以单元测试代替。

## Out of Scope

- 读取或解析 `package.json`、`go.mod`、`Cargo.toml`、`pyproject.toml`、Maven、Gradle、`.csproj`、Makefile、Taskfile 或其他项目 manifest。
- 收集目标进程环境变量、工作目录当前值、打开文件、模块列表、网络请求、日志、标准输入输出、PE/ELF buildinfo、签名或文件 hash。
- 根据端口号、路径存在、项目依赖、时间接近、模糊关键字或 Logo 猜测工具链。
- 执行项目脚本、展开 package scripts、解释 PowerShell/cmd/bash、执行 dependency metadata 查询或访问包 registry。
- ETW、WMI 事件订阅、长期进程历史、已退出进程恢复、跨 DSH 重启的 launch chain 持久化。
- 为所有工具自动选择“主框架”、构建开放式 detector/plugin 系统、下载 Logo、用户手动标签、规则市场或自学习 registry。
- 读取 inferred、unattributed、外部系统服务或其他用户进程的完整 command line。
- 把 Verified launch chain 当成新的 Verified attribution、Lifecycle owner、Managed shutdown 或 Direct external termination 依据。
- Docker 容器内部进程链、Docker Desktop 代理 PID 终止、将 Compose 项目关联说成由 DSH 启动，或改变 Compose listener 的只读边界。
- WSL/Linux/macOS/远程主机支持，以及 native NT API、PEB memory reader 或跨位数进程读取。

## Further Notes

- 2026-08-28 在当前 Windows Demo 上完成了只读可行性检查。8080 的实际链包含 DSH 创建的 PowerShell、`go run` launcher 和最终编译 executable；5173 的实际链包含 PowerShell、npm CLI、Vite command 和最终 Node listener。两条链使用同一个 Windows process parent/command-line 机制获得，不依赖 manifest 或端口猜测，支持本规格的通用性方向。
- `Verified launch chain` 的“已确认”只表示这些当前存活节点经过既有 root identity 和父链校验，且命令行读取后再次通过进程身份检查。它不表示命令内容语义已被 Runtime Inspector 理解，也不表示已经识别出框架类别。
- 命令行是强事实，但可能因为权限、进程退出或 Windows 管理接口不可用而缺失。MVP 优化的是精确率而不是覆盖率：缺失时省略，不使用低可信数据填补。
- PowerShell/CIM 是 MVP 的最小实现选择，而不是长期架构承诺。只有在真实 inventory 性能或兼容性证据显示其不可接受时，才重新评估 native process command-line reader。
- Docker Compose 仍是独立的展示证据链：Compose runtime 关联可以证明某个 Workspace 服务发布了宿主端口，但不能证明当前 DSH Tool Call 是其启动方。
