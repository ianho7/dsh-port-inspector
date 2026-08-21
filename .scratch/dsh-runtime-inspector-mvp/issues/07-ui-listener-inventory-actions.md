# 07: Listener inventory and safe UI actions

**What to build:** The Runtime Inspector UI makes listener ownership understandable and exposes only the shutdown actions allowed by each record's confidence and lifecycle state.

**Blocked by:** 04: Managed Job and Terminal lifecycle attribution; 05: External single-PID termination safety; 06: Read-only port_list and privacy/session scope

**Status:** resolved

- [x] The inventory shows port, address, PID, executable, project, confidence, Session visibility, and lifecycle owner.
- [x] Users can search and sort by port, application, PID, project, and Session, and can copy redacted details or open an available project directory.
- [x] Managed shutdown, external single-PID termination, read-only, and degraded states have distinct labels, confirmations, and failure messages.
- [x] After an action, the UI performs a fresh scan and reports the observed port-release state instead of assuming success.
- [x] UI and Host RPC tests verify privacy boundaries and that unavailable actions cannot be invoked.

## Answer

Implemented `src/host-ui.ts` as the trusted Host/UI boundary and exposed it as `runtimeInspector.host`. The inventory is serializable, redacted, searchable, and sortable by the required fields. Copy returns bounded redacted details; directory opening requires an injected host callback and never opens a redacted path.

Managed rows expose only confirmed Job/Terminal owner shutdown. External rows expose only confirmed single-PID termination through the existing identity-fenced host action. Read-only and degraded rows have distinct unavailable states, and action requests are revalidated against a fresh scan before dispatch. Every action is followed by another scan and returns an observed `portReleased` value only when the scan is complete. The RPC surface contains inventory/copy/open/action methods only; scanner, origins, and process actions are not exposed.

Evidence: bundled TypeScript emit and no-emit checks pass; `bun test tests/host-ui.test.mjs` passes 6/6; full Bun suite passes 56/56 with the existing Stock DSH smoke skipped when `DSH_REPO` is unset; `git diff --check` passes. The npm scripts remain environment-blocked by the unavailable `tsc`/Volta shim, and the real Stock DSH lifecycle evidence remains an integration gap.
