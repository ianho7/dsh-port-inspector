# ADR-0001：在 stock DSH 中观察 root PID

- 状态：Accepted
- 日期：2026-08-21
- 适用范围：DSH Runtime Inspector Windows MVP

## Context

MVP 必须让普通用户在未经修改的官方 DSH 上通过标准 Bundle 安装使用。当前 DSH subprocess handle 已持有 PID，但没有公开 process-started event；项目暂不向普通开发者开放 core PR。

替换 PowerShell 或 LocalSubprocessRuntime provider 会引入行为漂移或资源 ownership：provider 卸载可能终止全部受管进程，不符合“卸载观察插件不杀用户进程”。

## Decision

固定支持 `dsh-0.1.0-rc.8`，采用方案 D：

1. 在 `tools/execute` 中建立 ToolExecution AsyncLocalStorage frame；
2. 监听 Cordis typed `internal/get` waterfall；
3. 当 lookup 名称为 `subprocess` 时，在 `next()` 返回的 service 外创建 non-mutating Proxy；
4. 仅包装 `spawn`/`spawnTerminal`，调用原 bound method，保留同步异常和原 handle identity；
5. PID 有效时读取 ALS、Windows creation identity 并登记 ProcessOrigin；
6. 所有观察失败 containment；dispose active fence 使旧 Proxy 纯 pass-through；
7. 兼容性或 contract check 失败时进入只读、unattributed 模式。

标准 Bundle 安装、更新和移除允许重启一次目标 Profile。

## Consequences

- 无需修改 DSH core，也不替换或修改 subprocess provider。
- foreground、background、Code Mode 和首次 terminal 创建共享同一观察点。
- 插件卸载不会因 provider ownership 而终止进程。
- 依赖 Cordis internal contract，只对明确验证的 DSH 版本承诺支持。
- root-context lookup、`ctx.reflect.get()`、安装前缓存的 method 可能绕过；当前目标 PowerShell 生产路径逐次动态 lookup，必须由集成测试锁定。
- E2B delayed PID 不在 Windows/local MVP verified 范围内。

## Rejected alternatives

- DSH core `subprocess/started`：长期更自然，但不能作为当前交付前提。
- tracked LocalSubprocessRuntime：接管所有受管进程生命周期，卸载风险不可接受。
- tracked PowerShell Provider：复制/侵入现有执行语义，维护成本高。
- 直接 monkey-patch service：没有 Cordis stacking/ownership/CAS，HMR 与卸载恢复脆弱。
