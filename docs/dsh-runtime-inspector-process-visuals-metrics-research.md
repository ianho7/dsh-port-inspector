# Runtime Inspector 进程图标与资源指标可行性研究

> 状态：建议进入实现设计
> 日期：2026-08-24
> 范围：仅评估 `src/client/` Web 面板中的进程图标、内存和 CPU 展示；不扩展模型可见的 `port_list`，不改变现有进程归因或终止权限。

## 结论

这三项能力都可以在现有单 Bundle、Host/Browser 双半架构内实现，不需要修改 DSH core，也不需要新增独立服务。

| 能力 | 可行性 | 主要难点 | 建议优先级 |
| --- | --- | --- | --- |
| 进程内存 | 高 | 明确展示的是工作集还是私有提交量；权限不足时降级 | P0 |
| 进程 CPU | 高 | CPU 是区间值，至少需要两次采样；需要面板打开期间的轻量轮询 | P0 |
| 进程图标 | 中高 | 取得完整 executable 路径、HICON 转浏览器图片、缓存和句柄释放 | P1 |
| 与任务管理器完全一致 | 中 | Windows 对窗口应用、进程、包应用和工作单元有不同呈现语义 | 不作为首版承诺 |

进程图标与工具链 Logo 现在承担不同职责：Windows executable 图标表达“哪个程序文件拥有监听器”，工具链 Logo 表达 Host 已经确定的开发运行时、框架或基础设施。Web 开发端口视图优先使用工具链 Logo；只能确定 `node.exe`、`python.exe`、`java.exe` 或 `.NET` 运行时时回退到运行时 Logo；仍无法确定时使用通用本地图标。工具链 Logo 不代表 Process origin 或 action authority。

因此，第一阶段可以先实现本地审核的工具链 Logo，而不需要等待 HICON 提取。后续 executable 图标仍可作为传统桌面应用和未知进程的增强 fallback，但不再是 Web 开发端口视图的唯一视觉来源。

## 为什么与当前架构兼容

现有 [ADR-0004](adr/0004-web-client-dual-face-bundle.md) 已规定：Windows scanner、process handle 和其他原生能力只能在 Host，Browser 只能消费有界、可序列化的同源 RPC。当前实现也已经具备所需的大部分基础：

- `src/windows-scanner.ts` 已枚举监听 PID 和系统进程，并为进程读取创建时间；
- `src/process-identity.ts` 已通过 Koffi 调用 `OpenProcess` 和 `GetProcessTimes`；
- `src/process-actions.ts` 已实现 `QueryFullProcessImageNameW` 绑定，可证明完整 executable 路径能够只在 Host 内读取；
- `src/host-ui.ts` 已是 Browser DTO 的唯一可信投影边界；
- `src/client/panel.ts` 目前只在打开面板或手工刷新时请求 inventory，没有持续采样机制。

因此，这项功能应是 Host 展示数据的增量扩展，而不是 Browser 原生能力或新的 DSH provider。

## 内存

### 推荐口径

第一版优先运行时探测 `PROCESS_MEMORY_COUNTERS_EX2.PrivateWorkingSetSize`，它是当前私有工作集字节数，最适合作为任务管理器风格的列表值；在不支持 EX2 的系统上回退到 `PROCESS_MEMORY_COUNTERS_EX.WorkingSetSize`。DTO 必须同时返回 `memoryKind: 'private-working-set' | 'working-set'`，UI tooltip/详情明确口径，不能把两种数值静默混用。详情中可再显示 `PrivateUsage`，文案为“私有提交”。

