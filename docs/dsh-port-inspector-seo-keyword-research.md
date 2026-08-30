# DSH Port Inspector SEO 关键词调研与落地记录

- 调研日期：2026-08-30
- 适用页面：`website/` 下的 `/zh/` 与 `/en/` 静态官网
- 当前产品名：`DSH Port Inspector`

## 调研口径

本次关键词集合依据官方产品命名、官方文档用语、GitHub 生态标签，以及本项目自身的用户任务整理。它是一组“品牌 + 产品意图 + 技术问题”的可维护关键词集合，不是第三方关键词工具给出的搜索量排名；本次没有虚构搜索量、难度或排名数据。

关键词会自然出现在页面标题、描述、可见正文、FAQ、图片替代文本和 Schema.org 结构化数据中。官网不增加过时的 `meta keywords` 标签，也不在页面中隐藏关键词列表。

## 一手来源与信号

| 来源 | 可确认的命名或主题 | 对本项目的意义 |
| --- | --- | --- |
| [DeepSeek Harness 官方介绍页](https://www.deepseek.com/harness/en/) | `DeepSeek Harness`、`agent harness`、`Everything is a plugin`、`Web UI`、`runtime inspection`、`traceable`、Session log、`@deepseek-ai/dsh` | 支撑品牌词、Agent Harness 词、插件架构词和 DSH Web 场景词。 |
| [DeepSeek Harness 官方仓库](https://github.com/deepseek-ai/deepseek-harness) | `DeepSeek Harness (dsh)`、open-source agent harness、Cordis、`dsh-plugin`、`ai-agents`、developer preview | 支撑官方产品名、开源/生态语义，以及插件发现用的 GitHub topic。 |
| [官方插件入门文档](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/) | plugin、Web UI、`apply`、生命周期、依赖、services | 支撑“这是一个 DSH Web 插件”的安装和开发者意图。 |
| [官方 CLI README](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/README.md) | `dsh web`、`dsh plugin --profile <name>`、profile、plugin bundle、`@deepseek-ai/dsh` | 支撑安装命令、Web Profile 和 Bundle 相关词。 |
| [GitHub `dsh-plugin` 主题](https://github.com/topics/dsh-plugin) | `dsh-plugin`、`ai-agents`、`cordis`、插件生态 | 支撑生态发现词，而不是泛泛使用“AI 工具”作为主关键词。 |
| [Schema.org SoftwareApplication](https://schema.org/SoftwareApplication) | `keywords`、`featureList`、`applicationCategory`、`operatingSystem` | 支撑在软件应用 JSON-LD 中表达关键词、功能和 Windows 平台。 |
| [本项目 README](../README.md) | Port Inspector、Windows local development、TCP listener、PID、父进程链、Session、Tool Call、Docker Compose、Vite、Node.js、Go、Python、安全结束 | 支撑产品实际能解决的问题，避免加入与实现不符的承诺。 |

## 完整关键词矩阵

### 已落地关键词

以下矩阵是调研出的页面落地范围。P0 词和高意图 P1 词进入 `siteCopy[locale].seo.keywords`，由页面传给 `SoftwareApplication` 与 `WebSite` 的 JSON-LD；更细的技术词通过可见正文、FAQ、图片替代文本或文档承载，避免元数据变成堆词。高优先级词同时进入可见标题、描述、正文或 FAQ。

| 优先级 | 主题 | English | 中文/代码写法 | 主要意图 |
| --- | --- | --- | --- | --- |
| P0 | 品牌与产品 | `DeepSeek`, `DeepSeek Harness`, `deepseek-harness`, `DSH Port Inspector` | `DeepSeek`、`DeepSeek Harness`、`deepseek-harness`、`DSH Port Inspector` | 找到官方相关项目和本产品。 |
| P0 | 插件生态 | `DeepSeek Harness plugin`, `DSH Web plugin`, `dsh-plugin` | `DeepSeek Harness 插件`、`DSH Web 插件`、`dsh-plugin` | 找到适用于 DSH Web 的插件。 |
| P0 | Web 与安装入口 | `DSH Web`, `DeepSeek Harness Web UI`, `@deepseek-ai/dsh`, `dsh web`, `dsh plugin --profile web` | `DSH Web`、`DeepSeek Harness Web UI`、`@deepseek-ai/dsh`、`dsh web`、`dsh plugin --profile web` | 识别运行入口、CLI 和 Web Profile。 |
| P0 | Agent 场景 | `DeepSeek agent harness`, `agent harness`, `Coding Agent` | `DeepSeek Agent Harness`、`AI Agent Harness`、`Coding Agent` | 连接到官方 Agent Harness 和 Coding Agent 开发场景。 |
| P1 | 插件架构 | `Cordis plugin`, `plugin bundle`, `Web UI plugin` | `Cordis 插件`、`插件 Bundle`、`Web UI 插件` | 说明产品属于 DSH 的插件/Bundle 架构。 |
| P1 | 核心问题 | `Windows port inspector`, `local development ports`, `Windows port conflict`, `port origin tracing` | `Windows 本地开发端口检查器`、`本地开发端口追踪`、`Windows 端口冲突排查`、`端口来源追踪` | 捕捉安装前的实际问题和解决意图。 |
| P1 | 监听与进程 | `TCP listeners`, `process-to-port mapping`, `parent process chain`, `PID reuse detection` | `TCP 监听端口`、`进程与端口映射`、`父进程链`、`PID 复用检测` | 描述端口、监听进程和身份校验能力。 |
| P1 | DSH 归因 | `Session and Tool Call tracing`, `runtime inspection`, `process attribution` | `Session Tool Call 归因`、`运行时检查`、`进程归因` | 表达从端口到 DSH Session/Tool Call 的可复核链路。 |
| P1 | Agent 生命周期 | `Job/Terminal lifecycle`, `fresh scan`, `safe process termination`, `read-only port diagnostics` | `Job / Terminal 生命周期`、`fresh scan`、`安全结束进程`、`只读端口诊断` | 表达处理边界和完成后的释放确认。 |
| P2 | 本地工具链 | `Docker Compose ports`, `Vite ports`, `Node.js local server`, `Go local server`, `Python local server` | `Docker Compose 端口`、`Vite 端口`、`Node.js 本地服务`、`Go 本地服务`、`Python 本地服务` | 覆盖本地开发服务的具体搜索语境。 |

### 发现但不作为主元数据词的相关表达

这些词在官方资料或产品语境中有价值，但没有全部放入页面关键词数组，以免 JSON-LD 变成长关键词堆。它们通过可读正文或文档链接承担语义：

| 表达 | 处理方式 |
| --- | --- |
| `Everything is a plugin`、`plugin ecosystem`、`open-source agent harness` | 作为官方架构背景留在调研记录和项目链接中，不伪装成产品功能。 |
| `session log`、`traceable runs`、`trajectory`、`subagent`、`workspace` | 只在与 DSH 运行上下文相关的产品说明中使用，避免承诺 Port Inspector 提供完整 Harness 日志系统。 |
| `port scanner`、`process manager`、`task manager` | 不作为主关键词；产品明确不是通用任务管理器，也不是全网扫描器。 |
| `macOS`、`Linux`、`UDP`、远程主机 | 页面 FAQ 明确列为当前 MVP 不支持，不用于吸引不匹配的访问。 |

## 落地策略

| 层级 | 落点 | 目的 |
| --- | --- | --- |
| HTML metadata | 双语 `<title>` 与 `<meta name="description">` | 直接表达品牌、DeepSeek Harness、Windows、DSH Web、插件和端口冲突意图。 |
| Schema.org | `SoftwareApplication.keywords`、`featureList`、`applicationSubCategory` | 给搜索引擎可解析的软件类型、平台、能力和关键词集合。 |
| Schema.org FAQ | `FAQPage`、`Question`、`Answer` | 让“是什么插件”“是否自动关闭服务”等真实安装前问题与可见 FAQ 一致。 |
| 可见正文 | hero、能力介绍、支持范围、安装说明、FAQ、footer | 用完整句子自然说明 DeepSeek Harness / DSH Web 和真实能力。 |
| 图片语义 | DSH Web 截图的 `alt` 文本 | 说明截图所在的产品上下文，不用图片承载隐藏关键词。 |
| PWA 元数据 | `site.webmanifest` description | 在收藏、安装和分享场景保持产品与 DeepSeek Harness 的一致命名。 |
| 文档 | 本文件 | 留下来源、选择依据和后续补词边界，方便域名上线后继续观测。 |

## 后续观测建议

正式域名上线后，再根据 Cloudflare Web Analytics、Search Console 或其他合规分析工具中的真实查询词调整优先级。优先观察品牌词是否正确归因到 `DSH Port Inspector`，以及“DeepSeek Harness plugin / DSH Web plugin / Windows port conflict”这类组合词是否带来匹配访问；不要仅凭一次曝光就扩大到泛“AI agent”关键词。
