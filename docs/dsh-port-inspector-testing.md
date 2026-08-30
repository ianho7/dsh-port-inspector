# DSH Port Inspector：测试与手工验收指南

> 适用范围：Windows 本地开发环境、Stock DSH Web、Port Inspector `0.1.1` MVP。

## 验收目标

本指南验证以下用户闭环：

1. Bundle 能构建、安装并在目标 DSH Web Profile 中加载。
2. DSH 会话启动的监听端口可以显示可信来源、项目和会话上下文。
3. PowerShell/系统外部启动的监听端口不会借用当前 DSH 会话信息。
4. managed shutdown 与 external single-PID termination 使用不同路径，且操作后重新扫描端口。
5. 未知或新增 DSH 版本不会仅因版本号显示警告或整体拒绝；能力由实际 runtime contract 决定。

## 前置条件

- Windows。
- Node.js `>=22.19.0`。
- 当前仓库：`D:\project\dsh-port-inspector`。
- 可运行的 Stock DSH checkout，例如 `D:\project\deepseek-harness`。
- 目标 DSH Profile 为 `web`；如果使用其他 Profile，请替换下文命令中的名称。

## 1. 构建与确定性测试

```powershell
cd D:\project\dsh-port-inspector

npm install
npm run typecheck
npm test
```

验收条件：

- typecheck、Host build 和 Browser build 退出码为 `0`。
- 确定性测试无失败。
- 未设置真实环境变量时，Stock DSH native/Web gates 显示 skip 属于预期行为。
- 构建完成后，`lib/` 中不应有 `.map` 文件或历史 `index-*.js` chunk；Browser `client.js` 应保持为单一 lazy-CJS artifact。

### 原生 Web UI 弹窗视觉验收

Port Inspector 应使用与 DSH `ui-settings-general` 一致的 Modal Chrome：

- 弹窗在视口中水平、垂直居中，不固定在右上角。
- 背景存在全屏半透明遮罩和背景模糊；点击遮罩可以关闭弹窗。
- 桌面尺寸下，面板约为 `1040px` 宽、最高 `800px`，圆角为 `24px`，使用 DSH `lv3` 阴影，以容纳完整工具栏和双栏详情。
- 面板不使用只有一个菜单项的左侧导航栏；54px Header 直接显示 `Port Inspector`，下方为可滚动内容区。
- 正常状态不显示“观察模式”；仅在来源追踪降级或扫描未完成时显示对应的状态提示。
- 来源追踪降级和扫描未完成只显示在 Header 状态胶囊及相关行说明中，不重复显示全局警告；Workspace 中存在 Compose 文件但 Docker Engine 未运行时保持静默。
- 复制、打开目录和停止操作的反馈显示在对应详情区域；成功、警告和失败分别使用对应语义样式。复制和打开目录成功反馈在 4 秒后自动消失；停止、警告和错误结果保持可见。停止后目标行消失时结果显示在详情列顶部而不附着到新选中行。
- 首次 inventory 失败显示可重试错误；已有快照的刷新失败继续显示上次成功结果。技术错误默认折叠，展开内容不包含 stack。
- Sidebar 已显示确定监听数量时，首次打开面板应立即复用相同 Session ID 与 cwd 的完整快照，不显示整页“正在读取监听端口”；Host 复查在后台继续，并以中性更新状态呈现。上下文不同的快照不得复用。
- 端口列表列保持在面板可视高度内，由列表列自身垂直滚动；详情列保持可见并独立滚动，不随整个 Options 区域滚走。
- 关闭按钮为 28×28px 圆形按钮；按 `Escape` 关闭弹窗，确认弹窗打开时先取消确认层。
- 打开弹窗后焦点进入关闭按钮，关闭后焦点回到触发 Port Inspector 的侧边栏入口。
- 宽度低于 `960px` 的窗口仍保持居中，搜索框会独占工具栏一行；窄窗口中列表和详情可以纵向排列，不出现横向溢出。

## 2. 打包并安装到 Web Profile

推荐使用仓库内脚本一次完成构建、打包、卸载旧插件和安装新插件：

```powershell
cd D:\project\dsh-port-inspector
.\scripts\reinstall-dsh-plugin.ps1
```

如需指定其他 DSH checkout 或 Profile：

```powershell
.\scripts\reinstall-dsh-plugin.ps1 `
  -DshRepo 'D:\project\deepseek-harness' `
  -Profile web
```

脚本最后的列表应包含：

```text
dsh-port-inspector@0.1.1
```

打包日志中的 `Tarball Contents` 应只包含 `lib/**/*.js`、`lib/**/*.d.ts`、`cordis.patch.yml` 以及 npm 自动保留的 `package.json`/`README.md` 等元文件，不应出现任何 `.map` 文件。

如果插件尚未安装，脚本会提示 `remove` 的非零退出码，但仍会继续安装新包。
完全退出旧 DSH Web 进程，然后按该 DSH checkout 的正常方式重新启动 `web` Profile。不要复用插件更新前创建的后台任务：Process origin 是当前运行周期内存数据，旧进程不会被追溯归因。

## 3. 验证 DSH 会话监听

在项目目录 `D:\project\dsh-port-inspector` 创建一个新的 DSH 会话，输入：

```text
请在当前项目启动一个本地 HTTP 服务，监听 127.0.0.1:4173，并保持运行。
```

