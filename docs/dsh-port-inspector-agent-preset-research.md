# DSH Port Inspector：Agent preset / Agent 类型可行性研究

状态：已完成调研，未修改生产代码。  
调研日期：2026-08-26  
证据范围：只使用本仓库与 `D:\project\deepseek-harness` 中的源码、测试和产品文档；未使用二手资料。

## 结论摘要

`Agent preset` 适合加入 Port Inspector，但应定位为“该 DSH Session 当前采用的 Agent 组装类型”，而不是“创建该进程的 Agent”或“进程的安全归属”。它与现有 Session/Call 归因高度相关，且 DSH 已经在 Session list 和 Host session-added frame 中提供了可直接消费的 `agentPreset`；因此 Session 级展示可行性高、匹配度高。

需要保留一个重要语义边界：当前 DSH `SessionSummary.agentPreset` 是 Session 当前有效 preset 的摘要，不是 `ProcessOrigin` 中“某个进程被 spawn 的那一刻”的历史快照。本项目若直接把 Session list 的值拼到进程详情上，只能文案化为“当前 Session preset”。若要声称“该进程创建时使用的 preset”，必须在 Host 归因记录创建时一并捕获 preset，并让它跟随 `sessionId + callId` 写入 origin。

推荐分两步：

1. MVP 只增加可选的 Session 级 `agentPreset` 展示，放在现有“会话上下文”中，作为 Session ID 附近的次要事实；不改变成熟的来源卡片结构，也不把它放进 `port_list` 的跨 Session 细节。
2. 只有当产品明确要求“进程创建时的 Agent 类型”时，才扩展 `ProcessOrigin` 为带时间点的字段，例如 `agentPresetAtSpawn`，并补齐 preset 选择、并发调用、子 Agent、Terminal 和重启后的降级测试。

## 1. 权威数据源与稳定性

### 1.1 三种数据不能混为一谈

| 数据 | 权威含义 | 稳定性 | 对 Port Inspector 的建议 |
| --- | --- | --- | --- |
| `agentPreset` id | preset 目录名，也是 Session 运行的组合身份 | 高；是持久 Session 元数据中的字符串 | 作为机器可识别值保留；优先展示它 |
| preset metadata `name` / `description` | 给 picker 使用的显示文本 | 中；可缺失、损坏或随本地文件变化 | 只能作为显示增强，不能替代 id |
| `PresetTrust` | preset 来自 system root 还是 user root | 中；是发现来源，不是进程归属或安全结论 | MVP 不展示；若展示必须叫“来源”而不是“可信 Agent” |

DSH 的 `SessionHeader.agentPreset` 注释明确说明它是该 Session 的 Agent 组合身份，并且因为 preset 决定工具和提示词而需要持久化；创建参数 `CreateSessionOptions.meta.agentPreset` 也直接写入该 header。证据：`D:\project\deepseek-harness\packages\core\session\src\types.ts:62-98, 101-120 (SessionHeader/CreateSessionOptions)`。

DSH 的 preset id 是目录名，`AgentPreset.name` 是可选显示名；`trust` 来自被发现的 root，不由 `preset.yml` 自己声明。证据：`D:\project\deepseek-harness\packages\preset\agent-presets\src\preset.ts:3-10, 21-42 (PresetTrust/AgentPreset)`；`D:\project\deepseek-harness\packages\preset\agent-presets\src\metadata.ts:1-18, 25-43 (PresetMetadata)`。

`preset.yml` 只承载显示元数据，读取失败、格式错误或缺失时会退化为空元数据，preset 仍然可以挂载。因此 `name` 不是可靠身份，`id` 才是应当保留的稳定标识。证据：`D:\project\deepseek-harness\packages\preset\agent-presets\src\metadata.ts:1-18, 50-83 (readPresetMetadata)`。

### 1.2 有效值来自 Session log 的解析，而不是只读 header

DSH 提供 `resolveSessionPreset(session)`：从最新的 `agent-preset/selected` 事件向后查找，找不到时才回退到 `SessionHeader.agentPreset`。这是因为 Session 创建后、首轮开始前仍可能切换 preset，而后续恢复或 fork 必须重建实际运行过的组合。证据：`D:\project\deepseek-harness\packages\preset\agent-presets\src\session.ts:1-18, 22-27, 31-53 (resolveSessionPreset)`。

DSH 的 Host `sessionListFields()` 已明确使用 `resolveSessionPreset({ header, events })`，并将解析结果投影为 list 字段；attached Session 的 `summarize()` 也复用这条链路。证据：`D:\project\deepseek-harness\packages\host\apiproxy\src\api-proxy.ts:475-503 (sessionListFields/summarize)`。

