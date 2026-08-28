# 02: Compose 关联的面板证据与工具链视觉

**What to build:** 在 Runtime Inspector 面板中呈现 Compose 关联的独立证据和状态：列表显示 Compose 项目关联已确认与启动方未确认，详情展示相对 Compose 路径、服务、镜像、容器 ID 和端口映射；可靠识别的 Redis/PostgreSQL 使用产品主 Logo 并附 Docker Compose 上下文徽标，未知镜像回退 Docker Logo。

**Blocked by:** 01: Host Compose 项目关联与安全投影

**Status:** resolved

- [x] Browser 只消费可序列化 Host 字段，不接触 Docker、文件系统或进程能力
- [x] 当前项目分组、搜索、排序和详情正确展示 Compose 关联字段
- [x] 两个正交状态不会把 Compose 关联表达成 DSH Verified attribution
- [x] Redis/PostgreSQL 等可靠镜像使用现有产品 Logo，Compose 使用次级上下文徽标，未知镜像使用 Docker Logo
- [x] Compose 关联 listener 不显示可执行的关闭/终止操作
- [x] 面板契约测试覆盖有、无和未知镜像关联以及既有非 Compose 行回归

## Answer

已实现于本次功能提交。列表和详情显示 Compose 关联徽标、相对文件、服务、镜像、短容器 ID 与端口映射；Host 的“启动方未确认”和 Compose 关联保持正交。Redis/PostgreSQL 等已识别镜像使用产品主 Logo，并附 Docker Compose 小徽标；未知镜像回退 Docker 主 Logo。Compose 行没有可执行停止/终止操作，Browser 只消费序列化 Host 字段。
