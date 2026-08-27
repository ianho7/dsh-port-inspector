# 05: Cross-locale responsive acceptance and preview reconciliation

**What to build:** Integrate the updated typography, toolbar, list, and detail surfaces and prove that the complete Runtime Inspector remains readable and contained across supported locales and representative viewport sizes. Reconcile any design-preview derivative with the production Browser style source so future review reflects the shipped geometry.

**Blocked by:** 02: Readable toolbar and feedback states; 03: Readable listener list and row overflow handling; 04: Readable detail pane and confirmation dialog

**Status:** ready-for-agent

- [ ] At approximately 1280px, the centered dialog uses the preferred wider size, preserves a readable two-pane composition, and has no horizontal overflow.
- [ ] At approximately 1000px and 960px, the toolbar wraps before compression, the compact two-column body remains usable, and both panes retain meaningful minimum width.
- [ ] At approximately 720px, the list and detail panes stack with reachable independent scroll regions; at approximately 480px, fact grids and handling actions use the narrow-screen single-column behavior.
- [ ] Chinese and English render the same responsive structure without locale-specific clipping, overlapping controls, or unreadable warning/confirmation copy.
- [ ] Long-content fixtures prove that outer panel width remains bounded, vertical growth is absorbed by the appropriate scroll region, and technical values are either fully inspectable or safely ellipsized with accessible recovery.
- [ ] Locale changes preserve selected listener, search, sorting, scope, source filter, actionable-only filter, pin state, pending action state, and focus behavior while the panel reflows.
- [ ] Existing modal centering, keyboard navigation, ARIA names, reduced-motion behavior, Process origin, attribution, Lifecycle owner, action safety, Host RPC, and `port_list` behavior remain unchanged.
- [ ] The production style source and design-preview derivative agree on the approved modal width, height, breakpoints, and typography hierarchy.
- [ ] The deterministic Client suite, production build, no-emit typecheck, and `git diff --check` pass; the opt-in Stock DSH Web smoke is run when its certified checkout is available.
