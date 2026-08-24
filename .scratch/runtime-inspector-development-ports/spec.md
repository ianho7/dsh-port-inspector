# Runtime Inspector 开发端口与工具链视觉规格

Status: ready-for-agent

## Problem Statement

Runtime Inspector 当前把 Windows 上发现的 TCP listeners 近似等权地展示在一个列表中。用户直接打开 DSH Web 时，System、`svchost.exe`、Spotify、微信和代理软件等后台监听会与 Vite、Next.js、本地数据库和 DSH Session 启动的开发服务混在一起。程序员或 Vibe Coder 必须逐行辨认 executable、PID 和来源状态，才能找到真正与当前工作相关的端口。

当前选中行还同时使用浅蓝背景和完整蓝色描边，强调信号偏重。列表和详情只展示文本，没有工具链 Logo，用户无法利用熟悉的 Vite、PostgreSQL、Redis、Docker 或 Ollama 视觉标识快速扫读。

产品需要提升开发相关监听的可见性，同时继续诚实地区分 Process origin、来源状态和处理方式。开发相关性不能被误解为 DSH 来源证明，也不能赋予任何进程操作权限。

## Solution

Runtime Inspector 默认展示“开发端口”视图，并将监听器组织为“当前项目”“开发环境”和“固定显示”三个可见分组。没有开发相关性依据的系统服务和桌面应用进入默认收起的“其他监听”，但仍能通过搜索和“全部监听”访问。

Host 根据已经允许用于展示的 executable、项目、当前 DSH Session、已脱敏命令和容器/子系统证据，输出确定性的开发相关性分组、识别依据和工具链标识。常见端口号只能作为辅助证据，不能独立决定分类。证据不足时归入“其他监听”，不得使用“可能是开发服务”等模态文案。

列表和详情在工具链已经确定时展示对应工具链 Logo；只确定运行时时展示 Node.js、Python、Java 或 .NET 等运行时 Logo；仍无法确定时展示本地通用占位。工具链 Logo 只表达“识别到的开发工具链”，不表达 DSH 来源、Verified attribution、Lifecycle owner 或处理方式。

Logo 素材来自经过维护者审核的官方品牌素材或官网 favicon。素材在维护或构建阶段下载、校验并生成到 Browser Bundle，本产品运行时不访问第三方网站。

选中行采用安静指示线样式：移除完整蓝色描边，只使用浅中性灰蓝背景、左侧三像素强调线和蓝色端口数字。Hover、Focus 和 Selected 保持可区分，右侧详情继续由被选中的 listener 驱动。

## User Stories