等待 DSH 确认服务已启动，打开侧边栏 Port Inspector，必要时点击“刷新”。

端口 `4173` 应满足：

- Header 显示 `Port Inspector`，正常状态不额外显示“观察模式”。
- 启动方为“由 DSH 启动”。
- 列表标题显示当前实际可见的监听项数量，不再显示四格统计摘要。
- 工具栏提供“查看：开发相关 / 全部监听”“启动方：全部 / 由 DSH 启动 / 启动方未确认”和“仅显示可处理”。
- 项目目录不是“未提供”或“未关联项目”。
- Session 显示当前会话标题。
- Call ID不是“未提供”。
- 用户请求显示上面的 4173 请求。
- 创建时间是本地日期时间，不是 17–20 位 FILETIME 数字。
- 处理方式通常为“停止 DSH 任务”；是否拥有 managed owner 以实际 Host inventory 为准。
- 页面不显示“未纳入回归测试”或类似版本提示。

## 4. 验证 managed shutdown

选中 4173，点击“停止 DSH 任务”并确认。确认信息应包含当前进程和监听身份。

操作后预期：

- 面板报告操作结果并执行 fresh scan。
- 4173 从列表消失或明确报告端口是否仍在监听。
- DSH Web 自身和其他未选中的 listener 不受影响。

PowerShell 复核：

```powershell
Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue
```

端口已释放时没有输出。

## 5. 验证 PowerShell 外部监听

打开另一个 PowerShell 窗口：

```powershell
cd D:\project\dsh-port-inspector

node -e "require('http').createServer((req,res)=>res.end('ok')).listen(4174,'127.0.0.1',()=>console.log('Listening on 4174')); setInterval(()=>{},2147483647)"
```

保持该窗口运行，回到 Port Inspector 并刷新。

端口 `4174` 应满足：

- 启动方为“启动方未确认”。
- 处理方式在身份完整且安全检查可用时为“结束该进程”，不能仅因启动方未确认而强制变成“仅可查看”。
- Session 为“未关联 DSH 会话”。
- Call ID为“未提供”。
- 用户请求为“未提供”，不得显示之前 4173 的会话请求。
- 创建时间是本地日期时间。

首次打开面板时，默认是“查看：开发相关”：当前项目和已识别的开发环境优先显示，System、`svchost.exe`、Spotify、微信和代理进程等没有开发依据的监听进入折叠的“其他监听”。这不是删除或忽略它们：

- 点击“全部监听”可展开完整 inventory。
- 直接搜索端口、PID 或应用名会搜索全部监听，并显示“搜索已覆盖全部监听”的提示。
- 在搜索结果的其他监听行点击图钉，可将其放入“固定显示”；刷新浏览器后仍应保留，取消固定后返回“其他监听”，不产生重复行。
- 已识别的 Vite、Node.js、PostgreSQL 等工具链在列表和详情中使用同一份随包内置的 Logo；离线打开面板也应正常显示。
- 列表标题的数量只计算当前实际显示的行；折叠的“其他监听”数量单独显示在展开按钮中。

维护者更新官方 Logo 素材时运行 `npm run update:toolchain-logos`，然后重新执行 `npm run build`；普通用户打开面板时不会访问工具链官网。

## 6. 验证 external single-PID termination

选中 4174，点击“结束该进程”。确认弹窗应重新展示：

- PID。
- 创建时间。
- 可执行文件。
- 监听地址和端口。
- 该操作与 DSH 来源归因无关的说明。

确认后预期：

- 只结束选中的单个外部 PID。
- 面板执行 fresh scan 并报告端口释放结果。
- 启动外部服务的 Node 进程退出。
- DSH Web 和其他 listener 保持正常。

PowerShell 复核：

```powershell
Get-NetTCPConnection -LocalPort 4174 -State Listen -ErrorAction SilentlyContinue
```

## 7. Opt-in Stock DSH gates

### Bundle lifecycle smoke

```powershell
$env:DSH_REPO = 'D:\project\deepseek-harness'
node --test tests/dsh-bundle-smoke.test.mjs
```

### Native G1–G6 release gate

```powershell
$env:DSH_REPO = 'D:\project\deepseek-harness'
node --test tests/dsh-release-gate.test.mjs
```

### Real Browser-to-Host Web smoke

```powershell
$env:DSH_REPO = 'D:\project\deepseek-harness'
$env:DSH_WEB_E2E = '1'
node --test tests/dsh-web-smoke.test.mjs
```

新增 DSH/node-pty 回归基线、修改 attribution/lifecycle/action safety 或改变 Browser/Host contract 时，应显式运行对应 gate。默认测试中的 skip 不能替代正式发布验收。

## 8. 故障反馈清单

反馈问题时提供：

1. 面板顶部状态和目标监听行截图。
2. 选中目标行后的完整详情截图。
3. 目标端口和启动方式（DSH 会话或外部 PowerShell）。
4. Profile 插件列表：

   ```powershell
   pnpm dsh plugin --profile web list
   ```

5. 监听快照：

   ```powershell
   Get-NetTCPConnection -LocalPort 4173,4174 -State Listen -ErrorAction SilentlyContinue
   ```

6. DSH Web 启动终端中与 `dsh-port-inspector` 有关的错误；先移除令牌、认证头、环境变量值和其他秘密。
