# DSH 中英切换与当前语言可观测性调研

> 调研对象：`D:\project\deepseek-harness` 工作树
> 调研日期：2026-08-26
> 范围：只读源码研究；本稿是 Runtime Inspector 的独立调研草稿，不修改 DSH 或本仓库生产代码。

## 摘要结论

DSH 的当前生效语言由 Browser 侧 `@deepseek-ai/dsh-client-locale/client` 导出的 `LocaleRuntime` 持有，权威字段是 `LocaleSnapshot.active`。它不是从 HTML、全局变量或 RPC 响应直接读取的单一值。

启动时，`LocaleRuntime` 先根据 Browser 的 `navigator.languages`（按顺序）和 `navigator.language` 做主语言子标签匹配；没有 `zh`/`en` 命中时使用 `en`。如果 Host settings 已经提供 `locale.preference`，该显式值随后覆盖浏览器推断值；没有显式 preference 时，仍回到本次 Browser 进程的 provisional 值。

Host 持久化的是用户的显式偏好 `locale.preference`，不是 Browser 当下的完整生效状态。默认文件 provider 将它存放在 `$DSH_HOME/settings.yaml` 的 `locale` section；远程 Browser 因 settings RPC 的 loopback 限制只保留进程内选择。

对 Bundle/Browser/client 来说，最可靠的读取方式是客户端 Cordis service `ctx.locale.getLocale().active`（或 `getSnapshot().active`），并可通过 `subscribe()` 或 `locale/change` 跟踪变化。Host Bundle 只有 `ctx.settings` 的 preference 视图，没有稳定的 Host API 能读取 Browser 推断后的当前 active locale；当前 active 也没有专用 Remote/RPC 方法。

`document.documentElement.lang` 是 DSH 有意维护的 DOM 投影：`zh` 映射成 `zh-CN`，`en` 映射成 `en`。插件激活时和每次切换时都会同步，因此在 locale client 已激活之后可作为较可靠的 Browser DOM fallback；但它在插件激活前可能仍是 HTML 静态值 `en`，且它表达的是 BCP 47 文档标签，不是内部 locale id。

没有发现语言专用的 HTML meta、根节点 `data-*`、全局对象或 local/session storage 信号。`window.__DSH_BOOT__`、`window.__ModuleLoader__` 和 `globalThis.__DSH_TRANSPORT__` 属于 Web boot/module transport，不携带当前语言。

本仓库的 `src/client/` 当前没有独立的 i18n 层：Browser `apply()` 只组装 RPC、slots 和 sessions；面板文案集中写在 `panel.ts`，日期格式在 `session-context.ts` 中固定使用 `zh-CN`。因此这次接入不需要迁移既有翻译框架，增加一个很薄的 locale 读取层和本地双语字典即可。

## 1. 中英切换的实现与真实状态来源

### 1.1 Host 持久化 section

源码证据：`D:\project\deepseek-harness\packages\client\locale\src\locale-settings.ts:5-25` 定义 `LOCALE_SETTINGS_NAMESPACE = 'locale'`、字段 `LOCALE_PREFERENCE_FIELD = 'preference'`、支持的 locale id `['zh', 'en']` 和可选的 `LocaleSettings.preference`。缺少 preference 是合法状态，语义是把选择权交给 Browser。

源码证据：`D:\project\deepseek-harness\packages\client\locale\src\index.ts:12-23` 的 Host `apply(ctx)` 在 `ctx.settings` 存在时注册 `settingsNamespace('locale')` 和 `LocaleSettingsSchema`。这个 Host half 只注册持久化配置，不创建或暴露 Browser 的 `LocaleRuntime`。

源码证据：`D:\project\deepseek-harness\packages\settings\settings\src\index.ts:102-129` 定义 Host `SettingsScope<T>` 的 `get()`、`watch()`、`update()` 和 `replace()`；`packages/settings/settings/src/index.ts:350-386` 的 `SettingsProvider` 负责加载 raw document 后解析并发布；`packages/settings/settings/src/index.ts:696-709` 明确解析顺序为 schema defaults → composition `base` → user section。

