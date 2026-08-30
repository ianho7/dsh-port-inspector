# DSH Runtime Inspector 官网

这是 DSH Runtime Inspector 的独立 Astro 静态官网，和插件运行时代码位于同一仓库，但拥有自己的依赖和部署流程。

## 本地开发

```powershell
cd website
npm install
npm run dev
```

也可以在仓库根目录运行：

```powershell
npm run website:dev
npm run website:build
npm run website:preview
```

## Cloudflare Pages

- Root directory：`website`
- Build command：`npm run build`
- Build output directory：`dist`
- Node.js：`22.19.0` 或更高版本
- Environment variable：`PUBLIC_SITE_URL=https://你的正式域名`

没有设置 `PUBLIC_SITE_URL` 时，官网会使用预设的 Cloudflare Pages URL `https://dsh-runtime-inspector.pages.dev`。域名变更后只需要更新该变量，canonical、Open Graph、hreflang 和 sitemap 会同步使用新地址。

## 页面结构

- `/zh/`：中文官网
- `/en/`：English landing page
- `/robots.txt`：爬虫规则和 sitemap 入口
- `/sitemap.xml`：中英文页面 sitemap

产品截图和 Logo 是从仓库现有 `assets/` 中复制的发布素材。官网页面只展示脱敏后的静态内容，不读取 DSH 运行时信息，也不启动本地伴随服务。
