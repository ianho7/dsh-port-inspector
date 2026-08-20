# 01: Bundle activation and compatibility gate

**What to build:** A normal DSH Bundle installation and restart activates Runtime Inspector on the supported Windows local DSH baseline, while incompatible environments stay safely observable-only.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Installing the Bundle and restarting the target Profile activates the inspector on the supported Stock DSH baseline.
- [x] An unknown DSH version, unsupported execution world, or failed observer contract enters read-only degraded mode with a visible reason.
- [x] Degraded mode exposes no process attribution or termination controls and never attempts automatic elevation.
- [x] Loading, unloading, updating, and restarting the Bundle do not terminate existing user processes.
- [x] Health and lifecycle checks are covered by automated tests without collecting secrets.

## Answer

Implemented the installable Bundle manifest, strict Stock DSH/Windows/provider/observer-contract gate, read-only degraded health, and lifecycle-safe disposal. The Bundle only publishes a health service and a pass-through Cordis observer registration; it does not replace the subprocess provider or own user processes.

Evidence:

- Strict TypeScript build and typecheck pass.
- Node test suite passes 10/10 with `DSH_REPO=D:\project\deepseek-harness`.
- The real Stock DSH smoke boots twice, simulates an installed package update between boots, disposes cleanly, and confirms an unrelated sentinel process remains alive.
- Standards and spec-axis reviews report no remaining blocker.
