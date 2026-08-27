# Runtime Inspector Typography and Modal Layout Specification

Status: ready-for-agent
Labels: ready-for-agent

## Problem Statement

The Runtime Inspector Browser Client is visually too small and typographically inconsistent. Its root text is 13px, while many labels, metadata values, pills, section headings, and explanatory copy are between 9px and 11.5px. This makes the interface feel less formal than the surrounding DSH Web application and reduces readability, especially for mixed Chinese and Latin text.

The existing centered dialog is already compact. It is 1040px wide when the viewport allows it, with a two-column body whose list and detail tracks have minimum widths of approximately 350px and 500px. At a 1000px viewport the dialog is only 952px wide, but the desktop toolbar and desktop two-column layout are still active. Increasing the typography without revisiting this geometry would make the toolbar, list-row metadata, source/action pills, detail heading, and handling actions compete for space.

The panel has good outer overflow containment: the options area and body suppress outer overflow, while the list and detail columns scroll independently. However, several internal flex rows are non-wrapping and contain `white-space: nowrap` pills or technical values. Larger type can therefore create local clipping or horizontal overflow even when the outer dialog remains inside the viewport. The header also has a fixed 54px height, which leaves little room for a larger title and a simultaneous status label.

The change must improve readability and perceived formality without altering Host inventory semantics, Process origin, Verified attribution, Inferred attribution, Lifecycle owner, Managed shutdown, Direct external termination, privacy projection, Browser RPC contracts, or DSH Web's ownership of locale and shell layout.

## Solution

Establish a coherent Browser-only typography scale for the Runtime Inspector and give the centered dialog enough horizontal and vertical budget to use it safely. The preferred desktop dialog is approximately 1120px wide and up to approximately 840px high, always capped by the viewport. The current centered overlay, independent list/detail scrolling, mobile stacking, and one-column narrow-screen facts remain intact.

Use a small set of semantic typography and spacing tokens rather than increasing individual declarations opportunistically. The root and normal control text should move toward a readable 14px base. Primary headings, technical port values, detail identity, labels, metadata, facts, pills, buttons, banners, and explanatory copy should each have deliberate roles with readable line-height. Technical identifiers should retain a clear monospace treatment where it improves scanning; user-facing Chinese and English prose should use a robust system CJK/Latin font stack and language-appropriate line-height.

Make the layout responsive before it becomes cramped. The desktop toolbar should be allowed to wrap at a slightly earlier width, approximately 1040px viewport width, and the two-column body should use a compact two-column configuration in that range. At approximately 720px the list and detail panes should stack, and at approximately 480px fact grids and handling actions should become single-column/full-width as they do today.

Make local overflow behavior explicit. List top rows and metadata rows should wrap or reflow rather than force source/action pills and addresses into one line. Long application names, paths, commands, Session values, and addresses should either ellipsize in compact contexts or wrap in detail contexts. Header and detail action groups should be able to wrap without covering content. Existing internal scrolling should remain the final containment boundary for long inventories and detail narratives.

## User Stories