源码证据：`D:\project\deepseek-harness\packages\settings\settings-file\src\index.ts:20-29` 说明 file provider 的默认路径是 harness home 下的 `settings.yaml`；`packages/settings/settings-file/src/index.ts:49-66` 的 `resolveSpec()` 将缺省 path 解析为 `<harness home>/settings.yaml`；`packages/settings/settings-file/src/index.ts:170-181` 读取文件，`packages/settings/settings-file/src/index.ts:184-190` 进入持久化队列。

因此，Host 的真实持久化来源是 `settings.yaml` 中的 `locale.preference`（或其他 provider 提供的同一 settings namespace）。在当前 schema 没有默认 preference/base 的情况下，Host 侧通常读到 `{}` 或未设置的 preference，而不是 Browser 推断的 `active`。

### 1.2 Browser 初始解析与 active 状态

核心实现位于 `D:\project\deepseek-harness\packages\client\locale\src\client\index.ts`，符号为 `LocaleRuntime`。

- `LocaleSnapshot` 在 `packages/client/locale/src/client/index.ts:62-70` 定义，`active` 是当前 locale id，`locales` 是可选项，`revision` 是单调递增变更计数。
- `FALLBACK_LOCALE` 在 `packages/client/locale/src/client/index.ts:89-98` 固定为 `en`，同时承担无可用 Browser 语言时的初始 fallback 和字典 fallback。
- `DOCUMENT_LANGUAGE` 与 `syncDocumentLanguage()` 在 `packages/client/locale/src/client/index.ts:112-132` 将内部 `zh`/`en` 映射到文档 `zh-CN`/`en`，并写入 `document.documentElement.lang`。
- `LocaleRuntime` 的字段和构造函数在 `packages/client/locale/src/client/index.ts:144-169`：构造时调用 `resolveInitialLocale()`，以 provisional 值创建 revision 0 的 snapshot；如果有 Host settings scope，则订阅它并立即 `adopt()`。
- `getLocale()` 在 `packages/client/locale/src/client/index.ts:171-177` 返回当前 immutable snapshot；`getSnapshot()` 在 `packages/client/locale/src/client/index.ts:179-186` 提供同一 snapshot 给 `LocaleFace`。
- `setLocale(id)` 在 `packages/client/locale/src/client/index.ts:200-217` 校验已注册 id；改变 active 时发布新 snapshot，并通过 `host.set('preference', match.id)` 写入 Host preference。即使重复选择当前 provisional 值也会写入 preference，因此显式选择可以跨 Browser/共享 DSH home 保持。
- `adopt(host)` 在 `packages/client/locale/src/client/index.ts:219-230` 使用 `section.preference ?? this.provisional`；这就是“显式 Host preference 覆盖 Browser 推断、清除 preference 后回到本 Browser provisional 值”的实际规则。
- `resolveInitialLocale()` 在 `packages/client/locale/src/client/index.ts:352-358` 使用 `detectBrowserLocale()`，无命中时返回 `en`。
- `detectBrowserLocale()` 在 `packages/client/locale/src/client/index.ts:360-381` 只在 `window` 存在时工作，按 `navigator.languages` 再接 `navigator.language` 遍历，转小写后取 `-` 前的 primary subtag；所以 `zh-Hant-TW` → `zh`、`en-GB` → `en`，不支持的语言不做近似匹配而继续寻找或最终 fallback `en`。显式检查 `window` 也防止 Node 的 global `navigator` 误决策非 Browser boot。

### 1.3 Browser plugin、字典和设置 UI

`D:\project\deepseek-harness\packages\client\locale\src\client\index.ts:383-434` 的 `apply(ctx)` 是 Browser plugin 的组装入口：

