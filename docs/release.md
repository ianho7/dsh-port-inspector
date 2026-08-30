# DSH Runtime Inspector 发布指南

本文档面向维护者，说明如何检查、构建、打包和发布 Runtime Inspector。普通用户不需要执行这些步骤；使用者只需按照 README 或 DSH 安装说明安装已发布的 Bundle。

## 发布脚本

`scripts/publish-release.ps1` 会将检查、构建、测试、npm tarball、npm 发布和 GitHub Release 串成一个流程。默认使用 Dry Run，只检查并生成 `.tgz`，不会发布或推送：

```powershell
.\scripts\publish-release.ps1 -DryRun
```

构建会先清理生成目录 `lib/`，再依次生成 Host 和 Browser artifact。Host TypeScript declaration 保留，但不生成 `sourceMap` 或 `declarationMap`；Browser `tsdown` 也关闭 source map。`package.json.files` 只允许 `lib/**/*.js`、`lib/**/*.d.ts` 和 `cordis.patch.yml`，发布脚本还会拒绝最终 tarball 中出现 `.map` 文件。

Browser 面板使用 256px WebP 运行时 Logo；原始设计候选图只用于仓库文档，不会被内联到 Bundle。这样既避免旧 hash chunk/source map 残留，也避免把设计原图带入用户安装包。

## 发布前检查

正式发布前确认：

- `package.json` 的版本已经提交；
- 工作树干净；
- 仓库存在实际的 `LICENSE` 文件和正确的 `repository.url`；
- npm 与 GitHub CLI 已完成登录；
- 需要时准备好 Stock DSH checkout，并使用目标 Profile 验证 Bundle。

需要运行真实 Stock DSH 门禁时：

```powershell
.\scripts\publish-release.ps1 `
  -Version 0.1.1 `
  -DshRepo 'D:\project\deepseek-harness' `
  -RequireStockDshGates `
  -DryRun
```

## 正式发布

确认 Dry Run 产物后执行完整发布。`-CreateTag` 和 `-PushTag` 是显式 Git 写操作，脚本不会自动覆盖已有 Tag：

```powershell
.\scripts\publish-release.ps1 `
  -Version 0.1.1 `
  -DshRepo 'D:\project\deepseek-harness' `
  -RequireStockDshGates `
  -Publish `
  -CreateTag `
  -PushTag
```

脚本会把同一份 tarball 发布到 npm，并作为附件上传到 `v0.1.1` GitHub Release；已有 npm 版本不会被覆盖，已有 Release 会以 `--clobber` 更新附件。需要自定义 Release 文案时传入 `-ReleaseNotesPath`。

脚本不会自动修改版本号、创建提交，也不替代 GitHub Actions 的 npm Trusted Publishing 配置。