1. As a DSH Web user, I want the Runtime Inspector to use a readable default text size, so that the panel feels like a first-class part of DSH Web rather than a dense diagnostic overlay.
2. As a DSH Web user, I want the typography to follow a consistent hierarchy, so that I can distinguish the panel title, primary port identity, labels, values, metadata, and explanatory copy at a glance.
3. As a Chinese-speaking user, I want Chinese copy to have enough size and line-height, so that dense labels and safety explanations remain comfortable to read.
4. As an English-speaking user, I want English copy to remain readable when it is longer than the Chinese equivalent, so that localization does not create a cramped or clipped interface.
5. As a user, I want Latin product names and technical identifiers to remain legible beside CJK text, so that names such as Runtime Inspector, DSH, PID, Session ID, and toolchain names do not look visually mismatched.
6. As a user, I want the main Runtime Inspector heading to have clear prominence, so that the purpose of the dialog is immediately apparent.
7. As a user, I want the current source or scan status beside the title to remain visible after the title is enlarged, so that incomplete or degraded states cannot be overlooked.
8. As a keyboard user, I want the larger header to preserve a reachable close control, so that improving visual hierarchy does not reduce operability.
9. As a user, I want listener ports in the list to be prominent enough to scan, so that I can identify a service without reading every secondary field.
10. As a user, I want technical port values and PIDs to retain stable numeric alignment, so that changing the font does not make a list of listeners harder to compare.
11. As a user, I want protocol markers to remain subordinate to the port value, so that the protocol is useful context without competing with the primary identity.
12. As a user, I want toolchain names and executable names to be readable in compact rows, so that I can recognize Node.js, Vite, Python, Docker, or an unidentified process without opening each detail pane.
13. As a user, I want long executable names and paths in compact rows to ellipsize gracefully, so that one unusual process cannot push other row content outside the list column.
14. As a user, I want row metadata such as PID, address, occurrence count, and handling state to remain readable, so that the compact list still communicates the evidence and available action.
15. As a user, I want a long IPv6 address or long localized action label to reflow rather than overflow horizontally, so that unusual but valid listener data remains usable.
16. As a user, I want source pills such as Verified attribution or Unconfirmed starter to remain distinguishable at a readable size, so that Process origin evidence is not hidden in tiny text.
17. As a user, I want handling pills such as Managed shutdown, Direct external termination, and read-only to remain visually distinct, so that authority and action semantics are not confused.
18. As a user, I want the selected row to remain easy to locate after its text grows, so that readability improvements do not weaken selection visibility.
19. As a user, I want the detail port identity to be substantially larger than list-row text, so that the selected listener is immediately recognizable as the subject of the right pane.
20. As a user, I want the detail heading's toolchain, port, executable, and PID to fit beside copy and directory actions, so that common actions remain available without clipping or overlap.
21. As a user, I want long detail identity text to wrap or ellipsize according to its role, so that action buttons never cover the selected listener's identity.
22. As a user, I want section headings such as Runtime information, Session context, Tool call, Source, and Handling to be readable but subordinate, so that the detail pane has a clear information hierarchy.
23. As a user, I want fact labels and fact values to have enough contrast in size, so that I can distinguish a field name from its diagnostic value quickly.
24. As a user, I want long project directories, launch commands, user requests, and Session identifiers to preserve their content without causing page-level overflow, so that evidence remains inspectable.
25. As a user, I want compact fact values to ellipsize only when the context is intentionally compact, so that important long values remain available through detail wrapping or an accessible title.
26. As a user, I want source descriptions and handling explanations to use readable paragraph line-height, so that safety claims and attribution limits can be understood without rereading.
27. As a user, I want the handling action to remain visually aligned with its explanation on a wide dialog, so that I can understand the action and its boundary as one unit.
28. As a user, I want the handling explanation and action button to stack when their combined width is insufficient, so that a long localized explanation never pushes the action out of the card.
29. As a user, I want banners for degraded attribution, incomplete scans, truncation, and action results to wrap naturally, so that warnings remain fully readable and do not disappear behind the body scroll region.
30. As a user, I want the search input and filters to remain usable after their text size increases, so that larger controls do not make sorting, scope, source, or actionable-only filtering inaccessible.
31. As a user, I want the search field to have enough width for its placeholder in both supported languages, so that the purpose of the search control is clear before I type.
32. As a user, I want the toolbar to wrap before controls become compressed, so that I can use every filter without relying on accidental horizontal overflow.
33. As a user, I want the wider dialog to preserve a calm centered composition, so that the panel feels spacious without becoming a full-screen replacement for DSH Web.
34. As a user on a common 1280px-wide viewport, I want the dialog to have enough room for a readable two-pane layout, so that the larger typography does not reduce the panel to a sequence of truncated labels.
35. As a user on a 1000px-wide viewport, I want the toolbar and body to enter a compact responsive mode before they become cramped, so that the transition is deliberate rather than a sudden overflow.
36. As a user on a 960px-wide viewport, I want the compact two-column layout and wrapped toolbar to remain usable, so that the breakpoint does not leave either pane with unusable minimum width.
37. As a user on a 720px-wide viewport, I want the list and detail panes to stack with independent readable regions, so that the panel remains usable without horizontal scrolling.
38. As a user on a 480px-wide viewport, I want fact cards and handling actions to become single-column/full-width, so that localized labels and larger text do not collide.
39. As a user on a short viewport, I want the dialog to stay inside the viewport while the list and details scroll internally, so that I can always reach the close control and the content does not extend beyond the screen.
40. As a user with a long listener inventory, I want row growth from wrapping text to be absorbed by the list scroll region, so that one long row does not resize or break the entire dialog.
41. As a user with a long detail narrative, I want the detail pane to scroll vertically without affecting the header or toolbar, so that the controls remain available during inspection.
42. As a keyboard user, I want larger controls to retain visible focus indicators and adequate hit area, so that the typography change improves readability without weakening keyboard navigation.
43. As a screen-reader user, I want visible labels, tooltips, and ARIA labels to remain semantically aligned after layout reflow, so that wrapping and stacking do not change control meaning.
44. As a user with reduced motion enabled, I want typography and layout changes to preserve the existing reduced-motion behavior, so that the redesign remains comfortable.
45. As a Chinese or English user, I want the same layout rules to work across both catalogs, so that the active DSH locale does not expose a separate class of clipping defects.
46. As a user, I want changing locale to preserve the selected listener, search, sorting, scope, filters, pin state, and pending action, so that visual reflow does not reset my investigation.
47. As a user, I want Process origin and handling labels to remain distinct after typography changes, so that larger or more prominent text cannot accidentally imply authority.
48. As a privacy-conscious user, I want the typography and layout work to leave Host payloads and `port_list` unchanged, so that a presentation improvement does not enlarge model-facing data.
49. As a DSH maintainer, I want the Browser Client to continue using the DSH-provided font token when available, so that the panel remains visually compatible with host themes.
50. As a DSH maintainer, I want the fallback font stack to cover Latin and CJK text without downloading fonts at runtime, so that the panel remains offline-capable and does not add network disclosure.
51. As a maintainer, I want the production style source and any design preview derivative to agree on the modal geometry, so that future visual review is not based on stale CSS.
52. As a maintainer, I want the existing Client panel test seam to cover typography and responsive behavior, so that one high-level test surface can catch regressions without adding Host-only tests.
53. As a maintainer, I want tests to prove the absence of horizontal overflow for representative long data, so that a passing screenshot at one viewport is not treated as sufficient evidence.
54. As a release maintainer, I want the real Stock DSH Web smoke to exercise the updated panel at wide and compact viewports where available, so that the shipped Bundle is validated against the actual host composition.

