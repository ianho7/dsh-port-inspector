# 03: Verify live locale switching on certified Stock DSH Web

**What to build:** Exercise the completed bilingual Runtime Inspector in the real Stock DSH Web environment and close any integration gaps revealed by the shipped Client artifact. The acceptance path must prove that DSH's real locale service, Bundle loading, Slot registration, live language switch, accessibility surface, and existing Runtime Inspector inventory/action behavior work together without adding Host authority or runtime network traffic.

**Blocked by:** 02: Localize the complete Runtime Inspector presentation

**Status:** resolved

- [x] The built Client artifact loads through the existing DSH Web Bundle mechanism on the certified Web baseline available in the checkout: `dsh-0.1.1-rc.2`.
- [x] A real DSH Web session renders Runtime Inspector correctly with the DSH locale set to English, including visible labels and accessibility names.
- [x] The same session renders Runtime Inspector correctly with the DSH locale set to Chinese, including visible labels and accessibility names.
- [x] Changing the DSH language through the real settings flow updates an already open Runtime Inspector surface.
- [x] The actual `document.documentElement.lang` projection is observed as supporting evidence, while deterministic Client tests prove that the public `ctx.locale` value is authoritative when the two values disagree.
- [x] Inventory refresh, listener selection, search/filter controls, redacted copy, confirmation, and the existing action result/fresh-scan path remain functional in the real Web smoke.
- [x] The smoke confirms that no locale change adds Host process primitives, changes Host/RPC schemas, expands `port_list`, contacts third-party translation services, or changes Process origin, Lifecycle owner, Managed shutdown, Direct external termination, or safety behavior.
- [x] Final verification records the build, no-emit typecheck, deterministic test suite, real Web smoke result, and `git diff --check` evidence.
- [x] No missed user-facing string or baseline-specific loading issue remains in the available Web baseline; the toolbar fit adjustment is covered by the responsive smoke assertion.

## Answer

The real Stock DSH Web acceptance path passes on the available checkout `dsh-0.1.1-rc.2`. It loads the Bundle through the normal Web mechanism, verifies the `en`/`zh-CN` document projection, verifies English and Chinese labels/ARIA names including the Chinese confirmation dialog and localized `title`s, changes DSH language through Settings while Runtime Inspector remains open, preserves the active search and selected listener, restores pin state after reload, copies redacted details, and completes the existing confirmed external single-PID action with a fresh release scan.

Evidence: `npm run build`, `npm run typecheck`, and `npm test` pass; the explicit Web smoke passes 1/1 with `DSH_REPO=D:\project\deepseek-harness` and `DSH_WEB_E2E=1`; the deterministic suite reports 126 pass, 0 fail, 3 optional skips. The available checkout is `0.1.1-rc.2`; no separate `rc.8` or `rc.1` checkout was present for this run.
