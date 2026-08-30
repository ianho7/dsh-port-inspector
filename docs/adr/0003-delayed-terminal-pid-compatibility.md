# ADR-0003：兼容 Windows Terminal 延迟 PID

- 状态：Accepted
- 日期：2026-08-21
- 适用范围：DSH Port Inspector Windows MVP

## Context

Stock DSH `0.1.0-rc.8`、`0.1.1-rc.1` 和 `0.1.1-rc.2` 使用的 Windows `node-pty` 会在 ConPTY connect 完成前让 `spawn()` 暂时返回 PID `0`。`LocalTerminalHandle` 构造函数立即固定公开的 `pid`，并用同一数值捕获 `rootIdentity`，因此一个随后正常工作的 Terminal 仍可能永久暴露 PID `0`，无法建立 verified Process origin 或 Terminal lifecycle owner。

PID `0` 在这里不表示子进程已经退出。[VS Code 对同一 `node-pty` 生命周期的处理](https://github.com/microsoft/vscode/blob/main/src/vs/platform/terminal/node/terminalProcess.ts)是在初始 PID 为 `0` 时等待首个 data event，再读取真实 PID。当前 DSH 主分支的 [`LocalTerminalHandle`](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/subprocess/subprocess-local/src/terminal.ts) 仍在构造时立即捕获 PID；上游修复仍是首选长期方案。

## Decision

并行保留两个交付轨道：

1. 上游轨道：推动 DSH 在 `spawnTerminal()` 返回 handle 前建立明确的 PTY readiness。实现应在 spawn 后立即订阅 data/exit，缓存早期输出；PID 已有效时直接 ready，否则在首个 data 后重读 PID。退出或有限超时先发生时明确失败。真实 PID ready 前不得用 `0` 建立 process-tree identity，并应排队 write、inspect 和 signal。Windows CI 必须原生验证 spawn、ready、PID、唯一 token roundtrip、terminate 和无残留。
2. Bundle 兼容轨道：不修改 DSH 源码，只在已认证的 Stock DSH `0.1.0-rc.8`、`0.1.1-rc.1` 和 `0.1.1-rc.2`、Windows local execution world、active capability gate 内修复已知的 `LocalTerminalHandle` 形状。

Bundle 兼容修复遵守以下边界：

- 若公开 PID 已大于 `0`，立即按 native 路径返回，不读取或修改私有字段；上游一旦修复，兼容分支自然旁路。
- PID 为 `0` 时只接受精确构造器名以及已验证的 writable `pid`/`rootIdentity`、private PTY、process inspector 和 `done` 形状。未知形状不猜测、不归因。
- 在原 handle 已有的 DSH data forwarding 之外添加独立临时 data listener，并同时有限轮询 private PTY PID。监听器不会消费数据，也不会移除 DSH 或调用方监听器。
- 真实 PID 出现后，从原 inspector 读取同 PID 且含 creation identity 的精确 root，并在返回原 handle 前修复 stale `rootIdentity` 和 `pid`。返回对象 identity 不变，不替换 provider，也不取得进程 ownership。
- exit、timeout、compatibility disable、identity 不完整或写入失败都 fail closed：spawn 的原始成功结果仍返回，但该 Terminal 不获得 verified attribution 或 termination authority。
- 修复只延迟异步 `spawnTerminal()` 的完成；argv、cwd、env、stdio、write、signal、terminate 和 unload ownership 语义不变。

## Consequences

- 当前发布不依赖 DSH 官方先合并修复，Stock DSH 原生门禁可以取得正 PID、creation identity 和 Terminal owner。
- 兼容层依赖私有 shape，因此每个新增 DSH 版本必须单独认证后才启用这一个修复。未知版本继续使用公开 runtime contract：正常正 PID handle 仍可归因，PID 为 `0` 的 delayed Terminal 仅保持未确认；不得因此让整个 Port Inspector 降级。
- 这是 ADR-0001 “观察者不改变 handle 行为”的窄例外：只修复 DSH 在 readiness 前缓存的两个过期身份字段，并保留相同 handle 与 provider。
- 上游提供公开 readiness 或正确的初始 PID 后，应删除私有 shape 分支，并保留 native 与 Windows smoke 测试作为迁移门禁。

## Rejected alternatives

- 把 PID `0` 解释为“进程已退出”：这会固化错误语义并拒绝随后正常工作的 ConPTY。
- 永久锁定 `node-pty@1.1.0`：可作为 DSH 的短期 rc 热修，但 Bundle 不能可靠改写宿主依赖树，也不能作为长期兼容策略。
- 替换 `LocalSubprocessRuntime` 或 Terminal provider：会改变 DSH 行为和资源 ownership，不符合卸载安全边界。
- 仅在扫描阶段猜测 Terminal 子进程：缺少可信 root creation identity，无法安全授予 verified attribution 或 managed shutdown。
