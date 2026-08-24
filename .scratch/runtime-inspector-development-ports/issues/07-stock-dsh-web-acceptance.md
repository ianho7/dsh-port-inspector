# 07: 真实 Stock DSH Web 集成验收

**What to build:** 在真实 Stock DSH Web 中证明开发端口默认视图、分组、隐藏项搜索、固定显示、工具链 Logo、安静选中态和既有进程操作路径共同工作，并记录完整回归证据。

**Blocked by:** 03: 本地 Logo 管线与 Web 工具链; 04: 后端与数据工具链识别; 05: 容器、移动开发与本地 AI; 06: 固定显示与偏好持久化.

**Status:** claimed

- [x] 真实 Profile 加载 Client artifact，并显示当前项目、开发环境和默认折叠的其他监听。
- [x] Web smoke 能从折叠项中搜索外部监听、选择详情并验证列表与详情 Logo 一致。
- [x] 固定显示跨 Browser reload 生效，随后可取消固定且不产生重复行。
- [x] 选中态、键盘焦点和 1280×720 信息密度符合批准的视觉约束。
- [x] 现有 Managed shutdown 或 Direct external termination 路径仍经过 Host 身份复核和 fresh scan，DSH Web listener 保持健康。
- [ ] Client artifact 运行时不请求工具链官网；build、typecheck、deterministic suite、Windows lifecycle gate、Web smoke 和 `git diff --check` 全部通过。

## Comments

- 2026-08-24: Real Stock DSH Web smoke passed after building the Client artifact. It verified the default development view, collapsed-other global search, pin persistence across Browser reload, unpin without duplicate rows, local Logo equality between list/detail, calm selected styling at 1280×720, external single-PID fresh scan, and unaffected Web health.
- 2026-08-24: Deterministic verification passed 112/112 non-skipped tests (109 passed, 3 opt-in gates skipped). Bundle lifecycle smoke passed. The separate G1–G6 release gate was retried twice and both runs stopped at the existing Terminal fixture: `spawnTerminal` produced a valid attributed PID, but port `39104` never appeared as listening. No lifecycle or action code was changed for this feature, so the gate remains an environment acceptance gap rather than a reason to weaken safety.