1. As a DSH Web user, I want development-related listeners to appear before unrelated background listeners, so that I can find the service I am working on immediately.
2. As a developer, I want the primary heading to say “开发端口” and show its count, so that the panel communicates its main purpose at first glance.
3. As a developer working in the current workspace, I want listeners associated with the current project to appear in the first group, so that my active work has the highest visual priority.
4. As a developer, I want recognized local databases, caches, emulators, mobile toolchains and local AI services to appear under “开发环境”, so that supporting infrastructure remains visible without competing with the current project.
5. As a user, I want System, Service Host and unrelated desktop applications to be collapsed by default, so that background noise does not dominate the panel.
6. As a user, I want the collapsed row to state how many other listeners exist, so that hidden listeners are not mistaken for absent listeners.
7. As a user, I want to expand “其他监听”, so that I can inspect every listener when necessary.
8. As a user, I want “全部监听” to show both development and other listeners, so that the focused default does not remove complete-system visibility.
9. As a user, I want search to cover listeners that are currently collapsed, so that I can find Spotify, Weixin, `svchost.exe`, a port or a PID without expanding the group first.
10. As a user, I want search results to explain that all listeners were searched, so that I understand why a previously hidden process appeared.
11. As a user, I want to pin an otherwise hidden application, so that a personally relevant tool remains visible in the default view.
12. As a returning user, I want pinned display preferences to survive a Browser reload, so that I do not repeatedly configure the same view.
13. As a user, I want pinning to be based on a stable presentation identity rather than PID, so that a process restart does not silently discard my preference.
14. As a user with several Node services, I want pinning to include project identity when available, so that pinning one project does not pin every `node.exe` listener.
15. As a developer, I want a Vite listener to show the Vite Logo when Vite is deterministically identified, so that I can recognize it faster than by reading executable text.
16. As a developer, I want an unidentified Node service to show the Node.js Logo rather than a guessed framework Logo, so that the interface does not overstate what it knows.
17. As a developer, I want PostgreSQL, Redis, Docker, Metro and Ollama listeners to use familiar toolchain marks, so that mixed development environments remain scannable.
18. As a user, I want the same toolchain Logo in the list and the selected listener detail, so that the two panes feel connected.
19. As a user, I want a generic local fallback when a Logo is missing or invalid, so that the UI never shows a broken image.
20. As a privacy-conscious user, I want Runtime Inspector to avoid contacting toolchain websites while I use the panel, so that my installed tools are not disclosed to third parties.
21. As an offline user, I want all shipped Logos to continue working, so that the panel remains complete without internet access.
22. As a maintainer, I want every Logo to have an official source URL and recorded update information, so that provenance can be reviewed.
23. As a maintainer, I want the asset updater to access only curated official domains, so that a process name can never become an arbitrary network request.
24. As a maintainer, I want downloaded assets to have bounded MIME types and sizes, so that malformed or unexpectedly large files do not enter the Browser Bundle.
25. As a developer, I want current-project classification to use explicit project or current-Session evidence, so that unrelated applications are not promoted merely because they opened a common port.
26. As a developer, I want a known development executable or toolchain command to qualify for “开发环境”, so that shared infrastructure remains discoverable even when no single project owns it.
27. As a developer, I want a common port number to remain only supporting information, so that custom services on ports 3000, 5432 or 8080 are not mislabeled.
28. As a Docker or WSL user, I want an underlying development service to be promoted only when Runtime Inspector has explicit mapping evidence, so that a generic proxy process is not presented as a specific toolchain.
29. As a user, I want an unrecognized Docker or WSL forwarding process to remain searchable in “其他监听”, so that incomplete enrichment does not hide it completely.
30. As a DSH user, I want development grouping to remain independent from “DSH 来源已确认 / 来源未确认”, so that relevance is never presented as Process origin proof.
31. As a DSH user, I want development grouping to remain independent from “可由 DSH 停止 / 可结束单个进程 / 仅可查看”, so that visual prominence never grants process authority.
32. As a DSH user, I want Verified attribution and Lifecycle owner rules to remain unchanged, so that this presentation feature cannot weaken managed shutdown safety.
33. As a DSH user, I want Direct external termination to retain its fresh PID, creation-time, executable, user and protection checks, so that the new view cannot bypass the identity fence.
34. As a user, I want the selected listener to be marked by one calm visual signal, so that the row is obvious without looking like a large blue form control.
35. As a keyboard user, I want selected, hover and keyboard-focus states to remain visually distinct, so that the calmer design does not reduce accessibility.
36. As a screen-reader user, I want Logo images to be decorative when adjacent text already names the toolchain, so that names are not announced twice.
37. As a user with reduced motion enabled, I want grouping and selection changes to avoid unnecessary animation, so that the interface remains comfortable.
38. As a user, I want changing search, grouping or selection to preserve the selected listener when it is still in the result set, so that the detail pane does not jump unexpectedly.
39. As a user, I want the detail pane to clear or select a valid replacement when its listener leaves the result set, so that stale details are never shown as current.
40. As a maintainer, I want unknown toolchains and future DSH versions to fall back safely without user-facing compatibility warnings, so that presentation enrichment remains capability-based.
41. As an Agent using `port_list`, I want this Web-only presentation change not to enlarge the model-facing payload, so that tool token use and Session privacy remain unchanged.
42. As a package consumer, I want toolchain assets included in the existing Client artifact, so that installing the one Bundle remains sufficient.
43. As a maintainer, I want Browser code to consume only bounded serializable Host presentation fields, so that it never imports scanner, Koffi or Windows process primitives.
44. As a maintainer, I want one real Stock DSH Web smoke to exercise the complete default view, search and selection path, so that component-only success cannot stand in for the shipped experience.

