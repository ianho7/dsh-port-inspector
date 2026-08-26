# 03: 本地 Logo 管线与 Web 工具链

**What to build:** 建立受控的官方 Logo 素材管线，并让 Vite、Next.js 和 Node.js 在真实 Runtime Inspector 列表与详情中展示本地 Logo。素材在维护阶段生成进 Client artifact，面板运行时不联系第三方网站。

**Blocked by:** 01: 当前项目开发端口主路径.

**Status:** resolved

- [x] 审核后的 Logo 素材保存在本地，清单只保留获取缺失素材所需的工具链 ID 和 URL。
- [x] 更新器只访问清单中的 HTTPS URL，并限制 MIME、文件大小和 SVG 活性内容；测试不依赖公共互联网。
- [x] Vite、Next.js 和 Node.js 使用本地审核素材，未知或无效素材显示通用本地 fallback。
- [x] 列表使用紧凑 Logo，详情使用较大 Logo；相邻文本已命名工具链时图片不重复朗读。
- [x] 生成产物随现有 Browser Client artifact 发布，不增加独立静态服务器。
- [x] 构建产物不包含运行时工具链官网请求，离线加载测试通过。

实现说明：新增官方来源清单、受限更新器和生成式本地数据模块。Vite、Next.js、Node.js 使用官网审核素材；运行时 UI 不发起第三方请求。严格类型检查、Logo 管线测试、Host/Client 聚焦测试及 Browser 构建均通过，并确认构建产物无官网 URL。

## Answer

Logo 管线已落地：审核后的官方素材保存在 `assets/toolchains/`，简洁 URL 清单只用于补齐缺失文件，生成后进入现有 Client artifact；运行时不请求官网。未知工具链使用本地 fallback。
