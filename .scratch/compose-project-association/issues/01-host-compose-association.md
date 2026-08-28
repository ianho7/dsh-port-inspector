# 01: Host Compose 项目关联与安全投影

**What to build:** 在 Host inventory 中发现当前 Workspace 的嵌套 Compose 文件，使用受限的 Docker Compose 只读查询建立服务、镜像和 TCP published port 与真实 listener 的关联，并将可靠结果投影为当前项目基础设施；关联失败时保留现有 listener 结果与局部降级。关联结果必须保持“启动方未确认”和只读处理方式。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 有界递归发现四种 Compose 文件名并跳过生成/依赖目录，支持多个嵌套环境
- [x] 以无 shell、固定参数、有界输出和超时执行 Docker Compose 只读查询
- [x] 仅按可验证 Compose 文件/工作目录证据与 TCP published host port 精确关联；自定义项目名证据不足时回退
- [x] 将服务、镜像、容器、端口映射和相对 Compose 路径作为脱敏 Host inventory 数据返回
- [x] Compose 关联行进入 current-project，但不产生 Process origin、Lifecycle owner、Managed shutdown 或外部 PID 操作权限
- [x] Docker 不可用、查询失败、JSON 形状未知或权限不足时仅 Compose 能力降级
- [x] Host inventory 与 Compose 探针契约测试覆盖上述行为

## Answer

已实现于本次功能提交。Host 通过 Host-owned `currentWorkspace(sessionId)` 获取 Compose 探针根目录；Browser 的 `currentProject` 只参与展示。探针有界递归发现四种标准文件名，以无 shell 的 `docker compose -f <file> ps --format json` 查询运行时，验证 JSON 形状后按 TCP published port 精确关联；默认查询失败时，仅使用 Docker 返回的候选文件/工作目录标签恢复自定义项目名。关联结果只返回相对路径、服务、镜像、容器/项目标识和端口映射；Docker/JSON 失败局部降级。关联行进入 `current-project`，但 action 固定为 read-only，不产生 DSH 来源、Lifecycle owner 或终止权限。
