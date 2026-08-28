# 02: 端到端展示 Verified launch chain

**What to build:** 对已经达到 Verified attribution 的 listener，将现有 root-to-listener ancestry 与身份绑定的 Windows 命令行证据组合为用户可读的“启动链（已确认）”，通过现有 Host inventory 送达 Browser 详情面板。用户能够看到 DSH root、中间 launcher 和真实 listener；已知工具可以复用现有 Logo，未来未知工具仍显示真实进程名和命令。该展示不得改变来源状态、生命周期所有权或处理权限。

**Blocked by:** 01: 建立身份绑定的 Windows 命令行读取接缝.

**Status:** resolved

- [x] Host 只为 `confidence = verified` 且存在明确 Process origin 的 listener 构造 launch chain；inferred、unattributed 和无 origin listener 不触发命令行读取，也不公开该区块。
- [x] 每条链最多保留 16 个 ancestry 节点，并按 root-to-listener 顺序返回；每个节点只公开 PID、脱敏 executable、可选脱敏 command，以及 root/intermediate/listener 角色。
- [x] 某个已验证节点的 command 不可读取时，链仍可保留其 executable 和角色并显示中性缺失状态；查询能力整体失败时，listener 行回退为现有形态。
- [x] Browser 在现有 listener 详情中增加紧凑的“启动链（已确认）”区块，清楚标记 root 和 listener，不新增页面、设置、操作按钮或复杂图形。
- [x] 启动链不进入搜索文本、排序键、固定项 identity、默认复制摘要或持久 Browser 状态；Browser 不获得 Windows、CIM、Node 文件系统或进程读取能力。
- [x] 已有工具链展示只能使用 verified chain 中完整命令 token 或 executable basename 作为附加候选，不允许端口、目录、时间接近或模糊子串参与；未知工具显示真实名称或现有通用 runtime 图标。
- [x] fixture 中的编译 launcher 能同时展示 launcher 与最终原生 listener；运行时脚本场景能同时展示包管理器/脚本入口与最终 runtime listener，而无需读取 manifest。
- [x] Host inventory 测试从注入的 origins、listener/process 快照和命令行 reader 一次性验证公开 launch chain、角色、顺序、脱敏、已知工具展示和未知工具降级。
- [x] Browser 测试覆盖完整链、部分命令缺失、长命令截断、未知工具、中性空态以及无 launch chain 时的既有详情布局。
- [x] 回归证明 Process origin、Verified attribution、Lifecycle owner、Managed shutdown、Direct external termination、开发相关性、Compose 项目关联和现有 action state 完全不受 launch chain 影响。

## Comments

- 2026-08-28：MVP 已实现并通过确定性 Host/Browser 静态回归。启动链仅作为详情证据和 Logo 辅助，不进入搜索、排序、固定项 identity、复制或 action authority。
- 2026-08-28：真实 Stock DSH/Browser 截图属于 ticket 03 的外部验收，不在本 ticket 中伪造完成。
