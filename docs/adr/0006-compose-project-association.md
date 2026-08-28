# ADR-0006：Compose 项目关联与 Docker Desktop 代理边界

- 状态：Accepted
- 日期：2026-08-28
- 适用范围：DSH Runtime Inspector Windows MVP

## Context

Docker Desktop 发布的容器端口通常由 Docker 的 Windows 代理进程监听。该进程不是 DSH Tool Call 的 root process，不能通过 Process origin 的父链获得 Verified attribution；但用户仍需要确认它属于当前 Workspace 的嵌套 Compose 开发环境。若只按端口、镜像或项目名猜测，会把其他项目的基础设施错误归入当前项目；若完全不展示，又会丢失对真实开发栈的可解释性。

## Decision

1. 增加独立的 Compose 项目关联关系。Host 从 DSH Session/Workspace 上下文取得当前 Workspace；Browser 传入的 `currentProject` 只用于展示分组，不驱动文件枚举或 Docker 命令。关联由 Workspace 内候选 Compose 文件的有界发现、Docker Compose 只读运行时查询、服务/镜像/容器信息与同轮本地 TCP published port 的精确匹配共同建立。
2. 关联关系是展示证据，不是 Process origin、Verified attribution 或 Lifecycle owner。UI 同时显示“Compose 项目关联已确认”和“启动方未确认”，禁止使用“由 DSH 启动”描述 Compose 代理 listener。
3. 候选文件只在当前 Workspace 内递归发现，识别四种标准文件名，跳过常见依赖/生成目录并限制候选数量和深度。多个嵌套 Compose 项目可以同时关联，并以相对 Compose 路径区分。
4. Docker 查询只使用无 shell、固定参数、有界输出和超时的只读命令：先读取并检查当前 context 名称及 `docker context inspect` 返回的 Windows 本地 `npipe://` endpoint，再对后续每个 Docker 调用显式传递同一个 `--context`；自定义项目名恢复时允许同样受限的 `docker ps --filter label=...` 读取 Compose 工作目录/配置路径标签。失败、Docker 不可用或输出形状未知时，仅关闭本轮 Compose 关联，不影响 TCP 扫描、DSH 归因或其他能力。
5. 自定义 Compose 项目名只有在查询结果或 Docker 提供的配置路径/工作目录标签能明确指向候选文件时才可关联；端口、镜像名或项目名巧合不足以关联。
6. Compose 关联 listener 固定为 read-only。不得提供 Docker Compose shutdown、Docker Desktop/代理 PID 终止或容器级控制；清理由用户在项目目录执行公开的 `docker compose down` 完成。
7. 镜像引用可靠映射到已有 ToolchainId 时使用产品主 Logo，并以 Docker Compose 小徽标表示编排上下文；未知镜像使用 Docker 主 Logo。Logo 只表达识别结果，不表达来源或权限。

## Consequences

- Docker Desktop 场景可以把真实 PostgreSQL、Redis 等端口显示在当前项目中，同时保持归因和权限诚实。
- DSH 重启或 Compose 手动启动后，只要 Workspace 与运行时证据仍匹配，展示关系可以恢复；它不依赖易失的 Process origin。
- 非标准 Compose 启动和 Docker CLI 版本差异可能导致保守回退，这是防止错归属的预期代价。
- 关联查询增加 inventory 刷新的本地文件枚举和 Docker CLI 开销；必须保持有界，并可在 Host 内做短时缓存。

## Rejected alternatives

- 将 `com.docker.backend`、`docker-proxy` 或 `dockerd` 伪装为 DSH root：违反 Process origin 证据链。
- 按端口、镜像名、进程名或 Compose 项目名单独归类：无法排除多个 Workspace 的巧合。
- 全局枚举并展示所有 Docker 容器：扩大隐私范围，也无法自然确定当前 Workspace 归属。
- 让 Runtime Inspector 直接执行 `docker compose down` 或终止代理 PID：会越过现有 Lifecycle owner 和 Direct external termination 安全边界。
