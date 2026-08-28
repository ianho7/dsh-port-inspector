# 01: 建立身份绑定的 Windows 命令行读取接缝

**What to build:** 为 Runtime Inspector 增加一个只读、Host-only、可注入的批量进程命令行读取能力，使后续功能能够对既有 Verified attribution ancestry 中仍存活的 Windows 进程取得当前 process name 与 command line，同时严格限制查询范围并在 PID 身份变化时拒绝使用结果。该能力失败时不得影响 TCP listener、Process origin、Compose 项目关联或任何处理方式。

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] 命令行读取器只接受内部验证后的正整数 PID，并能在一次调用中批量读取多个 PID；Browser、Workspace 路径和任意命令文本不能进入查询参数。
- [x] 默认 Windows 实现使用固定、无用户字符串拼接的 PowerShell/CIM 查询，仅请求 ProcessId、ParentProcessId、Name 与 CommandLine，不读取环境变量或其他进程数据。
- [x] 单轮最多查询 64 个唯一 PID，查询在 2 秒内超时，原始输出最多接受 256 KiB；超限、超时、非零退出、无输出或异常 JSON 均安全返回无附加证据。
- [x] 每个结果在使用前与原始进程快照的 PID、parent PID 和 creation time 核对，并在查询后重新验证 PID + creation time；PID reuse、进程退出、身份不可读或父链冲突时不返回该节点的 command line。
- [x] 每条公开 command 在 Host 内立即使用现有脱敏逻辑处理并限制为最多 1,024 个字符；原始 command 不进入 registry、日志、诊断输出、文件或公开 DTO。
- [ ] 可选缓存只保存脱敏结果，以 PID + creation time 为键，最多 256 项、最长 5 秒；身份变化、进程消失或过期后不复用结果。
- [x] 读取器是可注入测试接缝；确定性测试不启动真实 PowerShell/CIM，并覆盖正常批量结果、部分缺失、读取失败、输出上限、格式错误、PID reuse 和脱敏边界。
- [x] 该能力不主动查询 inferred、unattributed 或任意系统进程；调用方未提供 verified ancestry PID 时不执行外部查询。

## Comments

- 2026-08-28：MVP 已实现。短时缓存是规格允许但本轮明确不做的性能优化；不影响强证据链和失败关闭边界。
- 2026-08-28：确定性测试覆盖固定查询的输入边界、CIM 投影解析、脱敏、64 PID 上限、读取失败和 PID/parent/creation identity 复核；真实 PowerShell/CIM 仍需在 Stock DSH 验收中复核。
