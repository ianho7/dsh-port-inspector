# ADR-0008：同仓库独立静态官网

- 状态：Accepted
- 日期：2026-08-30
- 适用范围：DSH Port Inspector 官方产品官网

## Context

DSH Port Inspector 的运行时代码和 Browser Client 已经按单仓库 Bundle 维护。项目现在需要一个面向用户的官方介绍页，包含中英文国际化、安装入口、产品特性、安全边界和 SEO。官网不应改变插件 Bundle 的运行时边界，也不应被打包进 npm 插件。

## Decision

在仓库根目录新增 `website/`，作为独立的 Astro 静态站点：

1. 官网使用独立 `package.json`，精确锁定 `astro@7.2.9`。
2. 官网与插件共享同一个 Git 仓库，但拥有独立的依赖、源码、构建输出和部署流程。
3. 官网输出部署至 Cloudflare Pages；正式域名通过 `PUBLIC_SITE_URL` 配置，以便日后替换域名时同步 canonical、Open Graph、hreflang 和 sitemap。
4. 中英文页面使用 `/zh/` 和 `/en/` 稳定路径，根路径指向中文入口。
5. 官网只使用脱敏后的产品说明与仓库中已有的品牌/产品截图，不向浏览器请求运行时数据，不启动本地伴随服务。

## Consequences

- 插件根目录的 `src/`、测试和发布包不需要引入 Astro 运行时。
- 产品文案和真实截图可以随插件版本在同一 Pull Request 中维护。
- Cloudflare Pages 的部署配置必须提供最终 `PUBLIC_SITE_URL`，否则会使用项目默认的 Pages URL。
- 官网与插件可以分别构建和发布，但共享同一个版本上下文和 GitHub 入口。

## Rejected alternatives

- 将官网放进 `src/`：会混淆 DSH Bundle 运行时代码与营销页面。
- 在另一个仓库维护官网：会使产品截图、安装文案和版本更新产生漂移。
- 让插件启动官网服务：会增加端口、生命周期和认证复杂度，不符合静态部署目标。
