# 03: 完成跨生态 Stock DSH 验收与边界文档

**What to build:** 在真实 Windows 与 Stock DSH 中证明 Verified launch chain 来自通用进程事实而不是 Go/npm 特例，并完成发布所需的领域术语、架构决策、回归结果和人工验收记录。验收应明确哪些事实已验证、哪些节点因权限或生命周期缺失，以及 Docker Compose 为什么继续使用独立关联证据。

**Blocked by:** 02: 端到端展示 Verified launch chain.

**Status:** claimed

- [ ] 使用 DSH 直接启动 Go Demo，确认详情链中能看到 DSH root、`go run` launcher、最终编译 executable 和 8080 listener，实际 executable 不被改写成 `go.exe`。
- [ ] 使用 DSH 直接启动前端 Demo，确认详情链中能看到 DSH root、包管理器 launcher、Vite command/script 和最终 Node listener，而不读取 `package.json` 或进程环境。
- [ ] 再验证至少一种不同结构：Python 模块、Java JAR、.NET 程序、Rust launcher 或自定义未知 executable；不新增该生态的专用解析规则也能显示真实链路。
- [ ] 验证未知新工具没有专属 ToolchainId 时仍显示真实 executable 和脱敏 command，并使用中性通用视觉，不被错误归类。
- [ ] 验证 PowerShell/CIM 不可用、权限拒绝、命令为空或查询超时时，端口清单、Verified attribution、Lifecycle owner 和现有操作继续工作，仅启动链证据局部缺失。
- [ ] 验证 inferred、unattributed 和外部 listener 不读取或展示 ancestry command line。
- [ ] 验证 PostgreSQL/Redis 等 Docker Desktop listener 继续显示 Compose 项目关联与“启动方未确认”，保持只读且没有 Managed shutdown 或 Docker 代理 PID 终止能力。
- [x] 新增领域术语和 ADR，记录 Verified launch chain 的事实来源、PID 身份复核、隐私范围、失败降级、与 Verified attribution/操作权限的正交关系，以及 Docker Compose 例外。
- [x] 更新实现状态与人工验收记录，分别列明确定性测试、真实 Windows/CIM、Stock DSH、Browser UI 和仍未取得的证据，不得用 fixture 代替真实生命周期结果。
- [x] 运行类型检查、完整确定性测试、Host/Browser 构建、打包清单检查和 whitespace 检查；Stock DSH smoke 若受环境阻断，明确保留未完成 gate。

## Comments

- 2026-08-28：确定性回归、TypeScript emit/no-emit、Client build 和 `git diff --check` 已完成；Windows 真实命令读取已用只读 CIM 检查验证。
- 2026-08-28：Stock DSH Bundle smoke 被临时 Profile 缺失 `@deepseek-ai/dsh-deepseek-llm-api-extensions`、`@deepseek-ai/dsh-session-log-deepseek` 和 `@deepseek-ai/dsh-plugin-package-inventory-deepseek` 阻断；Go/Vite/第三生态的真实 UI 截图和完整 Stock DSH gate 仍待环境恢复后执行，因此本 ticket 保持 claimed。
