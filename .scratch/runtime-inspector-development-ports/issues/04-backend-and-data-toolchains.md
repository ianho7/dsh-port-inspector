# 04: 后端与数据工具链识别

**What to build:** 从 Host 确定性证据到 Browser Logo 完整支持常见后端运行时、框架和数据服务。具体框架证据不足时回退到运行时 Logo，未知服务保持通用展示。

**Blocked by:** 02: 开发环境与其他监听分流; 03: 本地 Logo 管线与 Web 工具链.

**Status:** resolved

- [x] Python、Django、Flask、Uvicorn/FastAPI、Java/Spring、.NET/Kestrel、Go、Rust、PHP 和 Ruby 具有确定性分类与合理的运行时回退。
- [x] PostgreSQL、MySQL/MariaDB、Redis 和 MongoDB 在明确 executable 或服务证据下归入开发环境。
- [x] 更具体的框架匹配优先于通用运行时；歧义不会升级成具体工具链。
- [x] 每个已支持工具链具有审核后的本地 Logo 或明确 fallback，列表和详情保持一致。
- [x] 代表性正例、歧义例、端口号-only 反例和未知 fallback 通过 Host inventory 行为测试。
- [x] 新增分类和 Logo 不改变来源状态、Session 隐私和 action kind。

实现说明：框架命令证据优先于 executable 运行时回退；数据服务只按明确进程身份识别，端口号不参与提升。三项已审核 Web Logo 之外的目录项统一走本地占位，并保留工具链文字名称。Host 聚焦测试覆盖具体框架、运行时、数据服务、歧义与端口反例。

## Answer

后端、数据服务与运行时分类已按“具体框架优先、运行时回退、未知保持其他”实现；PostgreSQL、MySQL/MariaDB、Redis、MongoDB 只在 executable 证据明确时提升。工具链 Logo 缺失时保留文字名称和本地占位。
