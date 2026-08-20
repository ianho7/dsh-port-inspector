# ADR-0002：进程终止与权限策略

- 状态：Accepted
- 日期：2026-08-21
- 适用范围：DSH Runtime Inspector Windows MVP

## Context

监听 PID 可能属于 DSH Job/Terminal 的后代，也可能是同一用户手工启动的外部进程。危险操作必须防止 PID reuse、越权、误杀进程树和 managed state 漂移。

## Decision

终止按以下优先级和边界执行：

1. 已关联 Job：调用 owner-fenced `jobs.kill`，再 bounded `jobs.wait`；
2. 已关联 Terminal：调用 exact-Agent-fenced `terminals.kill`，等待 backend process tree 收敛；
3. managed shutdown 失败或超时：报告失败，不自动或二次升级为 PID/process-tree termination；
4. 同一用户的外部进程：操作前重新扫描并匹配 PID + creation time + executable，经用户明确确认后只结束选中的单个 PID；
5. 系统进程、其他用户、受保护进程、身份不完整或 access denied：只读；
6. 不自动触发 UAC，不要求 DSH 以管理员身份运行；
7. 终止后重新扫描并明确报告端口是否释放。

Inferred attribution 不授予 managed owner 权限，仍按外部进程规则处理。

## Consequences

- DSH 受管资源的 registry 状态与真实进程树保持一致。
- managed shutdown 失败时不会发生权限或终止范围的隐式升级。
- 外部进程关闭在 Windows 上属于明确的直接终止，UI 不把它描述成 graceful managed shutdown。
- 某些端口只能观察、不能由插件关闭；这是预期的安全降级。
