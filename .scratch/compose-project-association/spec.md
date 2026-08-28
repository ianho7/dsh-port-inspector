# Compose 项目关联：实现规格

**Status:** ready-for-agent
**Labels:** ready-for-agent
**日期：** 2026-08-28

## Problem Statement

作为使用 DSH 开发前后端分离项目的开发者，我可以在一个任务中启动 Vite、Go 和 Docker Compose 基础设施。但在 Docker Desktop 场景中，Windows 上实际监听发布端口的通常是 Docker 的代理进程，不能沿 DSH root process 父链完成 Verified attribution。当前 Runtime Inspector 因此正确地把 PostgreSQL、Redis 等端口显示为“开发环境 / 启动方未确认”，却无法告诉用户它们确实属于当前 Workspace 的 Compose 项目。

用户需要在不牺牲归因真实性和终止安全性的前提下，把这些真实基础设施作为“当前项目基础设施”查看，并可核对服务、镜像和端口映射。

## Solution

Runtime Inspector 在 Host inventory 查询中增加一个只读的 Compose 项目关联能力。它从当前 DSH Workspace 有界发现候选 Compose 文件，并使用固定参数、无 shell 的 Docker Compose 只读查询取得运行中容器的服务、镜像和已发布宿主端口；仅将与实际 Windows TCP listener 精确匹配的结果投影为 Compose 项目关联。

面板将这类端口分入当前项目，显示“Compose 项目关联已确认”与“启动方未确认”两个独立状态。可识别镜像优先显示服务产品 Logo（例如 Redis、PostgreSQL），并以小型 Docker Compose 徽标说明其编排上下文；未知镜像使用 Docker Logo。详情显示相对 Compose 路径、服务名、镜像引用、容器 ID 与端口映射。

Compose 项目关联只是一条展示关系：它不等同于 Process origin、Verified attribution 或 Lifecycle owner，不可以表述为“由 DSH 启动”，不授予 Managed shutdown 或 Direct external termination。关联到 Compose 的代理 listener 固定为只读。用户仍通过项目目录中的 `docker compose down` 清理基础设施。

## User Stories

1. 作为 DSH 开发者，我希望当前 Workspace 的 Compose 服务出现在“当前项目”中，以便把应用端口和基础设施作为同一开发栈查看。
2. 作为 DSH 开发者，我希望 PostgreSQL 与 Redis 的端口即使由 Docker Desktop 代理监听也能显示为当前项目基础设施，以便确认任务启动结果。
3. 作为 DSH 开发者，我希望仍看到“启动方未确认”，以便不会把 Compose 关联误认为 DSH Verified attribution。
4. 作为 DSH 开发者，我希望能看到关联证据中的相对 Compose 路径和服务名，以便知道端口来自哪个嵌套环境。
5. 作为 DSH 开发者，我希望能看到镜像引用、容器 ID 与宿主/容器端口映射，以便人工核对实际运行的容器。
6. 作为 DSH 开发者，我希望 Redis 与 PostgreSQL 使用各自的产品 Logo，以便扫读列表时迅速区分基础设施。
7. 作为 DSH 开发者，我希望同时看到小型 Docker Compose 上下文标记，以便了解服务经过容器编排而非本机原生运行。
8. 作为 DSH 开发者，我希望未知镜像安全地显示 Docker Logo，以便不会因不可靠识别而错误标注产品。
9. 作为在同一 Workspace 维护多个嵌套环境的开发者，我希望它们都能显示在当前项目中，并能以相对 Compose 路径区分。
10. 作为重启过 DSH 或手动启动过 Compose 的开发者，我希望只要当前 Workspace 和运行时证据仍匹配，关联仍能恢复，以便不依赖易失的 Process origin。
11. 作为安全敏感用户，我希望只读 Compose 关联不会产生关闭容器、终止 Docker Desktop 或终止代理 PID 的按钮，以便避免误伤共享容器运行时。
12. 作为安全敏感用户，我希望证据不足或关联歧义时端口回退到既有“开发环境 / 启动方未确认”，以便不会把另一个项目错误归类。
13. 作为没有启动 Docker Desktop 的开发者，我希望其他 listener 仍正常显示，且仅 Compose 关联能力局部降级，以便面板保持可用。
14. 作为使用自定义 Compose 项目名的开发者，我希望有明确标签或配置路径证据时仍能关联，以便支持合理的非默认启动方式。
15. 作为使用非标准 Compose 启动但证据无法重建的开发者，我希望系统宁可不关联也不猜测归属，以便保持可信度。
16. 作为插件维护者，我希望 Browser 只接收脱敏且有界的关联投影，以便维持 Host/Browser 双半 Bundle 的安全边界。

