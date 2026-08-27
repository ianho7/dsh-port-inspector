# 03: Readable listener list and row overflow handling

**What to build:** Upgrade the listener list so ports, protocols, toolchain identity, executable text, PID, address, occurrence count, Process origin state, and handling state remain scannable at the larger typography scale. Long or unusual listener data should reflow inside the row or use bounded ellipsis rather than producing horizontal overflow.

**Blocked by:** 01: Typography system and responsive modal shell

**Status:** ready-for-agent

- [ ] List port values become a clear primary signal, protocol markers remain subordinate, and technical numbers retain stable alignment.
- [ ] Toolchain names, executable names, and compact row metadata use readable sizes while preserving the existing development grouping, pinning, selection, and source/handling semantics.
- [ ] The row top line can reflow when the port/protocol identity and source pill do not fit together; the source pill remains readable and cannot overflow its flex item.
- [ ] The row metadata can reflow when PID, address, occurrence count, and handling action do not fit together; long IPv6 addresses and localized labels do not create page-level horizontal scrolling.
- [ ] Compact executable and path values use bounded ellipsis with an accessible title or an inspectable full value in the detail pane; the selected row remains visually and semantically identifiable.
- [ ] Long Chinese and English source/handling labels remain distinct, so Process origin is not confused with action authority.
- [ ] The list scroll region absorbs row growth without resizing the outer dialog or moving the fixed header and toolbar out of reach.
- [ ] Client presentation tests cover representative IPv4, IPv6, long executable, long localized label, repeated-listener, selected, pinned, and unavailable-action rows.
