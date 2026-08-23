# ADR-0004：单仓库 DSH Web 双半 Bundle

- 状态：Accepted
- 日期：2026-08-22
- 适用范围：DSH Runtime Inspector Windows MVP 的 Web UI 集成

## Context

Runtime Inspector 已经具备可信的 Host/UI 边界：它可以扫描 Windows TCP listeners，返回脱敏后的归因与生命周期 owner，并在 Host 侧执行受身份约束的 Managed shutdown 或外部单 PID 操作。但当前 Bundle 只有 Node Host 运行时代码，没有真正的 Browser Client 入口。

产品要求是在 `dsh web` 主界面提供可发现的端口入口，用户打开面板后观察和处理占用端口的进程。Web UI 必须与 Host 的进程安全边界保持一致，同时不希望为 Runtime Inspector 建立第二个功能仓库或启动独立本地 Web 服务。

DSH 社区插件已经验证了一个 Bundle 同时包含 Host 半与 Browser 半的安装方式；官方 Client module 机制也以 `dsh.client`、`exports["./client"]` 和构建后的 Browser artifact 作为客户端加载契约。

## Decision

Runtime Inspector 采用单仓库、单 Bundle、双半结构：

1. 同一个仓库维护 Node Host 与 Browser Client 源码，并由同一个版本统一发布。
2. 现有 Node 入口继续作为 Host 半，负责 Windows scanner、Process origin、lifecycle、Host RPC 和所有进程安全决策。
3. 新增 Browser Client 入口，通过 `dsh.client` 声明为 Web 平台客户端，并通过 `exports["./client"]` 暴露构建后的 Client artifact。现有 Bundle composition patch 保持为 Host 激活入口。
4. Browser 源码使用 TypeScript 和 DSH-compatible client bundler 构建。`window.__ModuleLoader__.load` 只作为生成产物格式，不作为业务源码 API 手写。
5. Browser 与 Host 之间只有一个稳定的业务边界：可序列化的 Runtime Inspector Host RPC。Browser 不获得 scanner、origin registry、Job/Terminal API、process handle 或 Windows process primitive。
6. Host-to-Client transport 使用认证 DSH 版本提供的现有桥接能力；若目标版本没有 typed Remote seam，可以使用受同源保护的 WebServer API route 作为适配器，但不得启动第二个 Web 服务或第二个进程。
7. Browser UI 在 `sidebar.footer.action` 注册全局入口，在 `shell.overlay` 打开面板。入口显示有界的 listener/conflict 状态，面板负责 inventory、搜索排序、详情、确认和结果展示。不得替换 Sidebar、Conversation、composer 或应用 root。
8. Web UI 将来源状态与处理方式作为两个正交维度。来源层内部保留 verified/inferred/unattributed，用户主标签收敛为“DSH 来源已确认 / 来源未确认”；操作层独立呈现 managed/external/read-only。Host 侧继续负责 fresh scan、身份复核、权限判断和 `portReleased` 结论。
9. 未知 DSH 版本不产生用户提示，也不触发降级；Browser 只在某项运行时能力实际失败时呈现与该能力相关的状态。Client artifact、Slot 或 Host bridge 不可用时不得扩大进程操作权限。
10. Browser 从 DSH `sessions.list` 读取当前 Session ID、标题和 cwd，并从当前 Session conversation 映射发起 Tool Call 的用户请求。当前 Session ID 只用于展示和隐私投影，不参与 Host action authority；原始进程身份仍由 Host 掌握和复核。

## Consequences

- UI、Host 安全逻辑、Client contract 和构建产物可以在一个 Pull Request、一个版本和一套测试中演进。
- 用户通过标准 DSH Bundle 安装并重启 Web Profile 即可获得 Host 与 Browser 两半，不需要额外的 companion server 或手工复制前端文件。
- Browser 必须遵循 DSH Client module、Slot 和宿主版本契约；每个新增 DSH 版本都需要验证 client artifact 加载、Slot 注册和真实 Web 操作路径。
- Host 与 Browser 不能共享 Node-only 运行时代码；跨边界类型必须保持可序列化、脱敏和有界。
- Web acceptance 会成为 MVP 验收面的一部分，但不会取代已有的原生 Windows G1–G6 生命周期 gate。

## Rejected alternatives

- 在第二个仓库维护 Runtime Inspector Web UI：会拆分版本、测试和安全边界，不符合单 Bundle 产品要求。
- Bundle 自己启动独立本地 Web 服务：会增加端口、认证、CORS、生命周期和额外进程风险，也会使用户离开 DSH 主界面。
- 将 UI 构建结果注入或复制进 DSH Web 主应用：会耦合 DSH Web 构建流程，接近私有 fork，不符合标准插件安装模型。
- 继续只发布 `runtimeInspector.host` 而不提供 Browser Client：不能满足 Web 主界面入口和面板的产品目标。
- 将端口入口放在 `conversation.input.right` 或 composer dock 作为主入口：这些位置是 Session/输入框范围内的紧凑控制位，不适合作为跨 Session 的系统级运行时工具。