## Implementation Decisions

- Scope the change to Browser Client presentation. Do not modify Host inventory collection, Process origin, Verified attribution, Inferred attribution, Unattributed handling, Lifecycle owner, Managed shutdown, Direct external termination, `port_list`, Browser RPC payloads, or Host action safety.
- Keep the current centered modal overlay and native DSH dialog semantics. Do not convert the surface into a side drawer, full-screen route, or new navigation model.
- Keep the existing host font custom property as the first choice. Extend the fallback family with a sensible system CJK/Latin sequence that supports Windows and other DSH Web environments; do not add a runtime font download or third-party font dependency.
- Introduce semantic typography tokens for base text, controls, titles, technical values, labels, metadata, pills, banners, and prose. Avoid scattering one-off size changes across selectors.
- Use approximately 14px for normal panel text and controls, with a line-height around 1.5–1.6. Use approximately 20–22px for the panel title, 15–16px for list ports, and 28–32px for the selected detail port. Keep compact metadata, section labels, and pills above unreadably small caption sizes; approximately 10–12px is acceptable only for genuinely secondary content with adequate contrast and line-height.
- Give Chinese and mixed-language prose more vertical breathing room, approximately 1.65–1.8 where it is rendered as a paragraph or warning. Keep technical data compact only when it is single-line and safely ellipsized.
- Use monospace for ports, PIDs, addresses, Session/Call identifiers, and other technical values when it improves alignment. Do not apply monospace to all UI copy or to Chinese explanatory text.
- Preserve the distinction between product-owned labels and diagnostic data. Translate surrounding labels through the existing Browser locale catalog, but do not alter executable names, toolchain names, paths, commands, identifiers, ports, PIDs, or user-provided requests.
- Set the preferred desktop panel width to approximately 1120px, capped by the existing viewport-derived maximum. This is a measured increase from the current 1040px rather than an unrestricted expansion.
- Set the preferred desktop panel height to approximately 840px, capped by the viewport. Treat this as a visible-content improvement; independent list/detail scrolling remains the overflow safety mechanism.
- Preserve viewport side margins and the existing smaller-screen width overrides. The panel must never exceed the viewport or require page-level horizontal scrolling.
- Keep the wide body as a two-column grid with the list receiving approximately 42% and the detail pane approximately 58%. The increased outer width should yield roughly 420–440px of usable list content and roughly 590–610px of usable detail content on a 1280px viewport.
- Move the compact-toolbar/two-column responsive threshold earlier, approximately to a 1040px viewport width. At and below this threshold, allow the toolbar to wrap with the search control on its own row and use the compact two-column minimums; do not force all controls into one line.
- Preserve the stacked body transition at approximately 720px and the one-column fact/handling transition at approximately 480px. The larger desktop height must not override these mobile viewport-safe height rules.
- Change the header from a hard fixed-height assumption to an auto-sized or minimum-height treatment that can accommodate a 20–22px title, status labels, and the close control. Allow the title/status cluster to wrap while keeping the action cluster reachable.
- Allow the listener row top line to reflow when the port/protocol identity and source pill cannot fit together. The source pill must remain readable or move to a second line; it must not overflow its flex item.
- Allow listener row metadata to wrap. PID, address, occurrence count, and handling action must remain visible or use bounded ellipsis; a long IPv6 address or localized action label must not create page-level horizontal overflow.
- Keep executable and project-like values ellipsized in compact list contexts, with accessible title text preserved. Use wrapping and `overflow-wrap` for detail fields that are explicitly marked multiline.
- Allow the detail heading and detail action buttons to wrap or reflow. The identity copy must have a shrinkable width, and action buttons must never cover the logo, port, executable, or PID.
- Allow the handling card to stack its explanation and action when their combined width is insufficient. Preserve full-width action behavior on the narrowest breakpoint.
- Keep fact grids two-column when there is enough width and switch to one-column on narrow screens. Default fact values may ellipsize in compact cells; wide user requests, commands, directories, and other intentionally multiline values must wrap at safe boundaries.
- Keep the options area and body contained, and keep list/detail columns as independent vertical scroll regions. Do not add a global page scroll or allow content to push the modal beyond its viewport cap.
- Preserve existing focus-visible, `aria-*`, keyboard, reduced-motion, and dialog semantics. Layout reflow must not remove the close target, selection semantics, confirmation focus behavior, or accessible names.
- Continue treating DSH's locale service as authoritative. Styling may use the resolved Browser locale at the component boundary if needed for language-specific line-height, but the implementation must not take ownership of the document language projection or create a new locale setting.
- Keep the implementation Browser-only and serializable-safe. Do not import Windows scanner, process identity, Koffi, Job/Terminal, termination, or other Host-only primitives for a visual change.
- Keep one production style source of truth. If the design preview or generated production stylesheet is updated, regenerate or reconcile it from the current source rather than editing a stale derivative independently.
- Update the existing Client panel style/layout contract tests to reflect the new approved dimensions and typography. The tests should verify behaviorally meaningful thresholds and responsive states rather than preserving obsolete pixel values solely because they were previously asserted.