## Implementation Decisions

- Development relevance is a presentation dimension distinct from Process origin, source status, Lifecycle owner and handling mode. It cannot change action availability.
- Host remains authoritative for presentation classification. Browser receives only bounded, serializable fields describing a toolchain identifier, development group, stable pinning identity and displayable recognition reasons.
- The development groups are `current-project`, `development-environment` and `other`. Browser-local pinned entries are rendered in a separate `pinned` group without changing the Host classification.
- `current-project` requires explicit current workspace, current Session or matching project evidence. A listener must not enter this group because of executable family or port alone.
- `development-environment` requires an explicitly recognized development runtime, framework, database, cache, emulator, mobile toolchain, local AI service, or proven container/subsystem mapping.
- `other` is the safe fallback. System services, desktop applications and all insufficiently identified listeners remain accessible through search and “全部监听”.
- A common port signature may support a classification already established by stronger evidence but must never establish one by itself.
- The initial toolchain catalog covers the product-relevant families already discussed: Vite, Next.js, Node.js, Bun, Deno, Python, Django, Flask, Uvicorn/FastAPI, Java/Spring, .NET/Kestrel, Go, Rust, PHP, Ruby, PostgreSQL, MySQL/MariaDB, Redis, MongoDB, Docker, WSL, Metro/React Native, Android ADB, Firebase Emulator and Ollama. The catalog may return a broader runtime Logo when a specific framework is not proven.
- Toolchain classification rules are ordered from more specific to more general. A specific deterministic framework match wins over its runtime family; an ambiguous match falls back to the runtime family or generic process presentation.
- Classification consumes only data already available or deliberately added to the Host presentation projection. Raw secrets, environment variables and unredacted commands never cross the Host/Browser boundary.
- Docker and WSL do not receive inferred underlying service identities from their host process names. A specific service Logo requires explicit mapping evidence; otherwise the Docker or WSL Logo is used, or the listener remains `other`.
- Selected rows use a neutral gray-blue fill, no complete accent border, a three-pixel left accent inset, an accent-colored port value and an eight-pixel radius. Focus-visible retains a separate accessible outline.
- Toolchain Logo size is approximately 22–24 px in compact list rows and 30–32 px in the detail heading. The Logo is decorative when the visible service/toolchain name conveys the same information.
- Official brand assets are preferred over favicon assets. Official SVG or PNG favicon is the next choice; ICO is accepted only when no suitable official SVG/PNG exists and is normalized before generation. A local monogram or generic process mark is the final fallback.
- The repository contains a curated icon-source manifest with toolchain ID, official homepage, exact asset URL, source type and provenance notes. The update script never discovers a domain from a scanned process.
- The asset update script enforces HTTPS, an official-domain allowlist, response-size limits, accepted MIME types and deterministic output. SVG inputs reject scripts, `foreignObject`, external references and other active content.
- Runtime Inspector never hotlinks official websites. Approved assets are converted into a generated Browser-safe module, preferably compact data URIs, so the existing Client Bundle remains self-contained and the package does not require a new static asset server.
- Generated assets and their source manifest are reviewable repository content. Updating them is a maintainer action, not part of `npm install`, Bundle startup or panel opening.
- Pin preferences are Browser-only presentation state stored under a namespaced, versioned key. Host does not persist user preferences and pinning does not affect `port_list`.
- Host provides or enables construction of a bounded stable presentation key. PID and creation time are excluded. Project-aware runtime services include project identity; desktop applications and stable infrastructure use a normalized executable or toolchain identity.
- Searching always evaluates all inventory rows before visual grouping. A match in `other` appears without requiring the user to expand the group first.
- The primary “开发端口” count includes current-project, development-environment and pinned rows without double-counting. “全部监听” reflects the complete Host inventory.
- Existing source labels, Session privacy projection, confirmation dialogs, Managed shutdown and Direct external termination contracts remain unchanged.
- The model-facing `port_list` schema and output remain unchanged.
- No independent Web server, companion repository or Browser-side process inspection is introduced.