这意味着：

- 对“当前 Session 用的是什么 preset”，DSH 已有稳定、可复用的权威投影。
- 对“进程 spawn 时用的是什么 preset”，只查当前 Session summary 不足以证明历史瞬间状态；必须让 spawn 归因记录带快照，或保存可按时间/Call 重建的选择历史。
- 对 cold Session，DSH 的 `summarizeCold()` 有意只使用 header，避免为了 list 摘要读取整个事件日志；Session attach 后才会通过完整事件恢复选择。证据：`D:\project\deepseek-harness\packages\host\apiproxy\src\api-proxy.ts:544-565 (summarizeCold)`。因此 cold row 的 preset 也要允许缺失或暂时只有创建时值，不能在 Port Inspector 中宣称它一定是历史精确值。

### 1.3 Agent 类型不是 provider/model，也不是 Agent ID

DSH `Agent` 的 `id` 与 Session 使用同一个 `SessionId` 身份；`Agent.options` 另有 `provider`、`model` 等运行参数。证据：`D:\project\deepseek-harness\packages\core\agent\src\runtime-types.ts:23-31, 63-70 (AgentOptions/Agent)`。

因此产品文案应区分：

- `Agent ID`：当前归因链中的运行实例/Session 身份。
- `Agent preset`：Session 的工具、提示词和组装类型。
- `Provider / Model`：某次 LLM 请求使用的模型路由。

把三者合并成“Agent 类型”会产生误导，尤其是同一个 preset 可以使用不同 provider/model，或者一个没有 preset roster 的部署仍然拥有 Agent。

## 2. 与 ProcessOrigin、Session、Call 的关联可靠性

### 2.1 当前关联键已经足够支持 Session 级标签

本项目的 `ProcessOrigin` 已保留 `sessionId`、`agentId`、`turn`、`step`、`callId`、`rootCallId`、`tool`、`kind`，并可附带 `jobId` / `terminalSessionId`。证据：`D:\project\dsh-port-inspector\src\attribution.ts:29-45 (ProcessOrigin)`。

`RuntimeAttribution` 的内部 `ToolExecutionFrame` 也以同样的 Session/Call 维度捕获上下文，再在 subprocess `spawn` / `spawnTerminal` 处写入 registry。证据：`D:\project\dsh-port-inspector\src\attribution.ts:111-141, 330-365 (ToolCallContext/ToolExecutionFrame/RuntimeAttribution)`。

Host UI 会依据 origin 的 `sessionId` 与当前选中 Session 做可见性分类；它明确区分 `current-session`、`another-dsh-session`、`unknown-session` 和 `unattributed`。证据：`D:\project\dsh-port-inspector\src\host-ui.ts:25-35, 337-344 (HostSessionVisibility/sessionVisibility)`。

所以可以可靠做出这样的关联：

> 这个监听进程的来源记录属于 Session S；Session S 当前的 Agent preset 是 P。

但当前不能可靠做出更强的断言：

> 这个监听进程就是由 preset P 创建的。

原因是 `ProcessOrigin` 没有 preset 字段，而 Session summary 的 preset 可能是当前值；DSH 允许空白 Session 在创建后记录新的 preset 选择。两者的结构证据分别见 `D:\project\dsh-port-inspector\src\attribution.ts:29-45` 与 `D:\project\deepseek-harness\packages\preset\agent-presets\src\session.ts:1-18, 41-53`。

### 2.2 DSH 已有的 Session list / Host frame 可以直连

DSH client 的 `SessionListEntry` 已包含 `agentPreset?: string`，并将它定义为“该 Session 的 Agent 所由之组装的 preset”；同时还包含 `parentSessionId`、`origin` 和 `depth`。证据：`D:\project\deepseek-harness\packages\client\runtime\src\client\sessions\lineage.ts:16-37 (SessionListEntry)`。

SessionManager 会在创建结果、preset 切换和 `host/session-added` frame 到达时把 `agentPreset` 合并进摘要；合并逻辑还明确说明该字段是当前值，preset 切换后新值覆盖旧值。证据：`D:\project\deepseek-harness\packages\client\runtime\src\client\sessions\manager.ts:544-550, 615-624, 798-808, 1080-1104 (create/noteAgentPreset/host frame/applyMutation)`。

Host frame 的公开契约也已有 `agentPreset?: string`，并由 schema 校验。证据：`D:\project\deepseek-harness\packages\host\apiproxy\src\api\events.ts:127-136 (HostFrame)`, `D:\project\deepseek-harness\packages\host\apiproxy\src\api\events.schema.ts:69-79 (hostFrameSchema)`。

