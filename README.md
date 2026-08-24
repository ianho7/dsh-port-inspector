# DSH Runtime Inspector

DSH Runtime Inspector 是面向 Windows 本地开发场景的 DSH Bundle。它在 DSH Web 中列出 TCP 监听端口，识别端口与当前 DSH Session/Tool Call 的关系，并让用户通过正确的安全路径停止 DSH 任务或结束一个明确选择的外部进程。

Windows MVP 已完成 Host、Browser、原生生命周期和真实 Stock DSH Web 验收。

## 产品能力

- 在 DSH Web 侧边栏打开紧凑的浅色 Runtime Inspector 面板。
- 显示监听地址、端口、PID、应用、项目和格式化创建时间。
- 对已验证来源显示 Session 标题、Call ID 和触发调用的用户请求。
- 将启动方与处理方式分开表达：
  - 启动方：`由 DSH 启动` / `启动方未确认`。
  - 处理：`停止 DSH 任务` / `结束该进程` / `仅可查看`。
- managed target 只通过 DSH Job/Terminal lifecycle 关闭。
- 外部 target 只在用户确认并重新校验 PID、创建时间、executable、用户、保护级别和监听身份后结束选中的单个 PID。
- 提供只读 `port_list` Tool；模型不能通过该 Tool 直接执行进程操作。

## 运行边界

- 仅支持 Windows local execution world 和 TCP listeners。
- Process origin 只保留在当前 DSH 运行周期内；安装或更新 Bundle 后必须重启目标 Profile，并创建新任务才能获得来源归因。
- DSH 版本号只作为开发诊断和回归信息。公开功能按当前 runtime capability 启用，不向用户显示版本兼容提示。
- 私有 delayed Terminal PID repair 只对经过 native gate 的精确 DSH 版本和 handle shape 启用。
- 不终止外部进程树、不自动提权、不读取环境秘密、不在 managed shutdown 失败后升级为 PID 强杀。

## 开发与验证

```powershell
npm install
npm run typecheck
npm test
```

`npm test` 会构建 Host 与 Browser，并运行确定性 Node 测试。需要 Stock DSH 或浏览器的真实验收门禁默认跳过。

完整的打包、Profile 安装、DSH 端口、PowerShell 外部端口和 opt-in smoke 步骤见 [测试与手工验收指南](./docs/dsh-runtime-inspector-testing.md)。

## 安装到 DSH Web Profile

推荐直接运行仓库内的重建、打包、卸载和安装脚本：

```powershell
cd D:\project\dsh-runtime-inspector
.\scripts\reinstall-dsh-plugin.ps1
```

脚本默认使用 `D:\project\deepseek-harness` 的 `web` Profile；也可以显式指定 DSH 仓库和 Profile：

```powershell
.\scripts\reinstall-dsh-plugin.ps1 `
  -DshRepo 'D:\project\deepseek-harness' `
  -Profile web
```

脚本会先构建 Host/Browser artifact，再生成 `.tmp\manual-test\dsh-runtime-inspector-0.1.0.tgz`，然后卸载同名旧插件并安装新包。旧插件不存在时的卸载错误会被提示但不会阻止首次安装。

安装完成后，应完全退出并重新启动 `web` Profile。

如果本机的 `node.exe` 或 `pnpm` 被版本管理器拦截，可以分别通过 `-NodePath` 和 `-PnpmCliPath` 指定可用的可执行文件或 `pnpm.cjs`。

## 文档

- [Windows MVP](./docs/dsh-runtime-inspector-mvp.md)
- [Implementation Spec](./docs/dsh-runtime-inspector-mvp-spec.md)
- [产品与技术决策](./docs/dsh-runtime-inspector-mvp-decisions.md)
- [术语表](./docs/dsh-runtime-inspector-glossary.md)
- [ADR-0004：单仓库 Web 双半 Bundle](./docs/adr/0004-web-client-dual-face-bundle.md)
- [ADR-0005：以运行时能力代替版本总开关](./docs/adr/0005-capability-based-dsh-compatibility.md)

## Real Stock DSH Web smoke

```powershell
$env:DSH_REPO = 'D:\project\deepseek-harness'
$env:DSH_WEB_E2E = '1'
node --test tests/dsh-web-smoke.test.mjs
```

该测试启动临时 Stock DSH Web Profile，通过 Chromium 验证 Browser artifact、Slots、真实 inventory、Host bridge 和一次经过身份复核的外部操作。新增回归基线或修改 Browser/Host 边界时应显式运行。