- `packages/client/locale/src/client/index.ts:392-397` 绑定 `settingsScope` 的 `locale` namespace，创建 `LocaleRuntime`，注册 `common` 和 `settings.locale` 的中英字典，并通过 `ctx.provide('locale', locale)` 发布客户端 service。
- `packages/client/locale/src/client/index.ts:398-400` 把同一个 runtime 安装为 `ctx.slots.installLocale(locale)` 的 `LocaleFace`，使标准 locale seat 的翻译函数从它读取。
- `packages/client/locale/src/client/index.ts:404-416` 在 `locale/change` 时同步 DOM 和设置行 store，并在 plugin activation 时先同步一次，避免 HTML 静态值或激活前的 provisional/Host adoption 被遗漏。
- `packages/client/locale/src/client/index.ts:426-433` 将 `LanguageRow` 注册到 `settings.general.item`，其 `locale` namespace 是 `settings.locale`。

设置行本身在 `D:\project\deepseek-harness\packages\client\locale\src\client\LanguageRow.tsx:14-23,30-64`：`LanguageRowInjected.setLocale` 是写入口；组件从 store 读取 `active` 和选项，并将按钮选择转给 `setLocale()`。store 的镜像字段在 `packages/client/locale/src/client/settings-store.ts:16-24,35-46`，它不是独立事实源，唯一写入者是 plugin 的 snapshot sync。

字典实现位于 `D:\project\deepseek-harness\packages\client\locale\src\locales\settings.ts:1-14`（Language 行的 `语言`/`Language`）和 `packages/client/locale/src/locales/index.ts:1-8`（公共字典 pair）。字典 lookup 在 `packages/client/locale/src/client/index.ts:312-324`，按当前 active → English fallback → common namespace → key 本身处理；这属于显示文本分辨率，不应作为当前 locale 状态的来源。

Web Profile 的 bundle composition 在 `D:\project\deepseek-harness\packages\bundle\web-app\cordis.patch.yml:173-202`，其中 `id: locale` 使用 `@deepseek-ai/dsh-client-locale`，且 `api-remotes`、`client-runtime`、`ui-renderer` 等先后被组装。因此该 locale client 是标准 Web bundle 的立即加载基础设施，而不是独立的第二个服务。

## 2. Bundle/Browser/client 可用的公开或稳定 API

### 2.1 Browser/client：有，且当前 active 的首选 API 是 `ctx.locale`

包导出证据：`D:\project\deepseek-harness\packages\client\locale\package.json:16-30` 暴露 package root、`./invariant`、`./client` 和 `./src/*`；`./client` 的类型入口是 `lib/types/client/index.d.ts`，说明 Browser face 是正式 package export，不是只能从内部相对路径访问的实现细节。

客户端可直接使用的类型/符号证据：`packages/client/locale/src/client/index.ts:32-40` 导出 `LocaleId`、`LocaleSettings`、`LocaleRuntime` 相关类型以及 `Translate`/`TranslateNS`；`packages/client/locale/src/client/index.ts:62-70` 导出 `LocaleSnapshot` 类型；`packages/client/locale/src/client/index.ts:72-86` 通过 Cordis module augmentation 声明 `Context.locale: LocaleRuntime` 和 `locale/change` 事件。

因此 Browser/client 侧的稳定读取面是：

```ts
const active = ctx.locale.getLocale().active
// 或：ctx.locale.getSnapshot().active
const off = ctx.locale.subscribe(() => {
  const next = ctx.locale.getSnapshot().active
})
```

如果调用方只需要翻译而不需要 locale id，可使用 `ctx.slots` 的标准 locale seat。其公共契约在 `D:\project\deepseek-harness\packages\client\ui-slots\src\renderer.ts:5-28` 的 `LocaleFace`，提供 `getSnapshot()`、`subscribe()` 和 `bind(ns)`；但这里的 `getSnapshot()` 类型只有 `{ revision: number }`，不包含 `active`，所以不能把 generic `LocaleFace` 当作当前语言 id API。

`ctx.slots.installLocale()` 的安装契约在 `D:\project\deepseek-harness\packages\client\runtime\src\client\slots.ts:224-237`；渲染 host 在 `packages/client/runtime/src/client/slots.ts:396-418` 通过 live getter 取安装中的 locale face。这个 getter 是渲染基础设施的 live projection，不向 Host Bundle 提供 `LocaleSnapshot.active`。

