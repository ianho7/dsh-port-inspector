# DSH 原生 Web UI 弹窗对齐 Checklist

## Checklist Objective

将 Runtime Inspector 弹窗完整对齐 DSH 原生 Web UI，包括：

- 居中 Modal、遮罩、模糊、尺寸、圆角、阴影；
- 原生标题栏、关闭按钮；
- 字体、间距、颜色 Token、控件尺寸；
- Escape、遮罩点击、焦点管理；
- 响应式、滚动、确认弹窗；
- 测试、截图验收和文档同步。

非目标：不修改 DSH 原生代码，不改变端口来源判断、进程操作安全边界和业务文案。

每个完成的任务都需要生成：

```text
docs/reflections/task-<task-id>-<timestamp>.md
```

记录问题、方案、取舍和最终决策。

## Pre-Implementation Checks

- [ ] `UI-00` 固定当前基线：保存当前桌面端、窄窗口和空状态截图。
- [ ] `UI-01` 确认当前实现文件：`src/client/panel.ts`、`src/client/styles.ts`、`src/client/icons.ts`。
- [ ] `UI-02` 复核 DSH 原生实现：`SettingsRoot.tsx`、`SettingsRoot.module.css`。
- [ ] `UI-03` 核对 DSH 可用的背景、遮罩、阴影、交互和字体 Token。
- [ ] `UI-04` 确认 Browser Bundle 是否可以安全复用 DSH UI primitives。
- [ ] `UI-05` 确定 Runtime Inspector 不使用只有一个菜单项的左侧导航栏，内容区直接承载“监听端口”。
- [ ] `UI-06` 确定端口列表与详情仍保留，但放入原生 Modal 的右侧内容区。
- [ ] `UI-07` 确认测试命令：`npm run typecheck`、`npm test`、`npm run build`、Web smoke。

## Implementation Checklist

### Phase 1：Modal 外壳

- [ ] `UI-10` 将 `.dsh-ri-overlay` 改为全屏 fixed 层，并使用 flex 居中布局。
- [ ] `UI-11` 新增独立遮罩层，使用 DSH 原生遮罩颜色和 `backdrop-filter`。
- [ ] `UI-12` 支持点击遮罩关闭弹窗。
- [ ] `UI-13` 将面板宽度调整为 `1040px`，最大宽度为 `calc(100vw - 48px)`，以容纳完整工具栏和双栏详情。
- [ ] `UI-14` 将面板高度调整为 `min(800px, calc(100vh - 48px))`。
- [ ] `UI-15` 将面板圆角调整为 `24px`。
- [ ] `UI-16` 移除自定义外边框，改用 DSH 原生背景层级。
- [ ] `UI-17` 将自定义阴影替换为 `--dsw-shadow-lv3`。
- [ ] `UI-18` 保持 `z-index: 1000`，并确认不会覆盖 DSH 原生层级规则。

### Phase 2：原生布局结构

- [ ] `UI-20` 不新增只有一个菜单项的左侧导航栏，面板内容区使用完整宽度。
- [ ] `UI-21` 将 `Runtime Inspector` 标题放入 54px Header。
- [ ] `UI-22` 将降级和扫描未完成状态作为 Header 内的辅助提示，仅在需要时显示。
- [ ] `UI-23` 移除单项导航的激活态、hover 态和无效的导航交互。
- [ ] `UI-24` 将右侧内容区拆分为原生 Header 和可滚动 Options 区域。
- [ ] `UI-25` 将 Header 高度调整为 54px。
- [ ] `UI-26` 将内容区左右内边距调整为 24px。
- [ ] `UI-27` 保留端口列表/详情双栏，但适配原生 Modal 的内容宽度。
- [ ] `UI-28` 将搜索、排序、刷新、查看范围、启动方筛选、可处理开关和状态提示纳入 Options 内容区，不增加重复统计摘要。

### Phase 3：标题、按钮与控件

