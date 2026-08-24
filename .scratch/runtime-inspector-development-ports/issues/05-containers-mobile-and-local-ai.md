# 05: 容器、移动开发与本地 AI

**What to build:** 让 Docker、WSL、Metro/React Native、ADB、Firebase Emulator 和 Ollama 在具有确定性证据时进入开发环境并展示本地 Logo，同时避免根据代理进程或端口猜测底层服务。

**Blocked by:** 02: 开发环境与其他监听分流; 03: 本地 Logo 管线与 Web 工具链.

**Status:** resolved

- [x] Docker 和 WSL 只有在存在明确映射证据时展示底层工具链；否则展示容器/子系统身份或归入其他监听。
- [x] Metro/React Native、ADB、Firebase Emulator 和 Ollama 使用明确 executable、命令或项目证据分类。
- [x] 常见端口只作为已建立分类的辅助信息，不能独立产生工具链身份。
- [x] 每个已支持工具链具有审核后的本地 Logo 或明确 fallback。
- [x] WSL/Docker 代理反例、移动工具链正例、本地 AI 正例和未知回退通过 Host inventory 行为测试。
- [x] Browser 仍不获得容器、WSL 或 Windows 原生查询能力。

实现说明：只识别明确的 Docker/WSL 进程身份，不猜测代理背后的具体服务；Metro、Firebase 使用命令证据，ADB、Ollama 使用 executable 证据。Browser 只消费 Host 的序列化展示字段。聚焦测试覆盖正例、代理/端口反例与权限正交性。

## Answer

Docker、WSL、Metro/React Native、ADB、Firebase Emulator 和 Ollama 已按明确 executable/命令证据识别；代理进程和端口号不能推断底层服务。Browser 没有获得容器、WSL 或 Windows 查询能力。
