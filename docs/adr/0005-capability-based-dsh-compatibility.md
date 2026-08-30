# ADR-0005：以运行时能力代替 DSH 版本总开关

- 状态：Accepted
- 日期：2026-08-23
- 适用范围：DSH Port Inspector Windows MVP

## Context

最初实现只允许 `dsh-0.1.0-rc.8` 和 `dsh-0.1.1-rc.1` 进入 observing 模式。用户在 Stock DSH `0.1.1-rc.2` 上测试时，端口扫描正常，但版本白名单先于 capability probe 把全部来源和操作降级，导致 DSH 启动的 4173 端口、项目、Session、Call ID 和用户请求全部无法关联。

对 rc.1 与 rc.2 的关键构建产物比较显示 `dsh-subprocess-local`、`dsh-agent` 和 `dsh-client-runtime` 相关 artifact 保持一致；rc.2 原生 G1–G6 门禁也证明 delayed-Terminal repair 仍适用。实际失败来自本 Bundle 的版本策略，而不是已观察到的破坏性 contract 变化。版本是否进入开发者回归矩阵不应成为用户必须理解的产品状态。

## Decision

1. DSH 版本号只作为 health/诊断数据和回归记录，不作为安装或功能总开关；package manifest 不声明会拒绝后续官方版本的精确 peer range。
2. verified attribution 由当前运行时事实决定：Windows、`LocalSubprocessRuntime`、`spawn`、`spawnTerminal` 和可逆 observer contract 均存在时启用。未知或无法读取版本但 capability probe 通过时正常工作，不显示任何版本提示。
3. 每项能力独立 fail closed。来源 observer 失败时不作 DSH verified claim，但不因此关闭外部单 PID 操作；后者只依赖 Windows scanner 和执行时的 PID、creation identity、executable、same-user、protection/access 复核。
4. Managed shutdown 仍要求 verified Process origin 和精确 Job/Terminal lifecycle owner；Browser 传入的当前 Session ID只用于展示和隐私投影，不能授予 authority。
5. 依赖私有 `LocalTerminalHandle` 字段的 delayed PID repair 是唯一精确版本分支。未知版本的正 PID handle 走公开路径；PID `0` handle 跳过私有修复并保持未确认，不影响其他 listener 或 action。
6. UI 只展示用户可行动的事实。未知版本、未进入回归矩阵或私有修复被跳过都不生成提示；只有某项产品能力实际不可用时，才展示该能力的状态。

## Consequences

- Stock DSH rc.2 以及未来保持相同 runtime contract 的版本可直接工作，无需开发者先扩白名单。
- 兼容风险从“版本猜测”转为“运行时形状检查 + 执行时安全复核”；破坏性更新只会关闭受影响的局部路径。
- 精确版本列表继续服务于私有 Terminal repair 和发布回归，不再影响普通 spawn 归因、端口扫描或外部单 PID 操作。
- 真实 Stock DSH Web smoke 必须覆盖未知版本能力启用、DSH-origin listener、项目/Call 投影，以及外部 listener 的独立处理路径；当前 Session 标题和用户请求映射由基于真实 DSH Client snapshot shape 的确定性测试锁定。

## Rejected alternatives

- 继续扩大版本白名单：每个非破坏性发布都会制造不必要的用户故障，且不能证明真正的 contract 兼容。
- 对未知版本显示“未纳入回归测试”：这是开发维护信息，不帮助用户完成端口判断或处理。
- 未知版本无条件启用私有 Terminal repair：私有字段缺少稳定契约，错误写入可能改变宿主 handle 身份，必须保持精确版本与 shape 双重限制。