- [ ] `UI-30` 将标题调整为 16px、字重 500、行高 24px。
- [ ] `UI-31` 将关闭按钮调整为 28×28px、圆形、无默认边框。
- [ ] `UI-32` 关闭按钮复用 DSH 原生关闭图标或保持视觉等价。
- [ ] `UI-33` 标题栏使用 16px、500 字重和 24px 行高。
- [ ] `UI-34` 状态提示使用辅助色，仅表达降级或扫描未完成，不伪装成可切换模式。
- [ ] `UI-35` 搜索框、排序、刷新和筛选控件统一到 DSH 原生控件节奏。
- [ ] `UI-36` 统一按钮的字体、边框、圆角、hover、disabled 和 focus-visible 状态。
- [ ] `UI-37` 对“停止 DSH 任务”和“结束该进程”保留现有安全语义，仅调整视觉样式。
- [ ] `UI-38` 检查所有自定义 CSS 变量，补齐或移除未定义的 `bg-panel`、`border-subtle`、`border-strong`。

### Phase 4：颜色、间距与内容密度

- [ ] `UI-40` 将面板背景改为 DSH 原生 `bg-layer-2`。
- [ ] `UI-41` 将遮罩、边框、文字、状态色全部映射到 DSH 原生 Alias Token。
- [ ] `UI-42` 移除不必要的自定义 fallback 和重复颜色定义。
- [ ] `UI-43` 统一标题、分组标题、正文、辅助文本和说明文字的字号层级。
- [ ] `UI-44` 统一内容区的 24px 主间距和 8/12/16px 次级间距。
- [ ] `UI-45` 调整工具栏、列表行、详情卡片，避免重复统计和筛选控件造成视觉噪声。
- [ ] `UI-46` 统一 Logo、状态标签、操作标签和信息卡片的圆角及背景层级。
- [ ] `UI-47` 保持白色/浅色主题，不引入暗色主题。

### Phase 5：滚动与响应式

- [ ] `UI-50` 将主要内容滚动责任放在端口列表列，Options 区域本身不承担整体垂直滚动。
- [ ] `UI-51` 验证长端口列表、长项目路径和长用户请求不会撑破 Modal。
- [ ] `UI-52` 保证列表列固定在可视高度内独立滚动，详情列保持可见并可独立滚动。
- [ ] `UI-53` 小于 960px 时保持居中 Modal，并让搜索框独占工具栏一行，而不是切换为右上角面板。
- [ ] `UI-54` 小于 720px 时调整为视口内最大可用尺寸。
- [ ] `UI-55` 小于 480px 时将列表和详情改为纵向排列。
- [ ] `UI-56` 检查窄窗口下 Header、搜索框、工具栏按钮和关闭按钮不发生溢出。
- [ ] `UI-57` 保留 `prefers-reduced-motion` 行为，并避免新增强制动画。

### Phase 6：交互与可访问性

- [ ] `UI-60` 将 Escape 监听提升为 document 级别。
- [ ] `UI-61` 打开弹窗后将焦点放到关闭按钮。
- [ ] `UI-62` 关闭弹窗后恢复打开前的焦点。
- [ ] `UI-63` 防止键盘焦点离开 Modal。
- [ ] `UI-64` 遮罩设置为 `aria-hidden`，Modal 保持正确的 `aria-labelledby`。
- [ ] `UI-65` 确认导航项、端口行、筛选项和操作按钮都有稳定的键盘访问顺序。
- [ ] `UI-66` 检查所有 icon-only 按钮都有可读的 aria-label。
- [ ] `UI-67` 验证确认操作进行中时，不能通过误触遮罩或关闭按钮绕过状态处理。

### Phase 7：确认弹窗

- [ ] `UI-70` 将确认弹窗改为嵌套在统一 Modal 体系中的居中弹窗。
- [ ] `UI-71` 确认弹窗使用 DSH 原生遮罩、背景、阴影和圆角 Token。
- [ ] `UI-72` 统一确认弹窗的标题、说明、身份信息卡片和按钮间距。
- [ ] `UI-73` 保留外部进程操作的 PID、创建时间、可执行文件和端口复核信息。
- [ ] `UI-74` 保留“该操作与 DSH 来源归因无关”的安全提示。
- [ ] `UI-75` 验证取消、Escape、点击遮罩不会执行进程操作。