## Testing Decisions

- Use one primary seam: the existing Browser Client panel presentation boundary. It should render representative inventory rows and detail data, install the production styles, and expose the observable layout/scroll/accessibility behavior that a DSH Web user experiences.
- Tests should focus on external behavior and avoid asserting private helper names, CSS declaration order, the exact number of token variables, or internal implementation mechanics that do not affect the rendered panel.
- Add a wide-viewport case around 1280px that proves the dialog remains centered, uses the wider preferred width when available, keeps the list/detail panes side by side, and has no horizontal overflow.
- Add a compact desktop case around 1000px that proves the toolbar wraps before controls are compressed and the body uses the compact two-column rules. This case is important because the current 961–1000px band remains in desktop mode.
- Add a breakpoint case around 960px that proves the wrapped toolbar and compact two-column layout remain usable, with both columns retaining meaningful minimum width.
- Add a stacked case around 720px that proves the list and detail panes stack, both remain reachable, and the dialog height remains viewport-safe.
- Add a narrow case around 480px that proves fact grids become one-column, handling actions become full-width, and no horizontal scrollbar is introduced.
- Add long-content fixtures in both Chinese and English. Include a long source description, a long handling explanation, a long project directory, a long launch command, a long Session/Call value, a long localized action label, and an IPv6 address.
- For long-content fixtures, assert that the outer modal and body do not exceed their containing width, that list/detail scroll regions absorb vertical growth, and that intentionally multiline values remain readable. Where a browser-backed harness is available, assert the relevant `scrollWidth`/`clientWidth` relationship rather than relying only on a screenshot.
- Verify that compact list rows preserve the port, source state, handling state, PID, and address as observable content after wrapping or ellipsis. A long value may be truncated visually only when its accessible title or detail view still provides the full value.
- Verify that the detail heading keeps copy and directory actions reachable at wide and compact widths, and that the handling card reflows before the action button is clipped.
- Verify the dialog header at normal, incomplete-scan, and degraded-source states. The title, status label, close control, and accessible name must remain present after the title size increases.
- Verify translated Chinese and English labels, placeholders, banners, facts, confirmation text, and ARIA labels at the same viewport matrix. The supported locales must not require separate ad hoc width exceptions.
- Verify that locale changes preserve selected listener, search text, sorting, scope, filters, pin state, pending action state, and focus behavior while the panel reflows.
- Verify that Process origin, Verified attribution, Inferred attribution, Lifecycle owner, Managed shutdown, Direct external termination, and read-only semantics are unchanged by the visual update.
- Retain existing modal-centering, nested-scroll, confirmation-dialog, localization, Browser/Host boundary, and reduced-motion coverage. Update expectations that intentionally lock the old 1040px, 800px, 960px, 54px, or tiny-font values.
- Use the existing Client panel tests as prior art for stable user-facing locators and layout contracts. Prefer rendered behavior or computed style at the presentation boundary over source-literal assertions where the harness supports it.
- Use the opt-in real Stock DSH Web smoke as the highest acceptance seam when the certified checkout is available. It should open the live Bundle panel, verify the wide and compact presentation, exercise both locales if the locale flow is available, and confirm that existing inventory and action paths remain unchanged.
- No native Windows lifecycle gate is required solely for this Browser presentation change. If the implementation changes Host projection, RPC contracts, or action behavior despite this spec, the normal Host/lifecycle acceptance gates become mandatory.
- Authoritative verification remains the production build, no-emit typecheck, deterministic test suite, applicable Stock DSH Web smoke, and `git diff --check`.