这使 Session 级展示成为低风险扩展：本项目不必扫描 preset 目录，也不必持有 DSH `Agent` 对象；只要在现有 session list adapter 中保留 DSH 已投影的 `agentPreset`，再将它作为可选 Browser-safe DTO 字段即可。

### 2.3 若要求 Call 级精确值，需要新增时间点证据

推荐的精确模型是：

```text
ProcessOrigin {
  sessionId
  callId / rootCallId
  observedAt
  agentPresetAtSpawn   // 可选，spawn 时 Host 捕获的有效 preset id
}
```

捕获时必须发生在 Host 的 tool execution frame 仍然有效、且 subprocess spawn 被包装的路径内；不能在 Browser 读取 Session summary 时事后推断。若无法在 spawn 时取得 preset，应回退显示 `当前 Session preset`，不显示“创建时 preset”。

## 3. Host / Browser 边界应如何扩展

### 3.1 推荐方案：只扩展现有 Session context

当前 Browser Session context 的输入只有 `sessionId`、标题、cwd 和 conversation；Session list adapter 只把当前 summary 的 `displayTitle` / `cwd` 投影进去。证据：`D:\project\dsh-port-inspector\src\client\session-context.ts:26-52, 150-181 (RuntimeInspectorSessionContextInput/RuntimeInspectorSessionListLike/buildRuntimeInspectorSessionContext)`；`D:\project\dsh-port-inspector\src\client\panel.ts:109-132 (useRuntimeInspectorSessionContext)`。

MVP 可做的最小扩展：

1. 在 `RuntimeInspectorSessionListLike.byId` 的 summary 上增加可选 `agentPreset?: string`。
2. 在 `RuntimeInspectorSessionContext` 增加可选 `agentPreset?: string`，由当前 Session summary 传入。
3. 在现有“会话上下文” section 中增加一行，而不是另造卡片或重排来源板块。
4. Host `HostListenerAttribution` 不必立刻增加字段；UI 只在 `row.session?.sessionId === context.sessionId` 时显示该 Session context，其他 Session 不借用当前 Session 的 preset。
5. Browser 只接收字符串和已脱敏 presentation DTO；不导入 `node:`、Koffi、进程句柄、Job/Terminal 实例或 DSH Host Context。

本项目已经把 Host 作为 scanner、归因、生命周期和 RPC 的权威边界；产品决策也要求 Browser 只消费可序列化 Host RPC。证据：`D:\project\dsh-port-inspector\docs\dsh-port-inspector-mvp-decisions.md:106-118 (D19-D22)`。

### 3.2 精确方案：扩展 Host origin DTO，而不是让 Browser 查 DSH

如果要展示 `agentPresetAtSpawn`，应在 Host 侧做：

- 让 `ProcessOrigin` 保存捕获时的 preset id；
- 让 `displayOrigin()` 以与 command/workdir 相同的方式做有界 presentation；
- 让 `HostListenerAttribution` 和 `HostListenerRow` 传递该可选字段；
- Browser 只渲染 Host 已确认的字段。

不建议 Browser 为了补齐字段调用 DSH 的 `inspectApiRemoteSession()` 或触发 cold Session resume。该 API 的职责是读取 cold persisted Session；同一模块还提供 live Agent resolver，并可能 resume Session。证据：`D:\project\deepseek-harness\packages\api\remotes\src\agent-lookup.ts:94-110, 121-174 (inspectApiRemoteSession/createApiRemoteAgentResolver)`。Port Inspector 只需要观察，不应因为展示信息改变 Agent 生命周期。

### 3.3 不建议把 preset roster / description 下放到进程详情

Port Inspector 的核心任务是端口到进程到 Session/Call 的来源追踪。preset 的完整 roster、description、composition 文件路径属于 Agent preset picker/configuration domain，不是端口进程 domain。将其直接下放会增加：

- Host 侧目录发现和缓存依赖；
- Browser 侧隐私暴露面；
- preset 被删除、损坏或重命名后的历史解释问题；
- “显示元数据”与“进程来源证据”混淆。

若将来需要查看详情，可由用户主动打开 DSH 的 preset 设置页；Port Inspector 只保留 id 和一个短显示名。

## 4. 隐私、Terminal、子 Agent 和安全风险

### 4.1 跨 Session 隐私

本项目已决定：人类 UI 可以显示脱敏的跨 Session 归因，但模型 `port_list` 对其他 Session 只显示粗粒度占用关系，不返回 command、Turn、Step、Call、workdir、project 或 owner。证据：`D:\project\dsh-port-inspector\docs\dsh-port-inspector-mvp-decisions.md:82-84 (D16)`；产品说明见 `D:\project\dsh-port-inspector\README.md:84-98`。