### 2.2 Host Bundle：只能稳定读取持久化 preference，不能读取完整 active

Host 侧 root export `D:\project\deepseek-harness\packages\client\locale\src\index.ts:7-10,12-23` 只导出 `LOCALE_IDS`、`LOCALE_PREFERENCE_FIELD`、`LOCALE_SETTINGS_NAMESPACE`、类型和 Host `apply()`。`LocaleRuntime` 位于 `./client` face，且 Browser/Host 是不同构建面；Host Bundle 不应凭 `ctx.locale` 假定 Browser service 在同一个 Host context 中存在。

若 Host 只关心用户是否明确设置过语言，可以通过公开 settings service 的 `ctx.settings.get(ns)`/scope API 读取 `locale` namespace。证据是 `D:\project\deepseek-harness\packages\settings\settings\src\index.ts:131-135` 的 `Context.settings` 声明、`packages/settings/settings/src/index.ts:514-521` 的 `SettingsProvider.get(ns)` 以及 `packages/client/locale/src/index.ts:16-23` 的 namespace registration。但该值在没有 `preference` 时不会包含 Browser 的 `navigator` 推断结果，也不能代表远程或当前 Browser 的 `LocaleRuntime.active`。

Host settings watch/event 也只表示持久化 document/resolved section 变化：`D:\project\deepseek-harness\packages\settings\settings\src\types.ts:27-48` 声明 `settings/updated` 和 `settings/document-updated`；`packages/settings/settings/src/index.ts:719-723` 在 raw section 变化时递增 revision 并发布 document event。它们不是客户端 `locale/change` 的转发。

### 2.3 Browser-to-Host Remote：没有 locale 专用公开 API

Host API 的 settings contract 在 `D:\project\deepseek-harness\packages\host\apiproxy\src\api\settings.ts:19-40,52-105`：`SettingsNamespaceView` 只有 `ns`、schema、resolved `value`、base/user、revision 等；`SettingsApi` 只有 `describe`、`openDocument`、`update`、`replace`、`mutate`。没有 `locale.get`、`language.get` 或 active-locale 字段。

RPC map 在 `D:\project\deepseek-harness\packages\host\apiproxy\src\api\rpc-map.ts:66-70` 只映射 `settings.describe/openDocument/update/replace/mutate`；Client API 的统一 re-export 在 `packages/client/connection/src/client/api.ts:8-36` 也只暴露相同 settings 类型。`packages/client/connection/src/index.ts:69-79,110-118` 还明确把这些 settings methods 视为 loopback-only 的配置面。

Remote assembly 的 `D:\project\deepseek-harness\packages\api\remotes\src\client\index.ts:21-32,39-48` 只选择并 re-export既有 Host remote 类型；forwarded event allowlist 在 `packages/api/remotes/src/remote-events.ts:22-29` 包含 `settings/document-updated`，没有 `locale/change`。所以客户端 settings mirror 能收到 Host document invalidation，但 Browser locale switch 的 `locale/change` 是同一客户端 Cordis context 内的本地事件，不是稳定的 Host-to-Browser locale RPC。

客户端 settings mirror 的来源与边界在 `D:\project\deepseek-harness\packages\client\ui-settings\src\client\index.ts:1-8,34-68` 和 `packages/client/ui-settings/src/client/settings-mirror.ts:1-9,17-25,41-67`：它以一次 `settings.describe` 为 Host document mirror，监听 `settings/document-updated`/`connection/reset` 后重读。`SettingsScopeController.derive()` 在 `packages/client/ui-settings/src/client/settings-scope.ts:184-223` 只从 Host 的 namespace view 解码 `LocaleSettings`，因此它可以为 `LocaleRuntime.adopt()` 提供 preference，但不会凭空生成 `active`。

## 3. HTML、meta、data-*、根节点和全局对象信号

### 3.1 `<html lang>`：激活后可靠，激活前只是初始值