## Out of Scope

- Changing Host inventory, Windows process scanning, process identity, attribution logic, lifecycle ownership, action authorization, termination safety, or fresh-scan behavior.
- Changing `port_list`, its JSON Schema, its Session privacy projection, or any Browser RPC request/response shape.
- Converting the centered dialog into a drawer, route, full-screen workspace, or new navigation surface.
- Adding a user-facing font-size preference, browser zoom management, accessibility settings panel, or independent Runtime Inspector density mode.
- Adding remote fonts, online typography assets, third-party font loading, or runtime network requests.
- Replacing DSH's locale service, document language projection, locale persistence, or language selector.
- Adding support for new locales as part of the typography work. Existing `zh` and `en` presentation behavior remains the compatibility baseline.
- Redesigning the color palette, logos, grouping model, selection semantics, source/handling taxonomy, navigation, Sidebar placement, or action policy.
- Removing all small text. Section labels, technical captions, compact pills, and metadata may remain smaller when their role is clear, contrast is sufficient, and the content has safe overflow behavior.
- Treating a wider dialog or larger type as evidence of Process origin, Verified attribution, Lifecycle owner, or action authority.
- Introducing a separate Browser server, new rendering framework, or Host-side presentation module.

## Further Notes

- The current production panel uses a 1040px preferred width, an 800px preferred height, a 54px fixed header, and a 960px responsive threshold. The most important geometry defect is the narrow 961–1000px band where the desktop toolbar and two-column rules remain active with little room for typography growth.
- The recommended 1120px width gives approximately 80px more horizontal budget. On a 1280px viewport it leaves approximately 80px margins on each side while increasing the body budget from roughly 992px to roughly 1072px before internal padding.
- The recommended 840px height is intentionally modest. The existing nested scrolling already prevents the list and detail content from escaping the dialog, so height is primarily about preserving useful visible content after row line-height and wrapping increase.
- The existing design provenance already points toward a larger hierarchy: approximately 22px for the panel title, 32px for the selected detail port, 12px for ordinary facts, and 11px for secondary copy. The production implementation should align with that hierarchy while keeping the accepted centered-modal shell.
- The list-row top line and metadata line are higher-risk than the fact grid. Fact values already have ellipsis or multiline wrapping behavior, while the list flex rows contain non-wrapping pills and technical strings that can overflow when their font size increases.
- The confirmation dialog is a secondary concern. Its current width can remain if only the main panel typography changes; consider a modest increase only if confirmation copy and action labels are also raised enough to make the inner two-column identity grid feel cramped.
- Existing design-preview and generated production styles have drifted in a few control dimensions. The implementation should make the production Browser style source authoritative and reconcile previews after the change.
- This specification is a presentation-only follow-up to the existing Runtime Inspector typography review. It is ready for an implementation agent because the geometry targets, responsive behavior, overflow safeguards, boundary constraints, and validation seam are defined.
