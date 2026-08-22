# 09: Web Client dual-face Bundle and Runtime Inspector panel

**What to build:** Add the Browser half of Runtime Inspector to the same repository and DSH Bundle as the existing Windows Host runtime. The Web UI must expose a global sidebar entry, open a Runtime Inspector overlay panel, consume only the serializable Host RPC boundary, and preserve all existing attribution, privacy, lifecycle-owner, and process-action safety rules.

**Blocked by:** 07: Listener inventory and safe UI actions; 08: MVP integration and lifecycle release gate

**Status:** claimed

- [x] Add a TypeScript Browser entry and a DSH-compatible client build that emits the Browser artifact without importing Node-only scanner, Koffi, process identity, lifecycle, or termination code.
- [x] Extend the single package manifest with the `dsh.client` Web declaration, the `exports["./client"]` artifact, and the distributable file list while preserving the existing Bundle composition patch.
- [x] Expose the existing serializable Runtime Inspector Host RPC through the certified DSH Host-to-Client bridge; use a same-origin WebServer route only when the target version lacks a typed Remote seam; do not start an independent Web server.
- [x] Register an additive global `sidebar.footer.action` entry with a bounded listener/conflict indicator and an accessible name.
- [x] Register an additive `shell.overlay` panel that does not replace the Sidebar, Conversation, composer, or application root.
- [x] Render inventory, search, sorting, Session visibility, confidence, lifecycle owner, redacted details, and safe action state from Host responses only.
- [x] Render readable loading, empty, incomplete-scan, observing, read-only, degraded, confirmation, failure, and post-action fresh-scan states.
- [x] Keep managed Job/Terminal shutdown distinct from external single-PID termination; route both through Host confirmation and fresh-scan checks; expose no direct process primitive to Browser code.
- [ ] Ensure unknown DSH versions, missing Client artifacts, unavailable Slots, unavailable Host bridge, incomplete identity, and degraded mode remain visibly read-only.
- [x] Use semantic controls with accessible names and stable user-facing locators for entry, refresh, row selection, confirmation, copy, directory opening, and action-result controls.
- [x] Add manifest and client-artifact tests, Slot registration tests, Host-to-Browser privacy/serialization tests, panel state tests, and unload/disposal tests.
- [ ] Add a real Stock DSH Web smoke on every declared version: restart the Profile, verify Client artifact loading, verify the Sidebar entry and overlay panel, fetch a real inventory, perform one permitted action, verify the fresh scan result, and prove unaffected listeners remain alive.

## Expected seam

The single business seam is the serializable Runtime Inspector Host RPC. Browser code must not read the scanner, origin registry, Job/Terminal service, process handle, or Windows process primitive directly.

## Safety boundary

The Web panel is a trusted human-facing surface, but it does not weaken the existing Host policy. Managed shutdown continues through DSH owner APIs; external termination continues through the identity-fenced single-PID path; inferred, stale, incomplete, protected, other-user, and degraded targets remain unavailable.

## Acceptance evidence

The implementation is complete only when the deterministic Browser/Host tests and the real Stock DSH Web smoke pass on each declared compatibility version. A direct call to `projectPortList()`, `runtimeInspector.host`, or another Host helper cannot substitute for the Browser loading, Slot registration, bridge, and action path.

## Comments

- 2026-08-22: Implemented the same-repository Host/Browser Bundle, lazy-CJS client artifact, additive Slots, same-origin Host RPC route, accessible panel states, and deterministic Browser/Host tests. TypeScript emit/no-emit checks and the existing Stock DSH Bundle load/dispose smoke pass. Ticket remains claimed until the real Stock DSH Web smoke covers both declared versions, client loading, Slot rendering, inventory, and one permitted action.
