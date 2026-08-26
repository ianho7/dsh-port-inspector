# DSH Runtime Inspector 工具链 Logo 补充调研

> 调研日期：2026-08-25
>
> 范围：面向 `src/client/toolchain-logo-data.ts` 的候选工具链 Logo 补充；本文件记录候选，不替代本地素材文件。

> 素材状态：第一批 10 个和第二批 9 个 Logo 已审核并保存到 `assets/toolchains/`，由生成脚本生成 `src/client/toolchain-logo-data.ts` 的小型本地导入映射；本次只补充素材，不扩展 Host 识别规则。

## 结论摘要

调研开始时 `src/client/toolchain-logo-data.ts` 是生成文件，实际已有的 Logo 数据键只有 `vite`、`nextjs`、`nodejs`。本次已完成第一、二批素材落地；源码中的 `ToolchainId` 共 28 个，其中仍有部分识别规则覆盖项未进入 Logo 数据，后续可按识别证据继续补充。

建议的第一批补充顺序是：

1. 先补已被现有 Host 识别规则直接覆盖、且容易在本机开发端口场景中出现的 `ollama`、`bun`、`deno`、`python`、`docker`、`postgresql`、`redis`、`firebase`、`metro`、`adb` 等。
2. 再补高辨识度的 AI 开发工具和 IDE：OpenAI、Anthropic/Claude、Gemini、GitHub Copilot、Cursor、Claude Code、Codex、VS Code、JetBrains。
3. 最后纳入云平台、协作和观测品牌。它们的官方生态信号很强，但仅凭当前监听器的 executable、命令和项目路径通常不能安全地建立精确归因，因此应先扩展确定性识别规则，再增加 Logo。

这里的“常用”不是对全行业使用率的排名断言。本文只使用一手来源，并把官方文档的安装/集成面、官方 GitHub 项目的持续活动、官方产品与品牌资源作为“仍在使用且值得进入候选池”的信号；这是合理推断，不等同于独立的市场份额测量。

## 调研口径

- **去重基线**：只把生成数据中实际存在的 `vite`、`nextjs`、`nodejs` 视为已有 Logo；不重复建议它们。已有检测规则但没有本地 Logo 的工具仍可进入候选表。
- **来源优先级**：品牌页/Logo 下载页 > 官方产品页和官方文档 > 官方 GitHub/GitLab 仓库。未使用二手榜单直接证明流行度。
- **候选价值**：优先考虑能由当前项目、已脱敏命令、executable 或 Session 确定识别的本地运行时、框架、开发环境和基础设施；Logo 只帮助扫读，不表达 `Process origin`、`Verified attribution`、`Lifecycle owner` 或可操作性。
- **优先级含义**：`P0` 表示已有确定性识别路径或极高的本地开发价值；`P1` 表示常见且值得补充，但需要新增/细化识别规则或有品牌审核工作；`P2` 表示候选储备，适合在识别证据或品牌资源稳定后纳入。
- **纳入含义**：`是` 表示建议进入后续 Logo 清单；`条件纳入` 表示先确认 Host 识别证据和官方素材可直接下载；`暂不纳入` 表示品牌可以调研，但当前 Logo 单独加入会制造过度归因风险。
- **链接含义**：每行的“官方 Logo/品牌资源”是维护者取得素材时应首先打开的页面；“证据”是产品、安装、集成或官方项目活跃度的来源。正式写入 `assets/toolchains/sources.json` 前只需确认 URL 能取得可用素材，并把文件保存到 `assets/toolchains/`。

## 候选工具表

### 模型/API

