# 03: Compose 关联边界 ADR、真实 Docker Desktop 验收与 Demo 证据

**What to build:** 固化 Compose 项目关联的证据等级、Docker Desktop 代理限制、权限边界和降级策略，并在真实 Windows 环境完成嵌套 Compose、多服务端口、DSH 重启式恢复、自定义项目名保守回退、Docker 不可用降级与清理后的端口释放验收；更新 Demo 使用说明和证据记录。

**Blocked by:** 01: Host Compose 项目关联与安全投影; 02: Compose 关联的面板证据与工具链视觉

**Status:** ready-for-agent

- [x] 新 ADR 与术语说明明确 Compose 项目关联不等同于 Process origin、Verified attribution 或 Lifecycle owner
- [x] 记录 Docker Desktop 代理 listener 的“启动方未确认”和只读边界
- [x] 真实 Compose 服务的镜像、容器和端口证据已由 Host inventory 只读探针核对（面板截图仍待采集）
- [ ] DSH 重启或手动启动后可由 Workspace/Compose 运行时证据恢复关联
- [ ] 非标准项目名只有可验证文件/工作目录证据才关联，否则回退
- [ ] Docker Desktop 不可用时不影响既有扫描和其他来源能力
- [ ] `docker compose down` 后关联端口释放，并完成类型检查、确定性测试、打包清单和 diff 检查

## 最新验收记录

2026-08-28 在 Docker Desktop Engine `29.2.1` 已运行的 Windows 主机上执行了只读 Host inventory 探针。当前 Demo Compose 容器已运行约 4 小时，因此 `start.ps1 infrastructure` 按端口保护策略拒绝重复启动；没有重启或停止已有容器。探针返回 `status=available`，并将 `5432` 精确关联到 `compose.yaml / postgres / postgres:17-alpine`（容器 `b92f907a7071`），将 `6379` 精确关联到 `compose.yaml / redis / redis:7-alpine`（容器 `97a15da51a24`）。两行的 listener owner 都是 `com.docker.backend.exe`，来源为未归属，处理方式为只读。

仍待在真实 DSH Web 面板中完成截图、DSH 重启/手动启动恢复、非标准项目名实机回退，以及执行 `docker compose down` 后重新扫描端口释放。
