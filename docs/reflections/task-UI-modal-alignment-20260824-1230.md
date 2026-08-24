# Runtime Inspector 原生 Modal 对齐反思

- Task: 完成 `dsh-native-modal-alignment.md` 中的 Modal 外壳、布局、样式、交互、可访问性和确认弹窗对齐
- Encountered Problem: 原 Runtime Inspector 使用右上角大面板，没有原生 DSH 的全屏遮罩、背景模糊、居中 Modal 和完整焦点行为；初版还保留了只有一个菜单项的导航栏，并让整个 Options 区承担垂直滚动，导致详情列滚到下方后出现空白。
- Thought Process: 先以 DSH `ui-settings-general` 的 `SettingsRoot` 作为几何和交互基线，再区分 DSH Chrome、Runtime Inspector 业务布局和真正对用户有价值的状态。单项导航不提供信息架构价值，因此将产品名放回 Header；内部 `observing`/`read-only-degraded` 只在降级或扫描未完成时以按需提示呈现。顶部四格摘要与范围、筛选重复，因此改为由“查看范围”“启动方”和“仅显示可处理”分别承载三个不同动作；端口列表和详情属于同一可视工作区，列表应独立滚动，详情保持可见。
- Options Considered: 直接引入 DSH Settings CSS Module；复制原生设置组件并改造成独立页面；在 Runtime Inspector 命名空间内复刻原生 Token、尺寸和行为约束，并为列表/详情建立独立滚动边界。
- Chosen Solution: 使用命名空间 CSS 在同一 Bundle 内复刻 DSH 原生 Modal Chrome，使用 54px Header、全屏遮罩、document 级 Escape、焦点进入/恢复和确认层焦点管理；移除单项导航；让 Options 只负责布局，body 占据剩余高度，列表列和详情列各自垂直滚动。顶部删除重复摘要，启动方标签统一为“由 DSH 启动 / 启动方未确认”，列表标题只显示当前可见项数量。后续验证发现 800px 宽度不足以稳定容纳工具栏和详情，因此将桌面宽度提升到 1040px，并在 960px 以下让搜索框独占一行、其他控件按组换行。
- Rationale: Browser Bundle 当前不应新增对 DSH 私有 CSS Module 或第二套 UI 仓库的运行时依赖；命名空间复刻可以保持单 Bundle、同源 Host RPC 和现有安全边界，同时达到原生视觉与交互一致性。1040px 让端口列表、详情和工具栏拥有足够的共同工作空间，窄窗口的明确换行规则则避免 flex 自动换行造成布局漂移。按需状态提示保留了降级可见性，又避免把默认能力误包装成用户需要理解的“模式”。
- Verification: TypeScript 检查通过；Browser Bundle 构建通过；Client 静态测试和完整确定性测试通过（111 passed，3 skipped，0 failed）；真实 Stock DSH Web smoke 通过，并验证 Options 为 hidden、列表与详情列为独立 auto 滚动且共享可视高度。