因此：

- 人类 UI 可以在已识别的另一 Session 行上显示 `Agent preset`，前提是它来自该 Session 的 Host-confirmed summary，且不附带该 Session 的用户请求。
- `port_list` 不应新增跨 Session preset；preset 仍然可以透露工作流身份、工具权限和定制用途，属于 Session 级元数据。
- 当前 Session 的 preset 不能作为无 Session 归因行的 fallback；现有 `requestFor()` 已明确“缺少 Session attribution 就不能使用 current Session”。同一规则应复用到 preset。证据：`D:\project\dsh-port-inspector\src\client\session-context.ts:170-181`。

### 4.2 Terminal 的语义边界

`spawnTerminal` 只表示一个 Terminal-backed spawn 起点；后续用户或 Agent 在持久 Terminal 中执行的命令，不一定拥有新的、可与初始 Tool Call 一一对应的 origin 记录。本项目当前把 `terminalSessionId` 作为生命周期 owner，并把 `kind` 区分为 `spawn` / `spawnTerminal`。证据：`D:\project\dsh-port-inspector\src\attribution.ts:40-45, 330-365`；`D:\project\dsh-port-inspector\src\host-ui.ts:282-290, 564-572`。

所以对 Terminal 监听器应显示：`Session preset（当前）`，而不要声称每条后续命令都是由该 preset 的某个 Call 直接 spawn。若要做到命令级精确，需要 Terminal command event 与 preset snapshot 的新关联，这超出本次字段扩展。

### 4.3 子 Agent 与 lineage

DSH Session header 将 `parentSession`、`origin: 'subagent'` 和 `delegationDepth` 作为持久元数据；client lineage 会以 `parentSessionId` 和 `depth` 组织子 Session，并把 `agentPreset` 作为每个 Session 自己的 summary 字段。证据：`D:\project\deepseek-harness\packages\core\session\src\types.ts:72-98`；`D:\project\deepseek-harness\packages\client\runtime\src\client\sessions\lineage.ts:16-37, 49-86`。

这说明子 Agent 的 preset 可以与父 Session 不同，不能从父 Session preset 继承推断。`parentSessionId` 只说明 lineage，不能自动授予对父 Session 或子 Session 的控制权；DSH 的 API remote resolver 对 subagent-owned identity 还有 `agent-busy` fence。证据：`D:\project\deepseek-harness\packages\api\remotes\src\agent-lookup.ts:121-146`。

### 4.4 trust 不是安全结论

DSH `PresetTrust` 的定义是 system preset 或 user preset；user preset 可以由人或 Agent 在本地创建，并承载与 shell access 相同的信任风险。证据：`D:\project\deepseek-harness\packages\preset\agent-presets\src\preset.ts:3-10`。

Port Inspector 不应把 `system` 显示为“安全”、把 `user` 显示为“不可信 Agent”，也不应据此决定是否允许停止进程。进程操作仍然只依赖现有的 PID、creation time、executable、lifecycle owner 和 action safety 检查。

## 5. 产品展示建议

### 5.1 定位与字段文案

推荐字段：

| 建议文案 | 值 | 作用 | 回退 |
| --- | --- | --- | --- |
| `Agent preset` | `name`（若有）+ `id` | 说明当前 Session 的 Agent 组装类型 | 没有 name 时只显示 id |
| `Session preset` | 用于 Terminal 或非精确历史场景 | 明确这是 Session 级上下文 | `—` |
| `preset id` | 仅在复制详情或展开信息中出现 | 支持诊断和反馈，避免只依赖易变显示名 | `—` |

不推荐使用 `Agent 创建者`、`进程所属 Agent 类型` 或 `由 preset 创建`：这些表达把 composition metadata 误说成 process ownership evidence。

### 5.2 位置

保持当前成熟 UI：

- 放在“会话上下文”里，紧跟 `Session` / `Session ID`；
- 不修改“来源”板块的透明背景、结构或安全语义；
- 详情页只在来源已关联到对应 Session 时显示；
- 不在端口列表主列中新增 badge，避免列表密度和视觉层级变化；
- 若有子 Agent lineage，优先另显示 `Session 来源：子 Agent`，而不是把它挤进 preset 文案。

这与本项目的核心定位一致：先回答“端口 → 进程 → DSH Session/Call”，preset 是帮助用户理解“这个 Session 用哪种 Agent 组装”的辅助上下文，不是替代来源、归因置信度或生命周期 owner。证据：`D:\project\dsh-port-inspector\docs\dsh-port-inspector-mvp.md:5-21, 47-58`；`D:\project\dsh-port-inspector\src\client\panel.ts:603-670 (detail sections)`。

