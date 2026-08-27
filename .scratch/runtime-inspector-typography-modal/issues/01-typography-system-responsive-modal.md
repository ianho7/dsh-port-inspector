# 01: Typography system and responsive modal shell

**What to build:** Establish the readable Browser Client typography scale and give the centered Runtime Inspector dialog enough space to use it safely. The user should see a coherent CJK/Latin font treatment, readable base text, a more prominent hierarchy, a preferred desktop size of approximately 1120px by 840px capped by the viewport, and a responsive shell that preserves the current DSH Web modal semantics.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The Browser Client uses the DSH-provided font token when available and a local system CJK/Latin fallback without runtime font downloads.
- [ ] Normal panel text and controls use an approximately 14px base with readable line-height; the title, list ports, detail port, labels, metadata, pills, and prose use deliberate semantic sizes rather than scattered one-off increases.
- [ ] The preferred centered dialog width is approximately 1120px and its preferred height is approximately 840px, with existing viewport caps and side margins preserved.
- [ ] The dialog remains centered, never creates page-level horizontal scrolling, and keeps the list and detail columns as independent vertical scroll regions.
- [ ] The header accommodates a larger title, status label, and close control through an auto-sized or minimum-height layout; status and title content may wrap without covering the close target.
- [ ] Around 1040px viewport width, the toolbar can wrap and the body uses compact two-column minimums; around 720px the body stacks; around 480px narrow-screen overrides remain viewport-safe.
- [ ] The existing dialog, keyboard focus, ARIA, reduced-motion, Host/Browser boundary, and Host RPC behavior remain unchanged.
- [ ] The existing Client presentation tests cover the new shell dimensions, responsive states, and absence of page-level overflow.
