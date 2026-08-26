# 02: Localize the complete Runtime Inspector presentation

**What to build:** Extend the established locale seam across the full Runtime Inspector experience so that Chinese and English users receive complete, natural, and semantically equivalent UI copy. This includes inventory browsing, details, source and handling explanations, confirmation, action results, accessibility text, dynamic counts, and locale-aware process dates, while preserving all diagnostic data and safety semantics.

**Blocked by:** 01: Establish the Browser locale seam and bilingual shell

**Status:** resolved

- [x] Every Runtime Inspector-owned visible string is available in Chinese and English, including toolbar controls, sorting, scope and source filters, action filters, list headings, group labels, loading/empty/error/incomplete/degraded states, and truncation notices.
- [x] Listener counts and dynamic messages use natural language in both locales, including appropriate English singular/plural wording and Chinese count wording.
- [x] Detail headings, fact labels, source descriptions, handling descriptions, owner labels, action pills, and fallback values are translated without changing the distinction between Process origin, source confidence, Lifecycle owner, and handling mode.
- [x] Confirmation dialog titles, explanations, identity labels, confirm/cancel controls, copy/open-directory/pin/unpin tooltips, status announcements, title attributes, and all ARIA labels are translated.
- [x] Process creation-time display follows the active presentation locale while the canonical FILETIME, PID, port, executable, Session/Call identifiers, paths, commands, and redacted values remain unchanged.
- [x] User-provided requests and technical data are rendered as data, never treated as translation keys or altered by localization.
- [x] Switching language preserves inventory, selected listener, search text, sorting, scope, source filter, actionable-only filter, expanded/collapsed state, pin preferences, pending action request, and focus return behavior.
- [x] Host fresh scans, Managed shutdown, Direct external termination, confirmation requirements, action results, Session privacy projection, and `port_list` output remain behaviorally unchanged.
- [x] Missing or future locale ids fall back to the English catalog without a user-facing compatibility warning or a crash.
- [x] Deterministic Client tests verify both locales, dynamic interpolation/counts, date formatting, accessibility copy, data preservation, fallback behavior, and unchanged Browser/Host RPC contracts.

## Answer

Implemented the complete local Runtime Inspector presentation catalog. All Client-owned copy, ARIA labels, `title` tooltips, counts, source/handling explanations, confirmation text, action-result statuses, and process creation-time formatting now follow the selected `zh`/`en` presentation locale. Technical and user-provided values remain untouched, and all action/RPC/Host semantics remain unchanged.

Evidence: deterministic Client locale, panel, Session-context, and boundary tests pass 26/26; the full repository suite passes 126/126 with 3 opt-in Stock DSH tests skipped without `DSH_REPO`; strict build and no-emit typecheck pass.
