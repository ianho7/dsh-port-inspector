# 工具链 Logo 资源流水线

本文档面向维护者，说明如何更新 Runtime Inspector 使用的本地工具链 Logo。Runtime Inspector 运行时不从第三方官网加载 Logo；普通用户无需执行这些命令。

## 资源位置

- 正式素材：`assets/toolchains/`；
- 候选素材：`assets/toolchains/s2-candidates/normalized/`；
- 生成映射：`src/client/toolchain-logo-data.ts`，不要直接编辑。

## 批量更新

```powershell
node scripts/download-s2-toolchain-logo-candidates.mjs
npm run normalize:toolchain-logo-candidates
# 人工替换 assets/toolchains/s2-candidates/normalized/ 下的错误 Logo
npm run sync:toolchain-logo-candidates
```

同步脚本会将候选 Logo 统一为 `64×64 PNG`，复制到正式素材目录，并重新生成 TypeScript 导入映射。完成后运行：

```powershell
npm run typecheck
npm run build
```

## 只更新已有素材

如果只手动替换正式素材目录中的文件，执行以下命令重新生成映射：

```powershell
npm run update:toolchain-logos
```

提交前确认每个 Logo 都有本地文件、没有远程运行时 URL，并通过仓库的 Logo 资源测试。
