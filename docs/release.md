# DSH Port Inspector 发布指南

本文档面向维护者，说明如何检查、构建、打包和发布 Port Inspector。普通用户不需要执行这些步骤；使用者只需按照 README 或 DSH 安装说明安装已发布的 Bundle。

## 发布脚本

`scripts/publish-release.ps1` 会将 npm 打包、npm 发布和 GitHub Release 串成一个流程。版本号直接读取 `package.json`，运行脚本即开始正式发布：

```powershell
.\scripts\publish-release.ps1
```

打包时会触发项目的构建流程。`package.json.files` 只允许发布 `lib/**/*.js`、`lib/**/*.d.ts` 和 `cordis.patch.yml`。

Browser 面板使用 256px WebP 运行时 Logo；原始设计候选图只用于仓库文档，不会被内联到 Bundle。这样既避免旧 hash chunk/source map 残留，也避免把设计原图带入用户安装包。

## 发布前检查

正式发布前确认：

- `package.json` 的版本已经提交；
- 工作树干净；
- 仓库存在实际的 `LICENSE` 文件和正确的 `repository.url`；
- npm 与 GitHub CLI 已完成登录；
- 需要时准备好 Stock DSH checkout，并使用目标 Profile 验证 Bundle。

发布前如需运行真实 Stock DSH 门禁，请单独执行对应测试：

```powershell
$env:DSH_REPO = 'D:\project\deepseek-harness'
npm test
```

## 正式发布

确认 `package.json` 中的版本已经更新并提交，然后执行：

```powershell
.\scripts\publish-release.ps1
```

脚本会把同一份 tarball 发布到 npm，并作为附件上传到对应版本的 GitHub Release。npm 或 GitHub 拒绝重复版本时，脚本会停止。

脚本不会自动修改版本号或创建 Git commit，也不替代 GitHub Actions 的 npm Trusted Publishing 配置。