### 5.3 回退规则

显示优先级建议固定为：

1. `metadata.name + (id)`，其中 name 只做显示，id 始终保留在复制详情或 title 中；
2. `id`；
3. `—`。

语义回退建议固定为：

- 有 `sessionId`，有当前 summary preset：显示 `当前 Session preset`。
- 有 `sessionId`，但 summary 尚未到达或 preset 缺失：显示 `未提供`，不要猜默认 preset。
- 只有另一 Session 粗粒度可见：人类 UI 可显示 preset（若 Host 明确提供）；模型 UI 不显示。
- 无 `sessionId` 或 `unattributed`：显示 `—`。
- 只有 `agentPresetAtSpawn` 时：显示 `Agent preset（创建时）`，不要与当前 Session preset 共用一个无时间说明的标签。

## 6. 实现范围、难度与 Codex 主导工作量

以下工作量以本仓库现有结构、单人 Codex 主导、用户进行验收为前提；不包含 DSH 上游 API 设计变更或大规模 UI 重构。

| 方案 | 具体工作 | 难度 | 难点在哪里 | 与项目定位匹配度 | 工作量（Codex 主导） |
| --- | --- | --- | --- | --- | --- |
| A. Session 级当前 preset | 扩展 session-context 的可选 DTO；从 list summary 传值；详情增加一行；补 fixture/unit/UI smoke | 低 | 处理字段缺失、当前 Session 错配、cold summary 和显示名回退；不能误连跨 Session | 高 | 小，约 1–2 个工作日，约 2–3 个 Codex 回合 |
| B. Host-confirmed preset display | 在 Host 或现有 session adapter 中确认 `agentPreset` 只来自 DSH summary/frame；加 schema/运行时兼容和 real Stock DSH 验收 | 中 | 需要覆盖 list refresh、host frame、preset switch、未知/旧 DSH 能力；处理 summary 的当前值语义 | 高 | 小到中，约 2–4 个工作日，约 3–5 个 Codex 回合 |
| C. 进程创建时 preset | `ProcessOrigin` / `HostListenerAttribution` 增加 `agentPresetAtSpawn`；Host 在 spawn 时捕获；复制详情、跨 Session 隐私和回退全部更新 | 中高 | preset 选择与 spawn 的并发时序、Session 事件解析、字段快照一致性、重启后丢失、旧来源兼容 | 中高，但属于增强项 | 中，约 4–7 个工作日，约 5–8 个 Codex 回合 |
| D. preset name/description/trust | Host 读取 roster 或新增安全 DTO；处理 metadata 缺失/损坏、删除、重命名和跨 Session 暴露 | 中高 | 显示元数据不是来源证据；目录读取和缓存会扩大边界；trust 容易被误读为安全评级 | 中 | 中，约 4–7 个工作日，约 5–8 个 Codex 回合 |
| E. Provider/model | 从 Session/LLM 选择链路扩展到 Port Inspector；定义是 Session 当前模型还是 Call 模型 | 高 | provider/model 可能按 Call 变化；credential/provider 名称的隐私与兼容；无法用 preset 替代 | 中低，建议后置 | 中高，约 5–10 个工作日，约 7–12 个 Codex 回合 |

### 工作量判断

如果目标只是回答“这个进程来自哪个 Session，该 Session 是什么 Agent 类型”，选 A+B 即可，属于适合当前 MVP 的小型增强。如果目标是回答“这个进程在创建瞬间由哪个 preset 组合启动”，必须选 C，难度从 UI 字段扩展提升到 Host 运行时证据链改造，不建议在没有明确产品需求前直接实现。

## 7. 最终建议

本次建议采纳 A+B，暂缓 C+D+E：

- 数据源使用 DSH `SessionSummary.agentPreset` / `host/session-added.agentPreset`，不自行扫描 preset 目录。
- UI 使用 `Agent preset`，放在现有“会话上下文”，不改“来源”板块视觉和语义。
- 以 `id` 为稳定身份，`name` 只作可选显示；不把 trust 当作安全标签。
- 明确显示“当前 Session preset”，不宣称它就是某进程 spawn 时的 preset。
- `port_list` 继续遵守 D16，不向模型暴露跨 Session preset。
- 只有出现“必须证明创建时 preset”的需求，才为 `ProcessOrigin` 增加带时间点的 `agentPresetAtSpawn`。

这条路线能增加用户理解 DSH 运行时的关键信息，同时保持 Port Inspector 的核心边界：观察、归因和安全生命周期操作仍由 Host 掌握，Browser 只渲染可序列化的事实。