## Testing Decisions

- Tests assert observable classification and UI behavior, not private matcher order, CSS implementation structure or individual helper calls.
- The main deterministic seam is the serialized Host inventory presentation. Fixture listeners enter the Host with representative executable, project, Session and redacted command evidence; assertions inspect the resulting toolchain ID, development group and recognition reasons.
- Classification coverage includes specific-framework-over-runtime precedence, runtime fallback, current-project precedence, known infrastructure, ambiguous commands, common-port-only rejection, Docker/WSL without mapping, and bounded unknown fallback.
- Existing Host inventory tests provide prior art for redacted, serializable row projection and action-state independence. New assertions confirm development presentation cannot change confidence, Lifecycle owner or action kind.
- Existing Client panel tests provide prior art for stable user-facing locators. Tests cover group headings, counts, selected-row state, decorative Logo behavior, fallback rendering, collapsed other listeners and preserved selection.
- Search behavior is tested at the panel boundary: an unrelated listener hidden in the default view must appear when its executable, application name, port or PID is searched.
- Pinning is tested through observable Browser preference behavior: pin an `other` listener, reload the Browser surface, confirm it appears in “固定显示”, then unpin it and confirm it returns to the collapsed group.
- Asset-pipeline tests use local fixtures rather than the public internet. They cover allowlisted and rejected domains, MIME validation, size limits, SVG active-content rejection, stable generated output and missing-asset fallback.
- The built Client artifact is inspected to confirm it contains local toolchain assets and performs no runtime requests to official toolchain domains.
- Accessibility tests verify semantic buttons, `aria-pressed` row selection, keyboard focus, non-duplicated Logo announcements and meaningful collapsed-group controls.
- The highest acceptance seam is the existing opt-in Stock DSH Web smoke. It must restart a real Profile, render the Client artifact, verify the default development groups, search a collapsed external listener, select a listener, observe the matching detail Logo, and prove the existing action path still produces a fresh Host scan without harming the DSH Web listener.
- Visual acceptance at 1280 × 720 verifies that the selected row uses the approved calm indicator, development rows remain scannable with Logos, and the left pane does not become wider or less dense than the accepted prototype.
- Authoritative verification includes build, no-emit typecheck, deterministic tests, `git diff --check`, the native Windows lifecycle gate when Host projection changes, and the real Web smoke.

## Out of Scope

- CPU, memory and other live process metrics.
- Full Windows Shell executable icon extraction, HICON conversion and Task Manager-compatible application grouping.
- Pixel-perfect packaged/MSIX application icon support.
- Arbitrary online favicon discovery at Bundle runtime.
- User-provided icon URLs or automatic domains derived from executable names.
- Port-number-only framework detection.
- Deep Docker container inspection or WSL Linux process inspection when no certified mapping capability exists.
- Changing Verified attribution, inferred attribution, Process identity, Lifecycle owner, Managed shutdown or Direct external termination policy.
- Changing the model-facing `port_list` Tool.
- Dark theme; the accepted UI remains light/white.
- Replacing DSH Web navigation, Conversation, composer or application root.

## Further Notes

- The accepted high-fidelity prototype is the visual reference for grouping, search, pinning, Logo placement and the “开发端口” hierarchy. The production selected-row treatment follows the later approved quiet-indicator refinement rather than the prototype’s complete blue outline.
- Existing process-visual research recommends executable icons and explicitly treats identical Node icons as correct. This specification refines that decision for the human-facing development workflow: a deterministically identified toolchain may use its toolchain Logo; executable or generic process identity remains the fallback. Documentation must be reconciled before implementation so the distinction is explicit.
- Logo is a presentation aid, not evidence. Text labels remain canonical and must be sufficient when images are unavailable.
- Official marks are used only to identify the corresponding toolchain. Source and trademark notes should be retained with the asset manifest; this specification does not grant rights beyond the applicable upstream terms.
- The implementation should begin with a narrow catalog that covers fixtures and observed user workflows, then expand through reviewed entries. A large speculative signature database is not required for acceptance.
