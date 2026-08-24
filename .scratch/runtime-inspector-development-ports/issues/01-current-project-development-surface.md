# 01: 当前项目开发端口主路径

**What to build:** 让当前 DSH Session 或当前项目中明确关联的监听器进入“当前项目”分组，并以“开发端口”为面板主任务展示。选中行采用已批准的安静指示线样式，同时建立 Host 到 Browser 的有界开发相关性展示契约，且不改变来源状态或处理方式。

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] 当前 Session/项目的确定性监听器通过 Host inventory 展示契约归入 `current-project`，并带有可展示的识别依据。
- [x] Browser 默认显示“开发端口”标题、开发端口数量和“当前项目”分组。
- [x] 选中行移除完整蓝色描边，使用浅中性背景、左侧三像素强调线、强调色端口和独立的 focus-visible 状态。
- [x] 开发相关性不改变 Process origin、来源状态、Lifecycle owner 或 action kind。
- [x] 工具链 Logo 与 executable 图标的文档语义完成协调。
- [x] Host inventory 行为测试、Client 面板测试、构建和类型检查通过。

## Comments

- 2026-08-24: Added the additive Host development presentation contract, current Session/project projection, initial Vite/Next.js/Node.js toolchain recognition, current-project Browser grouping, preferred current-project selection, and the approved calm selected-row styling. Host and Client builds pass; focused Host inventory, Client panel, Browser bridge, and Web bridge suites pass 18/18.

## Answer

当前项目分组、安静选中态和 Host/Browser 有界展示契约已实现；开发相关性不改变来源、生命周期 owner 或 action kind。Host/Client 构建、类型检查、聚焦测试和真实 Web smoke 已通过。