静态 HTML 证据：`D:\project\deepseek-harness\apps\web\index.html:1-13` 的根节点是 `<html lang="en">`，head 只有 charset、viewport、manifest、favicon 和静态 title；没有语言 meta。

运行时投影证据：`D:\project\deepseek-harness\packages\client\locale\src\client\index.ts:112-132` 定义 `DOCUMENT_LANGUAGE = { zh: 'zh-CN', en: 'en' }` 并写入 `document.documentElement.lang`；`packages/client/locale/src/client/index.ts:404-416` 在变化和 activation 两个时点调用同步函数。

可靠性评估：

- 在确认 locale plugin 已 activation 后，`document.documentElement.lang` 是 Browser DOM 中最有价值的 fallback；它会随 active 切换更新。
- 在 locale plugin activation 前，读到的 `en` 只能解释为服务端/静态 markup 的初始声明，不能证明当前 Browser 将使用 English；中文 Browser 或 Host preference 可能随后把它改为 `zh-CN`。
- 它是 BCP 47 文档语言标签，不是内部 `LocaleId`。读取方必须做显式映射（当前 `zh-CN` → `zh`、`en` → `en`），并对未来新增区域/脚本标签保持未知处理。
- 它是 DOM 可变投影，其他脚本或宿主可以修改，且不能表达“Host preference 尚未加载”和“当前 active 正在变更”的中间状态。因此它适合无 Cordis context 时的降级观察，不适合作为业务权威状态。

### 3.2 HTML meta：没有语言信号

`D:\project\deepseek-harness\apps\web\index.html:3-8` 仅有 `<meta charset>` 与 `<meta name="viewport">`。源码范围内没有 `meta[name="language"]`、`Content-Language` 或等价的语言元数据；`meta[name="theme-color"]` 若由其他 UI 模块维护也只描述主题，不描述 locale。

结论：不能通过 meta 稳定获取当前语言；新增或修改 meta 也不是现有 DSH locale contract 的一部分。

### 3.3 根节点属性和 `data-*`：没有 locale 属性

`apps/web/index.html:10-12` 的应用根只有 `<div id="root"></div>`。locale client 只写 `document.documentElement.lang`，没有写 `data-locale`、`data-language` 或 root class；对应的全仓源码检索也只发现与主题、slot、布局和 boot 状态有关的 `data-*`，没有语言字段。

可见的相似信号不可靠：例如 `body[data-ds-dark-theme]` 来自 `packages/client/ui-theme/src/boot-theme.ts:19-20`，是 dark/light 主题投影，不应被当作语言；`data-slot`/`data-dsh-boot` 来自 renderer/boot 页面，也不含 locale。

### 3.4 全局对象：只有 boot/transport，全局无当前语言

Web boot 读取的全局对象在 `D:\project\deepseek-harness\packages\client\web\src\boot.ts:46-66,97-105`：`window.__ModuleLoader__`、`window.__DSH_BOOT__` 和可选 `globalThis.__DSH_TRANSPORT__` 用于 module loader、boot manifest 和 bundle transport。

这些对象的 Host 注入位置在 `D:\project\deepseek-harness\packages\client\modules\src\index.ts:241-272`，只创建 `window.__ModuleLoader__` 并注入 `__DSH_BOOT__` graph；源码没有把 locale 或 language 字段放入其中。`ctx.locale` 是 Cordis Context service，不是 `window`/`globalThis` 属性。

结论：不要从 `window.__DSH_BOOT__`、`window.__ModuleLoader__`、`__DSH_TRANSPORT__` 或任意未声明的全局属性猜测当前语言。除非未来正式扩展 contract，否则它们不提供可用信号。

### 3.5 `navigator`、localStorage、可见文本：仅能辅助判断

`navigator.languages`/`navigator.language` 只在 `detectBrowserLocale()` 的构造阶段参与 provisional 选择，证据为 `D:\project\deepseek-harness\packages\client\locale\src\client\index.ts:360-381`。用户切换到另一个 locale 后，`navigator` 不会改变，因此它不是当前 active 的读取 API。

