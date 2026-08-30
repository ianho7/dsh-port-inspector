# DSH Port Inspector 产品改名反思

- Task: 将尚未发布的 DSH Runtime Inspector 完整改名为 DSH Port Inspector。
- Encountered Problem: 品牌名、npm 包、Bundle、HTTP route、DSH slots、RPC ID、Browser 存储、DOM 测试属性、网站、设计资产和真实 DSH fixtures 共用旧 namespace；发布脚本还先创建 GitHub Release 再发布 npm，失败时可能留下不完整发行状态。
- Thought Process: 先区分品牌/发行 namespace 与内部领域语义。项目未发布，不需要兼容旧用户，因此一次性统一所有可观察 namespace；`runtimeInspector` 类型和服务、`dsh-ri-*` CSS 以及 `port_list` 仍准确描述技术边界，保留可减少无价值重构。随后用旧名称扫描、构建、全量测试、网站构建和打包清单分别验证源码、Browser、网站及发行物。
- Options Considered: 只改 UI 品牌并保留旧技术 namespace；对全部 RuntimeInspector 符号做机械重命名；统一公开 namespace但保留内部领域符号。
- Chosen Solution: 统一产品名、包名、Bundle、route、slots、RPC、存储、DOM 属性、网站和发行资产为 Port Inspector，同时保留内部领域符号、CSS 前缀和 `port_list` 契约。
- Rationale: 这使首次公开发布不存在品牌债务，同时避免修改与用户价值无关、但回归面很大的内部类型和样式结构。
