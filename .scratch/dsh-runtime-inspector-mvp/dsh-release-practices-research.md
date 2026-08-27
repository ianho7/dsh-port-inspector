# DSH 插件发布渠道研究

> 日期：2026-08-27
> 范围：DSH Bundle 的用户安装、npm/GitHub 发布和可选插件目录。

## 结论

- DSH 的标准安装入口是 `dsh plugin --profile <name> <pnpm args...>`。官方 CLI 将参数转发给 Profile 目录中的 pnpm；成功后，包含 `dsh.bundle.patch` 的依赖会自动进入 `dsh.profile.bundles`。因此普通用户不需要修改 DSH 源码或手工编辑组合配置。[DSH CLI reference](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/reference/README.md)、[DSH plugin manager source](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/src/plugin.ts)
- npm 包是最适合稳定用户渠道的实现：用户按包名安装，预构建的 `lib/`、Bundle patch 和 Browser artifact 随包分发。`dsh-better-sidebar` 的 manifest 同时声明了 `dsh.bundle.patch`、`dsh.client` 和发布文件清单，并在 npm 上提供公开包。[better-sidebar package.json](https://raw.githubusercontent.com/omdsh-dev/DSH-better-sidebar/main/package.json)、[better-sidebar npm page](https://www.npmjs.com/package/dsh-better-sidebar)
- GitHub 源码安装是官方支持的开发/审计渠道，但 Git 依赖通常要在目标机执行 `prepare`/构建，pnpm 10/11 还可能要求用户批准构建脚本。它适合开发者，不应作为 Windows 原生插件的默认用户路径。[DSH plugin manager source](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/src/plugin.ts)、[better-sidebar install guide](https://github.com/omdsh-dev/DSH-better-sidebar/blob/main/README_EN.md)
- GitHub Release 适合作为变更记录、源码标签、校验和及离线 `.tgz` 备份；它不是 DSH 默认的发现/安装注册表。下载的 tarball 可以再作为本地包传给 `dsh plugin`。同类项目存在只发 GitHub Release tarball 的模板，也存在从 GitHub tag 自动发布 npm 的项目。[plugin-template README](https://github.com/omdsh-dev/plugin-template/blob/main/README.md)、[better-sidebar releases](https://github.com/omdsh-dev/DSH-better-sidebar/releases)
- 插件市场/目录属于发现层，不是运行时必要条件。社区市场通常保存仓库、版本和安装 spec，然后仍调用真实的 `dsh plugin`；插件本体仍由作者仓库和 npm/Git source 提供。[dsh-marketplace](https://github.com/ydhrdh/dsh-marketplace)、[dsh-hub-workshop](https://github.com/omdsh-dev/dsh-hub-workshop)

## 对 Runtime Inspector 的直接建议

1. 以 npm registry 作为主分发渠道：发布 `dsh-runtime-inspector@<version>`，用户执行 `dsh plugin --profile web add dsh-runtime-inspector@<version>`。
2. 每个版本同时创建同名 Git tag/Release，例如 `v0.1.0`，上传与 `npm pack` 完全相同的 `.tgz` 和 SHA-256 校验文件。
3. 在 npm 发布前验证最终包，而不是只验证工作树：构建、测试、`npm pack --dry-run --json`，再把生成的 tarball 安装到干净的 DSH Profile 中做 Bundle/Web smoke。
4. 发布自动化优先采用 GitHub Actions + npm Trusted Publishing；npm 文档说明它通过 OIDC 发布并自动生成 provenance。仓库的 `repository.url` 应与实际 GitHub 仓库精确一致。[npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)、[npm publish](https://docs.npmjs.com/cli/commands/npm-publish/)
5. 当前 `dsh.bundle.patch`、`dsh.client`、`exports["./client"]` 和 `files` 已接近可发布形态；正式发布前仍应补齐准确的 repository/homepage/bugs 元数据和实际 MIT LICENSE 文件，并把用户安装说明与维护者本地重装脚本分开。