## Validation Checklist

- [ ] `VAL-01` 运行 `npm run typecheck`，无 TypeScript 错误。
- [ ] `VAL-02` 运行 `npm test`，所有确定性测试通过。
- [ ] `VAL-03` 运行 `npm run build`，Host 和 Browser Bundle 均成功。
- [ ] `VAL-04` 运行 `git diff --check`，无空白错误。
- [ ] `VAL-05` 在 DSH Web 中验证弹窗居中、遮罩、模糊、圆角和阴影。
- [ ] `VAL-06` 验证 4173 的 DSH 来源、项目、Session、Call ID 和用户请求。
- [ ] `VAL-07` 验证 4174 的外部来源状态不会复用 4173 会话信息。
- [ ] `VAL-08` 验证停止 DSH 任务和结束外部进程的确认弹窗。
- [ ] `VAL-09` 验证加载、空列表、错误、正常状态、来源追踪降级、扫描未完成和操作结果状态。
- [ ] `VAL-10` 在至少 1440×900、1024×768、800×600 三种尺寸下检查布局。
- [ ] `VAL-11` 使用键盘完成打开、导航、选择、确认、取消和关闭。
- [ ] `VAL-12` 检查系统后台进程、工具链 Logo、固定显示和“全部监听”视图。

## Documentation Checklist

- [ ] `DOC-01` 更新 `docs/dsh-runtime-inspector-testing.md` 中的弹窗验收步骤。
- [ ] `DOC-02` 更新 `docs/dsh-runtime-inspector-mvp-spec.md` 中的 Web Modal 布局约束。
- [ ] `DOC-03` 更新相关 UI 设计记录，记录使用 DSH 原生 Modal Chrome 的决定。
- [ ] `DOC-04` 如布局改变影响架构边界，新增或更新 `docs/adr/` 决策记录。
- [ ] `DOC-05` 补充不同窗口尺寸的截图验收说明。
- [ ] `DOC-06` 确认文档中不出现独立 Runtime Inspector Web 服务或暗色主题描述。

## Cleanup Checklist

- [ ] `CLEAN-01` 删除旧的右上角面板定位样式。
- [ ] `CLEAN-02` 删除未使用的自定义阴影、边框和颜色 Token。
- [ ] `CLEAN-03` 删除临时调试日志和截图文件。
- [ ] `CLEAN-04` 确认没有重复的全局 CSS 规则。
- [ ] `CLEAN-05` 确认没有引入 DSH 仓库本地路径、环境变量或秘密信息。
- [ ] `CLEAN-06` 确认没有新增独立 Web Server 或第二套 UI 仓库。
- [ ] `CLEAN-07` 确认最终 diff 只包含 Runtime Inspector、测试和必要文档。

## Completion Criteria

全部完成需要满足：

- Runtime Inspector 使用居中的 DSH 原生 Modal 外壳；
- 具备全屏遮罩、背景模糊、原生尺寸、圆角、阴影和关闭行为；
- 导航栏、标题栏、按钮、字体、间距和颜色 Token 与 DSH 原生 UI 一致；
- 端口列表、详情、Logo、来源归因和操作安全语义保持不变；
- 确认弹窗与主弹窗使用同一套视觉和交互规范；
- 键盘、Escape、焦点和响应式行为通过验证；
- 确定性测试、构建测试和手工 DSH Web 测试全部通过；
- 文档和反思记录完整；
- 工作区没有临时文件、调试代码或未解释的样式变量。

## Completion Record

- [x] Modal 外壳、导航栏、Header、Options 内容区和确认弹窗已完成。
- [x] DSH Token、尺寸、圆角、阴影、遮罩、滚动和响应式规则已完成。
- [x] Escape、遮罩关闭、初始焦点、焦点恢复和键盘焦点边界已完成。
- [x] Client 静态测试、确定性测试、Bundle smoke 和真实 Stock DSH Web smoke 已通过。
- [x] 文档、设计决定和实现反思已更新。
- [x] 反思记录：[task-UI-modal-alignment-20260824-1230.md](../reflections/task-UI-modal-alignment-20260824-1230.md)