| 工具名 | 建议稳定 id | 类别 | 适合补充的理由（含推断边界） | 官方 Logo/品牌资源 | 证据 | 建议优先级 | 是否建议纳入 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OpenAI API / OpenAI | `openai` | 模型/API | 官方 API 文档、模型和开发者产品线持续更新；也是 Codex 等开发工具的共同品牌。对本地工具链而言，只有识别到 OpenAI CLI/SDK 或明确 Session 证据时才应展示。 | [OpenAI Design](https://openai.com/brand/) | [OpenAI API 文档](https://platform.openai.com/docs/overview) | P1 | 是 |
| Anthropic API / Claude | `anthropic` | 模型/API | 官方 Claude Developer Platform 提供 API、SDK、Console 和 Quickstarts；与 Claude Code 共用生态。建议把 API 品牌与 Claude Code 产品 id 分开。 | [Anthropic 官方站点](https://www.anthropic.com/)（若取得品牌包，优先使用官方提供的版本） | [Claude Developer Platform 文档](https://docs.claude.com/en/home) | P1 | 条件纳入 |
| Google Gemini API | `gemini` | 模型/API | Google 官方 Gemini API 文档覆盖文本、代码和多模态开发；Gemini 也有 CLI/IDE 相关生态。Google 产品图标受更严格的品牌规则约束，建议先走批准的官方资源。 | [Google Brand Resource Center](https://about.google/brand-resource-center/) | [Gemini API 文档](https://ai.google.dev/gemini-api/docs) | P1 | 条件纳入 |
| Ollama | `ollama` | 本地模型/API | 当前检测规则已识别 `ollama.exe` 和 `ollama serve`，是本地 Windows 开发端口场景的直接补充。官方文档提供 Windows 安装、REST API、Python/JS 库；官方仓库有持续提交和大量公开工程活动，这是“常用”的项目活跃度信号。 | [Ollama 官方站点](https://ollama.com/) | [Ollama 文档](https://docs.ollama.com/index)、[官方 GitHub 仓库](https://github.com/ollama/ollama) | P0 | 是 |
| Hugging Face Hub | `huggingface` | 模型/ML 平台 | 官方 Hub 是模型、数据集和 ML 库的协作入口；适合在命令、Python 进程或项目依赖中有明确 Hugging Face 证据时展示。仅凭“Python”不能推断为 Hugging Face。 | [Hugging Face Brand Assets](https://huggingface.co/brand) | [Hugging Face Hub 文档](https://huggingface.co/docs/hub/index)、[官方 brand-assets 数据集](https://huggingface.co/datasets/huggingface/brand-assets) | P2 | 条件纳入 |

### AI 编程助手与 Agent

| 工具名 | 建议稳定 id | 类别 | 适合补充的理由（含推断边界） | 官方 Logo/品牌资源 | 证据 | 建议优先级 | 是否建议纳入 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GitHub Copilot | `github-copilot` | AI 编程助手/Agent | 官方文档已覆盖 IDE Agent mode、Copilot CLI、云端 Agent、代码审查和 MCP；生态面很宽，适合做高识别度补充。不要把普通 GitHub 归因自动升级为 Copilot。 | [GitHub Brand Toolkit](https://brand.github.com/) | [GitHub Copilot 功能](https://docs.github.com/en/copilot/get-started/features) | P1 | 是 |
| Cursor | `cursor` | AI 编辑器/Agent | 官方文档明确描述 Agent、代码库理解、终端、MCP、CLI 和后台 Agent；这是直接的一手产品生态信号。Logo 资源页若没有稳定同域下载，应暂用官方产品 favicon 并记录来源类型。 | [Cursor 官方文档](https://cursor.com/docs) | [Cursor Agent 模式](https://docs.cursor.com/agent)、[Cursor CLI](https://docs.cursor.com/en/cli/overview) | P1 | 条件纳入 |
| Windsurf | `windsurf` | AI 编辑器/Agent | Cascade/Agent 属于常见的 AI IDE 类工具，适合补充 AI 开发环境识别；但本调研未确认一个稳定的公开品牌下载页，需在实现前确认官方素材和授权边界。 | [Windsurf 官方站点](https://windsurf.com/) | [Windsurf 官方文档](https://docs.windsurf.com/) | P2 | 条件纳入 |
| Claude Code | `claude-code` | AI 编程 Agent | 官方文档明确说明它可读取代码库、编辑文件、运行命令，并覆盖 Terminal、IDE、桌面和浏览器；Windows/WSL 安装路径也有官方说明。应与 `anthropic` 分开命名。 | [Anthropic 官方站点](https://www.anthropic.com/)；使用 Anthropic 批准的 Claude/Claude Code 资产 | [Claude Code 概览](https://code.claude.com/docs/en/overview)、[安装文档](https://docs.anthropic.com/en/docs/claude-code/getting-started) | P1 | 是 |
| OpenAI Codex | `codex` | AI 编程 Agent | 官方 Codex 页面、CLI 文档和开源仓库都把它定义为面向软件工程的编码 Agent；可在本地终端或 IDE 场景出现。Logo 可复用 OpenAI 品牌，但展示名称必须写 Codex，避免与模型/API 混淆。 | [OpenAI Design](https://openai.com/brand/) | [Codex 产品页](https://openai.com/codex/)、[Codex CLI 入门](https://help.openai.com/en/articles/11096431)、[官方 GitHub 仓库](https://github.com/openai/codex) | P1 | 是 |
| Cline | `cline` | AI 编程 Agent | 官方仓库将其定义为 SDK、IDE 扩展和 CLI 助手；公开仓库有持续提交、Issues 和发布活动，属于可观察的开源项目活跃度信号。只在命令、扩展或项目配置提供明确证据时识别。 | [Cline 官方站点](https://cline.bot/) | [Cline 官方 GitHub 仓库](https://github.com/cline/cline) | P2 | 条件纳入 |

### 开发环境与构建

| 工具名 | 建议稳定 id | 类别 | 适合补充的理由（含推断边界） | 官方 Logo/品牌资源 | 证据 | 建议优先级 | 是否建议纳入 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Visual Studio Code | `vscode` | IDE | 官方品牌页提供稳定图标、下载文件和明确的名称/图标使用规则；是本机开发环境的高价值识别项。显示名首处应使用官方写法 `Visual Studio Code`，紧凑空间才使用 `VS Code`。 | [VS Code 图标与名称使用指南](https://code.visualstudio.com/brand) | [VS Code 官方站点](https://code.visualstudio.com/docs) | P0 | 是 |
| JetBrains | `jetbrains` | IDE 套件 | 官方品牌页提供公司和产品 Logo、图标及下载包，且列出 IntelliJ IDEA、PyCharm、WebStorm 等产品命名规则。若无法区分具体 IDE，展示 JetBrains 比猜测某个产品更安全。 | [JetBrains Brand Assets](https://www.jetbrains.com/company/brand/) | [JetBrains IDEs](https://www.jetbrains.com/ides/) | P1 | 是 |
| Docker | `docker` | 容器/开发环境 | 当前 executable 规则已覆盖 `docker-proxy`、`dockerd`、`com.docker.backend`；Docker 官方品牌页给出专用 Logo 包和清晰的最小尺寸/禁止修改规则。 | [Docker Logo、Icon 与 Brand Guidelines](https://www.docker.com/company/newsroom/media-resources/) | [Docker 文档](https://docs.docker.com/) | P0 | 是 |
| Kubernetes | `kubernetes` | 容器编排 | 官方仓库和品牌指南提供 Logo 文件与使用规范；Kubernetes 控制面或本地集群相关监听器可能是重要开发基础设施，但必须有命令、进程或项目配置证据，不能由任意容器端口推断。 | [Kubernetes Logo Usage Guidelines](https://github.com/kubernetes/kubernetes/blob/master/logo/usage_guidelines.md) | [Kubernetes 官方文档](https://kubernetes.io/docs/home/)、[官方仓库](https://github.com/kubernetes/kubernetes) | P1 | 条件纳入 |
| npm | `npm` | JavaScript 包管理/构建 | Node.js 项目中极常见，且 npm 官方文档有 Logo 使用政策和 CLI 文档；识别到 `npm`/`npx` 或 `package.json` 脚本时比只显示 Node.js 更有信息量。 | [npm Logo 使用政策](https://docs.npmjs.com/policies/logos-and-usage) | [npm CLI 文档](https://docs.npmjs.com/cli/v11/using-npm/about-npm) | P0 | 是 |
| pnpm | `pnpm` | JavaScript 包管理/构建 | 官方文档和开源仓库持续维护，适合在命令、锁文件或项目脚本中出现时显示；应与 npm、Bun 分开，不能只根据 Node.js 运行时猜测。 | [pnpm 官方站点](https://pnpm.io/) | [pnpm 官方文档](https://pnpm.io/motivation)、[官方 GitHub 仓库](https://github.com/pnpm/pnpm) | P0 | 是 |
| Bun | `bun` | JavaScript runtime/构建 | 当前 executable 规则已经识别 `bun.exe`；官方文档覆盖安装、运行时、测试、打包和包管理，适合优先补 Logo。 | [Bun 官方站点](https://bun.com/) | [Bun 文档](https://bun.com/docs)、[官方 GitHub 仓库](https://github.com/oven-sh/bun) | P0 | 是 |
| Deno | `deno` | JavaScript/TypeScript runtime/构建 | 当前 executable 规则已经识别 `deno.exe`；官方品牌页同时提供 Logo 资产和使用指南，素材审核成本低。 | [Deno Branding](https://deno.com/brand) | [Deno 文档](https://docs.deno.com/runtime/) | P0 | 是 |
| Python | `python` | 通用 runtime/构建 | 当前 executable 规则已识别 Python 解释器；Python 官方 Logo 页提供品牌资产。Logo 只能表达 Python runtime，不能据此猜测 Django、Flask、FastAPI 或某个 AI 框架。 | [Python Logo 使用政策](https://www.python.org/community/logos/) | [Python 官方文档](https://docs.python.org/3/) | P0 | 是 |
| Rust | `rust` | 编译型 runtime/构建 | 当前规则已识别 `cargo`/`rustc`；Rust 官方媒体指南提供 Logo 与使用要求。适合在 cargo/rustc 或项目清单有明确证据时加入。 | [Rust Media Guide](https://www.rust-lang.org/policies/media-guide) | [Rust 官方文档](https://www.rust-lang.org/learn) | P1 | 是 |

### 版本控制与协作

| 工具名 | 建议稳定 id | 类别 | 适合补充的理由（含推断边界） | 官方 Logo/品牌资源 | 证据 | 建议优先级 | 是否建议纳入 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GitHub | `github` | 版本控制/协作 | 官方 Brand Toolkit 提供主 Logo 和产品 Logo；GitHub 也是 Copilot、Actions、Issues 和 Pull Requests 的共同协作入口。它适合作为项目上下文 Logo，但不能由任意 Git remote URL 单独推断出当前监听器属于 GitHub。 | [GitHub Brand Toolkit](https://brand.github.com/) | [GitHub Logo Policy](https://docs.github.com/en/site-policy/other-site-policies/github-logo-policy)、[GitHub Docs](https://docs.github.com/en/get-started/start-your-journey/about-github-and-git) | P1 | 条件纳入 |
| GitLab | `gitlab` | 版本控制/DevSecOps 协作 | 官方品牌手册、Pajamas 设计系统和公开仓库提供 Logo/品牌使用入口；适合在项目 remote、CI 配置或 GitLab Runner 证据明确时显示。 | [GitLab Brand Handbook](https://handbook.gitlab.com/handbook/marketing/brand-and-product-marketing/brand/)、[GitLab Brand Assets](https://design.gitlab.com/get-started/brand-assets/) | [GitLab Docs](https://docs.gitlab.com/ee/user/)、[GitLab 官方项目](https://gitlab.com/gitlab-org/gitlab) | P2 | 条件纳入 |
| Linear | `linear` | Issue/项目协作 | 官方品牌页提供 wordmark、logomark 和 icon，并明确禁止暗示背书；适合作为当前项目/Session 的协作上下文，但当前监听器识别规则没有直接证据来源。 | [Linear Brand Guidelines](https://linear.app/brand) | [Linear 文档](https://linear.app/docs) | P2 | 暂不纳入 |

### 部署与观测

| 工具名 | 建议稳定 id | 类别 | 适合补充的理由（含推断边界） | 官方 Logo/品牌资源 | 证据 | 建议优先级 | 是否建议纳入 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Vercel | `vercel` | 部署/边缘平台 | 官方品牌页提供 Vercel Logo 和下载资源，也同时覆盖 Next.js、Turbo、AI SDK 等开发生态。适合在 `vercel` CLI、项目配置或明确部署上下文出现时识别；不能由普通 Node 端口推断。 | [Vercel Brands](https://vercel.com/geist/brands) | [Vercel 文档](https://vercel.com/docs) | P1 | 条件纳入 |
| Netlify | `netlify` | 部署平台 | 官方 About 页面直接提供 Logo 资产和品牌指南，并持续维护开发者文档；适合作为静态站点/边缘部署上下文的候选。 | [Netlify About 与 Brand Assets](https://www.netlify.com/about/) | [Netlify Docs](https://docs.netlify.com/) | P2 | 条件纳入 |
| Cloudflare | `cloudflare` | 部署/边缘/网络 | 官方 Press/Press Kit 与开发者文档都提供开发平台入口；但 Cloudflare 的 Logo 更容易表达“部署平台/网络服务”，不应从任意本地 HTTP 服务单独推断。 | [Cloudflare Press/Press Kit](https://www.cloudflare.com/press/) | [Cloudflare Developers](https://developers.cloudflare.com/) | P1 | 条件纳入 |
| AWS | `aws` | 云部署/基础设施 | AWS 官方架构图标页提供可下载的服务图标和使用说明，官方开发者生态广泛；由于服务 Logo 的授权和服务粒度复杂，建议先纳入 AWS 总品牌，不把每个 AWS 服务都做成独立 Logo。 | [AWS Architecture Icons](https://aws.amazon.com/architecture/icons/) | [AWS Developer Center](https://aws.amazon.com/developer/) | P2 | 条件纳入 |
| Microsoft Azure | `azure` | 云部署/基础设施 | Azure 是常见开发部署目标，官方文档和 Microsoft 品牌体系提供一手来源；但本地监听器通常无法仅凭端口确定 Azure，需结合项目文件、CLI 或明确环境变量（且不能采集秘密）。 | [Azure 官方站点](https://azure.microsoft.com/)（实现前确认当前 Azure 品牌指南入口） | [Azure 文档](https://learn.microsoft.com/en-us/azure/) | P2 | 条件纳入 |
| Google Cloud | `gcp` | 云部署/基础设施 | Google Cloud 官方文档和品牌中心提供一手来源；适合作为部署上下文候选，但 Google 产品图标需要严格遵循品牌中心的产品图标和审批规则。 | [Google Brand Resource Center](https://about.google/brand-resource-center/) | [Google Cloud 文档](https://cloud.google.com/docs/overview) | P2 | 条件纳入 |
| Firebase | `firebase` | 部署/后端服务 | 当前命令识别规则已覆盖 `firebase emulators:start` 和 `firebase serve`，这是比云平台泛化识别更可靠的本地证据；可优先补 Logo。 | [Firebase Brand Guidelines](https://firebase.google.com/brand-guidelines) | [Firebase 文档](https://firebase.google.com/docs) | P1 | 是 |
| Supabase | `supabase` | 后端平台/数据库/AI | 官方 Logo 包和下载页明确说明提供 SVG，且产品页覆盖 Database、Auth、Functions、Realtime、Vector 和 Agents；适合在 CLI、项目配置或明确服务上下文可确认时显示。 | [Supabase Brand Assets](https://supabase.com/brand-assets) | [Supabase 文档](https://supabase.com/docs) | P1 | 条件纳入 |
| Sentry | `sentry` | 错误追踪/观测 | 官方文档和合作伙伴品牌入口适合支撑 Logo 来源；但 Sentry 通常是 SDK/远程观测服务，不是本机监听器，当前应作为项目上下文候选，而不是端口归因。 | [Sentry Partner Brand 页面](https://sentry.io/for/partners/brand/) | [Sentry Docs](https://docs.sentry.io/) | P2 | 暂不纳入 |
| Grafana | `grafana` | 指标/观测 | 官方品牌指南和官方开源仓库提供 Logo/项目活动证据；适合在 Grafana/Prometheus 本地服务可被明确识别时显示，不应仅凭 Web UI 端口猜测。 | [Grafana Brand Guidelines](https://grafana.com/brand-guidelines/) | [Grafana 文档](https://grafana.com/docs/grafana/latest/)、[官方 GitHub 仓库](https://github.com/grafana/grafana) | P2 | 条件纳入 |

## 暂不优先的候选

以下工具有明显开发生态，但本轮不建议为了“看起来完整”立即加入 Logo 清单：

- **Mistral AI、Cohere、Groq、OpenRouter**：模型/API 候选可继续保留，但当前项目首先需要本地端口和确定性 Host 证据；Logo 资源与 API 品牌区分需要单独审核。
- **Bitbucket、Azure DevOps、Jira、Trello、Slack**：协作价值明确，但不属于当前监听器识别的直接本地 runtime；应等项目上下文 DTO 有正式、脱敏的来源字段后再加入。
- **Prometheus、Datadog、New Relic**：观测生态价值高，但服务 Logo 不能替代对监听进程的确定性识别；Prometheus 可与 Grafana 一起作为后续本地观测补充。
- **Django、Flask、FastAPI、Spring、Kestrel、Metro、ADB、PostgreSQL、MySQL、MariaDB、Redis、MongoDB、WSL**：它们已经在检测类型中，下一轮可按本地出现频率和官方素材可用性逐项补齐；其中数据库和 WSL 需要注意“基础设施/运行时”与“项目框架”层级，不要因端口号直接猜测。

## Logo 数据实现的命名与版权注意事项

### 命名和数据模型

1. **稳定 id 与展示名分离。** 继续使用小写、ASCII、短横线分隔的稳定键，例如 `openai`、`github-copilot`、`claude-code`、`vscode`、`gcp`。展示名保持官方拼写，例如 `Next.js`、`Node.js`、`Visual Studio Code`、`GitHub Copilot`。
2. **不要为了品牌改名已有键。** `vite`、`nextjs`、`nodejs` 是现有实现键；即使显示名使用 `Next.js`，也不要把 `nextjs` 改成 `next.js`，避免破坏已持久化的稳定映射和测试。
3. **提供商与产品分开。** `openai` 与 `codex`、`anthropic` 与 `claude-code`、`github` 与 `github-copilot` 应分别建键；如果两者复用同一官方 Logo，数据仍可复用同一份经过审核的素材，但显示名和识别理由不能混用。
4. **不要把 PID、端口、创建时间或完整路径放进 Logo id。** Logo 是工具链的静态标识；稳定键必须与运行时实例身份解耦，并继续遵守当前 `stableKey` 和隐私边界。
5. **只在证据足够时绑定 Logo。** `python` 只能表示 Python runtime；不能因 Python 进程就显示 Django、FastAPI、Hugging Face 或某家模型服务。框架/平台 Logo 必须有命令、项目文件、Session 或其他 Host 可验证证据。

### 当前生成管线的约束

- `src/client/toolchain-logo-data.ts` 顶部已声明由 `scripts/update-toolchain-logos.mjs` 从 `assets/toolchains/` 生成；后续应更新本地素材，而不是手工改生成文件。
- `assets/toolchains/sources.json` 只保留工具链 ID 到素材 URL 的必要映射，不保存 homepage、抓取日期、哈希、素材类型或说明字段。
- 当前允许的 MIME 类型是 `image/svg+xml`、`image/png`、`image/x-icon`、`image/vnd.microsoft.icon`；单个素材上限为 256 KiB。优先使用小尺寸、透明背景、适合 24–32px 显示的官方 SVG/PNG。
- SVG 会经过脚本的有界内容检查：不能含 `script`、`foreignObject`、外部 XML、事件处理器、外部 URL 或其他活动内容；通过后只保存本地素材文件。
- Browser 运行时不得请求第三方 Logo URL。Logo 必须在维护阶段下载、清理并随 Bundle 内置；下载失败、素材被撤回或识别不确定时应使用本地通用 fallback，而不是运行时联网或展示错误 Logo。

### 商标、版权和归因

- 官方 Logo 通常仍是商标或受版权保护的品牌资产；“官方可下载”不等于放弃商标权，也不等于可以修改、再着色、重绘或用于暗示合作/背书。仓库代码的开源许可证也不自动授予第三方 Logo 的商标许可。
- 仅在面板中准确表示“检测到该工具链”属于合理的产品识别语境，但仍应遵守各品牌页的禁止项：不拉伸、不裁切、不添加效果、不组合成自己的产品标志，不让第三方品牌比 Runtime Inspector 自身品牌更突出。
- OpenAI、Google、GitHub、VS Code、JetBrains、Docker、Vercel、Supabase、Linear 等官方指南对清晰空间、颜色、名称、归因或背书表达有具体要求；每次更新素材都应重新阅读相应品牌页，不要长期依赖旧下载链接或第三方图标库。
- 对明确要求归因的品牌，在产品文档或仓库的品牌说明中保留“Logo 属于其各自权利人”的简短声明；若品牌页要求链接回官网或要求审批，按其要求执行。若用途超出“准确识别工具链”的范围，应先取得书面许可或暂不纳入。
- 不要使用二手 Logo 聚合站、搜索结果缩略图、用户重绘 SVG 或 AI 生成 Logo 作为生产素材。它们可用于发现线索，但不能作为当前管线的最终来源。

## 后续落地建议

1. 先把已有检测 ID 中的本地 runtime/基础设施按 P0/P1 分批补进来源清单，并把审核后的文件放入 `assets/toolchains/`。
2. 为 AI 工具新增识别规则前，先定义可验证信号：可执行文件名、官方 CLI 命令、项目配置或明确的 Session/Tool Call 关联；不要用“端口看起来像”作为依据。
3. 每批 Logo 更新后运行现有 Logo 管线测试、构建和 `git diff --check`；更新后的结果应继续满足离线 Browser、无外部请求、MIME/大小限制和 SVG 清理要求。
4. 对云平台、协作和观测候选，先在 Host 展示 DTO 中建立脱敏、可解释的项目上下文，再决定是否把 Logo 从“条件纳入”提升为“是”。