## Implementation Decisions

- 新建一个 Host-only、可注入的 Compose 运行时探针。它仅接受 Host 从 DSH Session/Workspace 上下文解析出的当前 Workspace，输出关联投影和能力状态；Browser 的 `currentProject` 只参与展示分组，不得成为文件枚举或 Docker 命令的输入。探针不得被 Browser 直接调用或获取 Node、Docker、Windows 进程能力。
- 候选文件自动在当前 Workspace 内递归发现，仅识别 `compose.yaml`、`compose.yml`、`docker-compose.yaml` 与 `docker-compose.yml`。跳过 `.git`、`node_modules`、`dist`、`build`、`.next`、`target`、`coverage`，候选总数最多 64 个。路径仅作为本地 Host 输入处理。
- 每个候选文件先以无 shell、固定 argv、超时和有界输出读取并检查当前 context 名称及 Docker endpoint，只有 Windows 本地 `npipe://` 才继续；后续每个 Docker 调用都显式传递同一个已验证的 `--context`，再执行 Docker Compose 的只读 `ps` JSON 查询；自定义项目名恢复只允许受限的 `docker ps --filter label=...` 读取已知 Compose 工作目录/配置路径标签。除只读的 context 预检外，不得执行 Docker Compose 的 `up`、`down`、`start`、`stop`、pull 或任何修改 Docker 状态的命令；不得读取或返回环境变量、容器日志、挂载内容或 Compose 配置正文。
- 仅将查询结果中的 TCP published host port 与同轮 Windows listener 的本地端口精确匹配。关联键包含候选 Compose 文件、服务、容器及端口映射；不能按端口、项目名或镜像名单独猜测。
- 自定义 Compose 项目名的恢复采用保守策略：正常的候选查询能返回运行容器即可关联；否则只有 Docker 提供的、可验证地指向候选文件或工作目录的标签才可补充关联。项目名、镜像名或相同端口都不足以建立关联。
- 关联探针是按 inventory 刷新按需运行的本地能力，可做短时缓存；Docker CLI、context、JSON 形状、超时或权限失败仅令本轮 Compose 关联不可用，不影响 listener 扫描、Process origin 或其他操作能力。
- Host inventory 行增加脱敏、可序列化的 Compose 关联字段和一个独立开发相关性理由。现有的 Process origin、来源状态和 Lifecycle owner 模型不扩展、不重定义。
- 有 Compose 关联的 listener 进入 `current-project` 开发相关性分组；多候选 Compose 项目都保留，并以相对当前 Workspace 的 Compose 路径区分。无关联时保留原有分组逻辑。
- Compose 关联 listener 的处理方式固定为只读，即使其 Windows PID 在其他情况下满足 Direct external termination 的条件。不得将 Docker Desktop、docker-proxy 或任何代理进程表现为 DSH Managed shutdown 对象。
- Browser 呈现两条正交状态：“Compose 项目关联已确认”说明展示关系，“启动方未确认”说明 Process origin 未达到 Verified attribution。文案不得说“由 DSH 启动”。
- 镜像识别由 image reference 的仓库/名称进行保守映射。可靠命中 PostgreSQL、Redis 等现有 ToolchainId 时，将其作为主 Logo；显示 Docker Compose 小型次级徽标。未知或模糊镜像仅显示 Docker 主 Logo。Logo 不表达来源或操作权限。
- 详情页展示服务名、镜像引用、短容器 ID、已发布 TCP 映射与相对 Compose 文件路径；列表保持紧凑。任何绝对私人路径都不传到 Browser。
- 采用 `Compose 项目关联` 术语，其定义以领域术语表为准。由于该关系容易被误读为进程归因，新增 ADR 明确其证据级别、权限边界、降级行为与 Docker Desktop 代理限制。

