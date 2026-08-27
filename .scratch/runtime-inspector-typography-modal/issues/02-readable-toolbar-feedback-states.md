# 02: Readable toolbar and feedback states

**What to build:** Make the Runtime Inspector toolbar and all transient or empty states readable in both supported locales. Search, sorting, scope, source, actionable-only filtering, refresh, loading, incomplete, degraded, truncation, failure, and action-result surfaces should remain usable as the typography grows and should reflow before becoming compressed.

**Blocked by:** 01: Typography system and responsive modal shell

**Status:** ready-for-agent

- [ ] Search, sort, sort direction, refresh, scope, source, and actionable-only controls use the approved readable typography scale while preserving their existing semantics and hit targets.
- [ ] Chinese and English placeholders, labels, option text, tooltips, and ARIA names remain understandable without clipping or accidental horizontal scrolling.
- [ ] The wide toolbar has enough search width for normal use, while the compact toolbar wraps before controls are squeezed; the search control receives a dedicated row when required.
- [ ] Loading, empty, error, incomplete-scan, degraded-attribution, truncation, and action-result messages wrap naturally and remain visible above the scrollable body.
- [ ] Long English and Chinese banners do not push the dialog outside its viewport or hide the list/detail body; the body continues to absorb remaining height through its existing scroll regions.
- [ ] Focus-visible, disabled, selected, status, and reduced-motion behavior remains observable after the controls reflow.
- [ ] The Client presentation tests cover toolbar and feedback states at wide, compact, Chinese, and English configurations.