相关 locale client、Web entry 和 UI 源码没有使用 `localStorage` 或 `sessionStorage` 保存当前语言；持久化路径是 Host settings scope，具体写入入口为 `LocaleRuntime.setLocale()` 的 `packages/client/locale/src/client/index.ts:200-217`。

Language 设置按钮的显示文本 `中文`/`English` 来自 `LanguageRow` 的 `activeLabel`（`D:\project\deepseek-harness\packages\client\locale\src\client\LanguageRow.tsx:30-60`），但它依赖设置面板已挂载、字典已注册和 UI 没有被其他渲染错误打断；文本是 label 而不是 id，且未来可翻译/改文案。因此它只能作为人工排查线索，不能作为 Bundle 的机器判定依据。

## 4. 当前 `src/client/` 的接入边界

### 4.1 当前没有可复用的翻译入口

- `D:\project\dsh-runtime-inspector\src\client\index.ts:1-16` 的 Client `apply(ctx)` 只创建 Browser RPC、注册 Sidebar/Overlay；它没有读取 `ctx.locale`，也没有把 locale 传给 panel。
- `D:\project\dsh-runtime-inspector\src\client\slots.ts:4-21` 的 `RuntimeInspectorClientContext` 只声明 `slots` 和 `sessions`；当前 slot options 也只有静态的 `label`，没有 locale namespace。
- `D:\project\dsh-runtime-inspector\src\client\panel.ts:159-176,256-297,963-1083` 直接返回中文用户文案，包含操作按钮、状态、ARIA label、搜索提示、筛选项和空状态。它没有统一的 `t(key)` 或 message table。
- `D:\project\dsh-runtime-inspector\src\client\session-context.ts:113-147` 的 `formatDate()` 固定调用 `new Intl.DateTimeFormat('zh-CN', ...)`；这会在英文 DSH 中继续生成中文日期格式。
- `D:\project\dsh-runtime-inspector\src\client.ts:1` 只是转出 Client `apply`/`inject`，没有额外的运行时服务。

### 4.2 这决定了最小改动的形状

当前面板已经是 Browser-only、可序列化 RPC 边界。locale 只应作为 Browser presentation state 加入，不应进入 Host DTO、进程归因或 Host action。最小改动可以集中在四处：

1. 给 Client context 增加结构化的可选 `locale` face，读取 `ctx.locale.getSnapshot().active`。
2. 建一个 `zh`/`en` 的本地 message table，并把 `panel.ts` 的用户文案逐步改为 `t('key', params)`。
3. 使用 locale 订阅让面板在 DSH 切换语言后重新渲染；如果当前 slot 生命周期保证整页重载，也可以先在组件创建时读取一次，但订阅成本很低，建议直接保留。
4. 把 `formatDate()` 改成接收 locale，例如 `zh` 使用 `zh-CN`、`en` 使用 `en-US`，不要读取 `navigator.language` 代替 DSH active。

现有 `tests/client-panel.test.mjs` 和 `tests/client-session-context.test.mjs` 通过源码匹配和固定日期结果验证中文行为；真正实现时应把断言改为验证 key/双语结果，同时补充 `zh`、`en` 和未知 locale 的 fallback，不需要改变 Host/Browser RPC contract。

## 5. 对 Runtime Inspector 的建议性结论

如果 Runtime Inspector Browser Client 能注入 DSH locale service，应优先读取 `ctx.locale.getSnapshot().active`，用 `ctx.locale.subscribe()` 或 `locale/change` 更新自身 UI；不要建立第二份语言状态，也不要从 `navigator` 或按钮文本反推。

如果调用点只有 DOM 而没有 Cordis context，读取 `document.documentElement.lang` 是现有实现唯一明确维护的当前语言投影，但必须等待/确认 locale client 已启动，并将 `zh-CN` 映射成内部 `zh`；启动早期读到 `en` 要标记为 provisional/unknown，而不是确认 English。