微软的 [`GetProcessMemoryInfo`](https://learn.microsoft.com/en-us/windows/win32/api/psapi/nf-psapi-getprocessmemoryinfo) 可以把进程内存统计写入 `PROCESS_MEMORY_COUNTERS_EX`。该结构中：

- [`PrivateWorkingSetSize`](https://learn.microsoft.com/en-us/windows/win32/api/psapi/ns-psapi-process_memory_counters_ex2) 是当前私有工作集字节数；该 EX2 结构要求 Windows 10 22H2/Windows 11 22H2 的 2023-09 累积更新或更高版本，因此必须按 capability 探测；
- [`WorkingSetSize`](https://learn.microsoft.com/en-us/windows/win32/api/psapi/ns-psapi-process_memory_counters_ex) 是进程当前工作集字节数，包含共享页，是旧系统的安全回退；
- `PrivateUsage` 是进程的私有 committed memory/Commit Charge，不等于当前物理驻留量。

现代 Windows 上，文档允许以 `PROCESS_QUERY_INFORMATION` 或 `PROCESS_QUERY_LIMITED_INFORMATION` 句柄读取这些统计。这与当前 `readWindowsProcessIdentity()` 已申请的最小查询权限相容；实现时可把创建时间、CPU 时间和内存读取合并到一次短生命周期 `OpenProcess` 中，避免为同一个 PID 重复开句柄。

### 限制

- 受保护、其他用户或 ACL 不允许查询的进程可能返回未知；[Windows 进程访问控制](https://learn.microsoft.com/en-us/windows/win32/procthread/process-security-and-access-rights) 明确限制部分 protected process 权限。
- 同一 PID 可能监听多个端口，内存必须按 `PID + creation time` 采样并复用，不能按端口重复相加。
- 读取失败只能使该字段显示“不可用”，不能使监听行消失，也不能改变 action availability。

## CPU

### CPU 不能一次读取

[`GetProcessTimes`](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getprocesstimes) 返回进程累计 kernel time 和 user time，单位为 100 ns；它不是当前 CPU 百分比。进程的所有线程时间会求和，因此在多核系统上，累计 CPU 时间可以增长得比墙钟时间更快。

CPU 百分比必须由两次样本的差值计算。微软的 performance counter 文档也明确说明，rate counter 通常需要前后两个样本，并建议样本间至少约一秒；同时微软指出，低频诊断可使用 performance counters，但更轻量的场景可直接使用 `GetProcessTimes`、`GetSystemTimes` 等 API：

- [Collecting Performance Data](https://learn.microsoft.com/en-us/windows/win32/perfctrs/collecting-performance-data)
- [About Performance Counters](https://learn.microsoft.com/en-us/windows/win32/perfctrs/about-performance-counters)

### 推荐计算

Host 为每个 `PID + creation time` 保存上一个进程样本和单调时钟样本，并在启动时读取 active processor count：

```text
processDelta100ns = (kernelTime + userTime)now - (kernelTime + userTime)previous
elapsedSeconds    = QPC delta / QPC frequency
cpuPercent        = 100 * processDelta100ns
                    / (elapsedSeconds * 10,000,000 * activeProcessorCount)
```

[`QueryPerformanceCounter`](https://learn.microsoft.com/en-us/windows/win32/sysinfo/acquiring-high-resolution-time-stamps) 是微软推荐的本机短区间单调计时方式；[`GetActiveProcessorCount(ALL_PROCESSOR_GROUPS)`](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-getactiveprocessorcount) 返回整机 active processors。上述结果把整机 CPU 容量归一到 0–100%，接近任务管理器常见的总 CPU 百分比展示。首个样本应显示“采样中”，不能伪造为 0%。

不推荐把 [`GetSystemTimes`](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getsystemtimes) 作为通用分母：超过 64 个逻辑处理器时，它只覆盖调用线程所属的 primary processor group。QPC 墙钟区间乘以 `ALL_PROCESSOR_GROUPS` 的 active processor count 不受这个特定限制。

### 采样节奏

当前 Web 面板只有手工刷新。如果希望 CPU 像任务管理器一样有意义，建议：

- 仅在面板打开时，每 2 秒请求一次轻量 `metrics` RPC；
- 关闭面板立即停止轮询；
- `metrics` 只处理当前可见且已经由 inventory 发布的有界 listener IDs；
- Host 的 allowlist/cache 使用短 TTL，并以 `PID + creation time` 重新确认身份；
- inventory 的完整 `netstat` 和 ancestry 扫描仍由手工刷新或较低频率触发，不能每 2 秒重复执行当前完整同步扫描。

这样可以避免反复启动 `netstat.exe` 和枚举全系统父链，同时保留实时 CPU/内存体验。

## 进程图标

### 推荐来源

1. Host 使用 [`QueryFullProcessImageNameW`](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-queryfullprocessimagenamew) 取得完整 executable 路径；该 API 只需要查询或受限查询权限。
2. 在 Host 的后台 worker 中调用 [`SHGetFileInfoW`](https://learn.microsoft.com/en-us/windows/win32/api/shellapi/nf-shellapi-shgetfileinfow)，以 `SHGFI_ICON | SHGFI_SMALLICON` 取得 Shell 为该文件选择的图标。
3. 把 `HICON` 绘制到固定尺寸的 32-bit DIB，再通过 [Windows Imaging Component](https://learn.microsoft.com/en-us/windows/win32/api/wincodec/nn-wincodec-iwicimagingfactory) 或一个经过测试的有界编码器输出小尺寸 PNG。Windows 官方图标文档说明可用 `GetIconInfo` 取得位图、用 `DrawIconEx` 绘制；`CreateDIBSection` 可提供可直接读取的像素缓冲：
   - [About Icons](https://learn.microsoft.com/en-us/windows/win32/menurc/about-icons)
   - [DrawIconEx](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-drawiconex)
   - [CreateDIBSection](https://learn.microsoft.com/en-us/windows/win32/api/wingdi/nf-wingdi-createdibsection)
4. `SHGetFileInfoW` 返回的非共享 `HICON` 用完后必须调用 [`DestroyIcon`](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-destroyicon)；所有 HDC/HBITMAP/GDI 对象也必须在 `finally` 中成对释放。

微软文档要求在调用 `SHGetFileInfoW` 前初始化 COM，并建议从后台线程调用，以免阻塞 UI。因此不建议把图标提取直接塞进当前同步的 inventory 路径。

### 传输和缓存

不要在每一行内重复携带 base64 图片。推荐：

- inventory 只返回 `iconKey?: string`；
- 增加同源只读图片端点，例如 `GET /api/dsh-runtime-inspector/icon/<opaque-key>`；
- 端点只能读取 Host 已生成的有界缓存，不能接受路径或任意 PID；
- 固定返回 `image/png` 或 `image/x-icon`，设置私有缓存头；
- 以内部规范化 executable 路径和文件版本/mtime 生成 key，但原始路径不跨 Host/Browser 边界；
- 设定条目数、单图字节数、总字节数和 TTL 上限，Bundle dispose 时清空缓存；
- 失败时显示 Runtime Inspector 自带的通用进程图标。

同一 executable 的多个监听 PID 应共享一个图标缓存项；同一 PID 的多个端口也只生成一次。

### 与任务管理器不完全一致的情况

- `SHGetFileInfoW(executable)` 适合传统 Win32 executable，但不保证复刻任务管理器对窗口、应用组或宿主进程的选择。
- packaged/MSIX 应用的视觉资源来自 package manifest 和带 scale/theme qualifier 的资源；微软的 [App icon construction](https://learn.microsoft.com/en-ie/windows/apps/design/style/iconography/app-icon-construction) 文档展示了 `Square44x44Logo` 等 manifest 资产。若未来要求精确支持 packaged app，应单独增加 package identity/manifest 解析，而不是把它混入首版。
- 本产品显示的是 TCP listener 的 owning process。若真正监听的是 `node.exe`，应显示 Node 图标，而不是依据项目目录猜测 React、Vite 或用户品牌图标。

## 推荐 Host/Browser 契约

展示数据保持可选并带采样时间：

```ts
interface HostProcessPresentation {
  readonly iconKey?: string
  readonly memoryBytes?: number
  readonly memoryKind?: 'private-working-set' | 'working-set'
  readonly privateCommitBytes?: number
  readonly cpuPercent?: number
  readonly sampledAt?: number
}
```

可以把它作为 `HostListenerRow` 的可选 `presentation` 字段，或由独立 `metrics` 响应按 `listenerId` 返回。推荐后者，因为 inventory、CPU 采样和图片生命周期不同。

Browser 仍然不能获得：

- 原始 executable 全路径；
- process handle；
- 任意 PID 查询入口；
- Windows scanner、Koffi、Job/Terminal 或终止 primitive。

模型可见的只读 `port_list` 也不需要新增 CPU、内存或图标字段；用户当前只要求 Web 面板，这能避免扩大模型数据面和 token 体积。

## 建议实现切片

### Slice 1：资源指标

- 新增 Host-only process telemetry sampler；
- 合并 identity、kernel/user times 和 memory counters 的句柄读取；
- 建立以 `PID + creation time` 为 key 的有界双样本 CPU cache；
- 新增轻量 `metrics` RPC 和面板打开期间 2 秒轮询；
- 列表显示 `CPU` 和“内存（工作集）”，详情补充私有提交量和采样时间；
- 任何字段失败均局部显示“—”。

粗略工作量：1.5–3 天，包含 deterministic tests 和一次 Windows native smoke。

### Slice 2：传统 desktop executable 图标

- Host 后台 worker 中读取完整 image path 和 Shell icon；
- 完成 HICON 到浏览器图片的转换、所有 native/GDI 资源释放；
- 建立有界缓存和只读图片端点；
- 列表与详情显示图片，失败使用通用图标；
- 不处理 packaged app 精确 logo。

粗略工作量：2–4 天。主要不确定性在透明度正确的图片编码、Koffi 结构布局和 Stock DSH 打包后的 native/worker 路径。

### Slice 3：增强兼容性（可选）

- packaged/MSIX app identity 和 manifest asset；
- 超过 64 CPU 的 processor-group-aware 采样；
- Windows 缩放/高 DPI 下的多尺寸图标；
- 更接近任务管理器的应用聚合。

不建议阻塞首版。

## 验证要求

至少覆盖：

1. idle 和 busy-loop fixture 在首个样本显示未知，第二个样本产生有区分度的 CPU 值；
2. 进程主动分配内存后，工作集或私有提交量出现可观测增长；
3. 同一 PID 监听多个端口时共享同一指标和图标，不重复计数；
4. PID creation time 改变后丢弃旧 CPU 基线，不把 PID reuse 当作同一进程；
5. 进程退出、access denied、protected process 和 native API 失败时仅局部降级；
6. 图标响应具有固定 MIME、有效签名、尺寸上限和通用 fallback；
7. inventory/metrics/icon 响应中没有原始完整 executable 路径；
8. Browser bundle 仍不导入 Node/Koffi/Windows 模块；
9. metrics 与 icon failure 不改变来源置信度、Lifecycle owner 或 action kind；
10. Stock DSH Web smoke 验证图片能加载、CPU 会更新、面板关闭后停止轮询；
11. Bundle dispose 后 worker、timer、cache 和 route 全部撤销；
12. `git diff --check`、build、typecheck、deterministic suite 和 opt-in Stock DSH gates 按仓库规则执行。

## 最终建议

建议做，而且可以不触碰现有高风险边界。实现顺序应是“内存和 CPU → desktop executable 图标 → packaged app 增强”。

产品文案建议使用：

- `CPU 3.2%`
- `内存 184 MB`，tooltip/详情注明“工作集”
- 首个或不可读样本显示 `—`，并区分“采样中”和“不可用”
- 图标不可读时使用通用进程图标，不显示破图

首版验收目标应是“资源数据可信、失败可降级、不会影响安全操作”，而不是像素级或统计口径级复刻任务管理器。