## Testing Decisions

- 以 Host inventory 为最高主要测试接缝：注入 Compose 运行时探针，验证对用户可见的 listener 行分组、独立状态、证据投影、工具链标识和只读处理方式；不测试内部调用顺序。
- Compose 探针使用受控的命令执行与文件发现边界测试：覆盖嵌套候选、忽略目录、64 个上限、固定只读命令、JSON 端口解析、TCP 精确 join、超时/CLI/shape 失败和不收集敏感数据。
- 行为测试覆盖：Vite/Go 的现有 Verified attribution 不变；关联的 Redis/PostgreSQL Docker 代理进入当前项目但仍为启动方未确认和只读；未知镜像回退 Docker；多 Compose 文件并存；DSH 重启式无 origin 情形可恢复；自定义项目名仅在可验证证据存在时关联；其他项目或端口巧合不得关联。
- Browser 面板测试覆盖可见的关联标签、详情字段、主/次级 Logo 规则、搜索/排序和无关联时既有 UI 行为。使用已有本地工具链资产，不依赖网络。
- 回归必须覆盖既有 Host/Browser RPC 序列化边界、Direct external termination 防护、Managed shutdown、类型检查、确定性测试、打包清单不含 demo，以及 `git diff --check`。实际 Docker Desktop 验收为 Windows 可选集成检查：确认真实 Compose 端口关联、Docker 不可用降级、`docker compose down` 后端口释放。

## Out of Scope

- Docker 容器级归因、将 Docker Compose 关联升级为 Verified attribution，或将其说成由 DSH 启动。
- Docker Compose/容器的启动、停止、重启、删除、日志、shell、镜像拉取、registry 请求、健康检查或编排控制 UI。
- Docker Desktop 代理 PID、dockerd 或容器进程的 Managed shutdown 或 Direct external termination。
- Kubernetes、Podman、WSL 发行版内部端口、远程 Docker context、Docker Swarm、Compose 配置编辑和自动发现 Workspace 外项目。
- 收集环境变量、Compose 文件正文、容器挂载、容器日志、绝对用户路径或镜像 registry 元数据。
- 改动 `port_list` 的只读 API、公开 RPC 的操作权限、Process origin、Windows scanner 或现有生命周期公开语义。

## Further Notes

- Docker Desktop 已发布端口的 Windows listener 可以由 `com.docker.backend` 等代理拥有；这是预期实现，不是归因失败的例外。Compose 项目关联的可信度来自“候选 Compose 文件的只读运行时查询 + 返回的运行容器/服务/发布端口 + 同轮本地 listener 的精确匹配”，而不是 Windows 父链。
- 官方 Docker Compose 文档说明项目名和 Compose 文件路径是项目边界输入，并通过 `docker compose` 的文件与项目目录选项确定；Docker CLI 文档也提供运行容器的镜像和已发布端口信息。实现应以运行时 capability probe 和实测 JSON shape 为准，失败时局部降级。[Docker Compose project name](https://docs.docker.com/compose/how-tos/project-name/)；[Docker Compose CLI](https://docs.docker.com/reference/cli/docker/compose/)；[Docker container port mappings](https://docs.docker.com/reference/cli/docker/container/port/)
- 可信度分层：候选查询与端口精确匹配可证明“当前 Workspace 的 Compose 定义正在发布这个端口”；它不能证明“当前这次 DSH Tool Call 启动了它”。前者足以支撑项目展示和镜像详情，后者仍仅由 existing Verified attribution 机制支撑。