如果调用点在 Host Bundle，`ctx.settings.get(settingsNamespace('locale'))` 只能回答“Host 是否有显式 preference 以及其值”，不能回答“某个 Browser 当前 active 是什么”。不要把缺少 preference 的 Host 值解释成 `en`，因为 Browser 可能依据 `navigator` 当前为 `zh`。

调研结论可压缩为以下优先级：`ctx.locale.getSnapshot().active`（权威当前 active） > `document.documentElement.lang`（激活后的 DOM 投影） > `locale.preference`（仅显式持久化偏好） > `navigator.language(s)`/可见 UI 文本（仅初始或辅助线索）；meta、data-*、根节点其他属性和 boot 全局对象当前均无语言信号。

## 6. 最小方案示意

推荐先采用“读取 DSH locale + Bundle 本地字典”，不引入第二个服务，也不自行调用 `installLocale()`：

```ts
type RuntimeInspectorLocale = 'zh' | 'en'

function readLocale(ctx: RuntimeInspectorClientContext): RuntimeInspectorLocale {
  const active = ctx.locale?.getSnapshot().active
  if (active === 'zh' || active === 'en') return active

  const documentLang = document.documentElement.lang.toLowerCase()
  return documentLang.startsWith('zh') ? 'zh' : 'en'
}
```

生产实现需要给 `locale` face 补上 `getSnapshot()` 与 `subscribe()` 的结构类型，并对 `document` 不存在的测试/非 Browser 环境做保护。`document.documentElement.lang` 只作为兼容性 fallback；不要把 `meta`、`navigator` 或 `localStorage` 作为主路径。

如果将来希望复用 DSH 的翻译函数而不是维护本地 message table，可以让 slot component 声明 locale namespace，由 renderer 通过已安装的 `LocaleFace.bind(ns)` 注入 `t`。但 `SlotRegistry.installLocale()` 本身是 locale plugin 的安装 seam，普通 Bundle 不应直接调用；而且 generic `LocaleFace.getSnapshot()` 不带 `active`，读取当前语言仍应使用 `ctx.locale`。

## 7. 负向检索与边界

本次对 `packages/client/locale`、`packages/client/web`、`packages/client/runtime`、`packages/client/modules`、`packages/api/remotes`、`packages/host/apiproxy`、`packages/settings`、`packages/bundle/web-app` 和 `apps/web` 的源码/配置进行了关键词检索，重点检查 `locale`、`language`、`lang`、`navigator`、`documentElement`、`meta`、`data-*`、`localStorage`、`sessionStorage` 和 `globalThis/window`。

“没有发现”仅表示上述当前工作树与这些范围内没有对应实现；它不排除未来 DSH 版本新增 API，也不把未公开的运行时对象当作稳定契约。尤其是 `LocaleRuntime` 的 Browser export、`ctx.locale` 和 `locale/change` 已有明确源码/JSDoc/测试证据，而 DOM lang 是实现投影，settings RPC 是持久化配置面，三者的语义不能混用。

## 8. 关键测试证据

- `D:\project\deepseek-harness\packages\client\locale\tests\locale.client.spec.ts:141-178` 验证 `setLocale()` 发布、写入 preference，以及无 Host 时只保持进程内状态。
- `packages/client/locale/tests/locale.client.spec.ts:185-213` 验证 Host preference 覆盖 Browser 值、清除 preference 后回到 Browser-derived locale，并在 dispose 时释放监听。
- `packages/client/locale/tests/locale.client.spec.ts:215-244` 验证区域标签 primary-subtag 匹配、无可用语言 fallback `en` 和 Node 无 window 时不读取机器 navigator。
- `D:\project\deepseek-harness\packages\client\locale\tests\document-language.client.spec.ts:53-93` 验证 activation 会把静态 `lang="en"` 修正为 `zh-CN`，切换在 `zh-CN`/`en` 间同步，Host preference 可覆盖 Browser 检测。
- `packages/client/locale/tests/apply.client.spec.ts:81-129` 验证 client apply 注册 locale service、字典、settings row，并把 snapshot active 投影到 row store；`packages/client/locale/tests/host.client.spec.ts:16-29` 验证 Host 侧只注册并持久化可选 preference。
