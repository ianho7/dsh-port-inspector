# Runtime Inspector Client Internationalization Specification

Status: implemented

## Problem Statement

Runtime Inspector's Browser Client is currently Chinese-only even when the surrounding DSH Web application is switched to English. User-facing labels, buttons, status messages, empty states, confirmation text, ARIA labels, tooltips, and dynamic count text are embedded directly in the panel implementation. The process creation-time presentation also formats dates with a fixed `zh-CN` locale.

This creates a mixed-language DSH Web experience, makes accessibility text inconsistent with the rest of the application, and causes the Runtime Inspector to ignore the user's selected DSH language. The Browser Client currently has no local i18n abstraction and must not solve the problem by moving language state or process authority into the Host half.

## Solution

Make the Runtime Inspector Browser Client follow DSH's existing Browser locale service. The Client reads the active locale from the injected `ctx.locale` service, whose active id is `zh` or `en`, and subscribes to its changes so the panel updates when the user changes the DSH language.

Keep the translation catalog local to the Runtime Inspector Client. Use typed message keys and small message functions for interpolation and Chinese/English plural forms. The DSH product name `Runtime Inspector`, process names, toolchain names, user requests, commands, paths, and other data values remain data; only product-owned UI copy is translated.

For compatibility with isolated Client tests or a DSH composition where the locale service is temporarily absent, fall back to the runtime-maintained `document.documentElement.lang` projection. Map `zh-*` to `zh`, `en-*` to `en`, and unknown or missing values to English. Do not use HTML meta tags, undocumented `data-*` attributes, `navigator.language`, visible settings labels, local storage, or a new Host/RPC setting as the primary source.

The change is Browser presentation-only. Host inventory, Process origin, Verified attribution, Inferred attribution, Lifecycle owner, Managed shutdown, Direct external termination, `port_list`, RPC payloads, and action safety rules remain unchanged.

## User Stories

1. As a DSH Web user, I want Runtime Inspector to use the same language as DSH Web, so that the application feels like one coherent product.
2. As a Chinese-speaking user, I want the Runtime Inspector panel to render in Chinese when DSH is set to Chinese, so that all controls and explanations are immediately understandable.
3. As an English-speaking user, I want the Runtime Inspector panel to render in English when DSH is set to English, so that Chinese-only text does not remain in the interface.
4. As a user, I want the initial Runtime Inspector render to use the active DSH locale rather than the browser's system locale, so that an explicit DSH language choice wins.
5. As a user, I want changing DSH's language setting to update an open Runtime Inspector panel, so that I do not need to restart DSH or reopen the panel to see the new language.
6. As a user, I want the Sidebar entry, panel header, and close control to use the selected language, so that the entry and the surface agree.
7. As a user, I want search placeholders and search accessibility labels translated, so that I can understand how to search in either language.
8. As a user, I want sorting labels, sorting direction, scope labels, source filters, and action filters translated, so that every toolbar control is usable in either language.
9. As a user, I want development grouping headings and collapsed-list controls translated, so that hidden and visible listeners remain understandable in either language.
10. As a user, I want listener counts to use natural Chinese or English wording, so that singular, plural, and zero-count states do not look mechanically translated.
11. As a user, I want loading, empty, incomplete-scan, degraded-source, truncation, and failure states translated, so that safety and availability information is clear in either language.
12. As a user, I want Runtime Inspector to keep the distinction between Process origin and handling mode in both languages, so that “由 DSH 启动” is not confused with “可由 DSH 停止”.
13. As a user, I want Verified attribution, Inferred attribution, Unattributed, and degraded source descriptions translated without changing their meaning, so that the evidence boundary remains honest.
14. As a user, I want Managed shutdown, Direct external termination, read-only, and degraded action labels translated, so that I understand what an action will actually do.
15. As a user, I want confirmation dialog titles, explanations, identity checks, and cancel/confirm buttons translated, so that I can make a safe decision before an action runs.
16. As a user, I want copy, open-directory, pin, unpin, select, and close tooltips translated, so that icon-only controls remain understandable.
17. As a screen-reader user, I want ARIA labels, roles, and status announcements translated with the visible controls, so that changing DSH language also changes the accessible experience.
18. As a screen-reader user, I want toolchain names and process names to remain data rather than translated message keys, so that technical identities are not silently altered.
19. As a user, I want process creation times to use a locale-appropriate presentation, so that English sessions do not receive a fixed Chinese date format.
20. As a user, I want canonical process identity data such as PID, FILETIME-derived identity, port, and executable values to remain unchanged by localization, so that diagnostics remain copyable and reliable.
21. As a user, I want user-provided requests, commands, paths, Session IDs, Call IDs, and tool names to remain intact while surrounding labels are translated, so that localization does not corrupt evidence or privacy redaction.
22. As a user, I want a missing or temporarily unavailable DSH locale service to fall back safely, so that Runtime Inspector remains usable in isolated Client loading and test environments.
23. As a user, I want a `zh-*` document language projection to select Chinese and an `en-*` projection to select English, so that the compatibility fallback handles regional BCP 47 tags predictably.
24. As a user, I want an unknown document language to fall back to English without a new compatibility warning, so that an unsupported future locale does not block the panel.
25. As a user, I want an active `ctx.locale` value to override a conflicting HTML `lang` value, so that the authoritative DSH state is not replaced by a stale DOM projection.
26. As a DSH user, I want switching languages to preserve the selected listener, search text, sorting, scope, filters, and pin state, so that localization does not reset my investigation.
27. As a DSH user, I want changing language while a confirmation dialog is open to keep the action request and identity details unchanged, so that localization cannot change what will be acted upon.
28. As a DSH user, I want localization to leave Host fresh scans and action results unchanged, so that translating the UI cannot weaken or bypass action safety.
29. As a DSH user, I want `port_list` output and its Session privacy projection to remain unchanged, so that a human-facing language feature does not expand model-facing data.
30. As a privacy-conscious user, I want locale changes to require no new network requests, so that translating Runtime Inspector does not disclose process or Session information.
31. As a package maintainer, I want the translation catalog bundled with the existing Client artifact, so that Runtime Inspector remains self-contained and offline-capable.
32. As a package maintainer, I want the Client to tolerate the absence of optional locale context without importing Host-only modules, so that the Browser/Host boundary remains intact.
33. As a package maintainer, I want DSH's locale plugin to remain the owner of language selection and persistence, so that Runtime Inspector does not create a competing setting.
34. As a package maintainer, I want the implementation to avoid direct calls to `SlotRegistry.installLocale()`, so that Runtime Inspector consumes the public locale state instead of taking ownership of renderer setup.
35. As a maintainer, I want future DSH locale ids to degrade to the supported English catalog without crashing, so that adding a new DSH language does not break the existing Client.
36. As a maintainer, I want the translation keys to be stable and descriptive, so that future copy edits do not require changing Host DTOs or Browser RPC contracts.
37. As a maintainer, I want deterministic tests for both supported languages and fallback paths, so that a green test suite proves the observable bilingual behavior rather than only checking source literals.
38. As a release maintainer, I want a real Stock DSH Web smoke to verify both language states and a live language switch, so that the shipped Bundle is tested against the actual DSH locale service.

## Implementation Decisions

- Add a narrow Browser-only locale capability to the Client context. It exposes the current active locale snapshot and a change subscription; its supported presentation ids are `zh` and `en`.
- Treat the public DSH locale service discovered through `ctx.get('locale')` (or an already-present structural `ctx.locale`) as authoritative, using `getSnapshot().active` or the equivalent `getLocale().active` value. The Client must not duplicate or persist this state, and the locale capability must remain optional so the DOM fallback can run when the service is absent.
- Subscribe to the DSH locale service at the React presentation boundary so the Sidebar entry, panel, dialog, status text, and all derived labels re-render after `locale/change`.
- Use a dedicated local i18n module containing a typed `zh`/`en` message catalog and a translator that supports bounded interpolation. Message keys are product-owned and are not sent to Host.
- Translate every Runtime Inspector-owned string, including visible labels, button text, placeholder text, title attributes, `aria-label` values, status text, error-state text, confirmation copy, empty-state copy, group counts, and action-result copy. Keep `Runtime Inspector` as the product name unless a later product decision introduces a localized name.
- Keep technical data values untouched. Do not translate executable names, toolchain identifiers, project paths, commands, Session IDs, Call IDs, Agent IDs, user requests, ports, PIDs, or lifecycle owner ids.
- Keep the em dash (`—`) used for missing diagnostic values unchanged in both catalogs; it is a language-neutral data placeholder, not user-facing prose.
- Format process creation dates using the selected presentation locale, mapping `zh` to a Chinese date locale and `en` to an English date locale. Preserve the canonical FILETIME and identity strings in Host and internal data structures.
- If the locale capability is absent, read `document.documentElement.lang` only at the Browser presentation boundary. Map a case-insensitive `zh` prefix to `zh`, an `en` prefix to `en`, and all other values to `en`.
- Give the DSH locale service precedence over the DOM fallback, including when the two values temporarily disagree during startup. Do not treat the initial static `lang="en"` markup as stronger than an already available `ctx.locale` snapshot.
- Do not read `navigator.language`, `navigator.languages`, HTML language meta tags, undocumented root `data-*` attributes, visible language-selector text, local storage, or session storage as the Runtime Inspector's current-locale source.
- Do not add a language field to Host inventory rows, Host action results, `port_list`, Browser RPC requests, or Browser RPC responses. Localization is a Browser presentation concern.
- Do not add or modify DSH Host settings, introduce a locale-specific RPC, change DSH locale persistence, or call `SlotRegistry.installLocale()` from Runtime Inspector.
- Do not add a second i18n service or a runtime dependency on a third-party translation framework. The existing DSH locale service supplies state; the Bundle-local catalog supplies Runtime Inspector copy.
- Keep the fallback silent and capability-based. Missing or unknown locale context selects the English catalog without adding a user-facing DSH-version or compatibility warning.
- Preserve all current stateful panel behavior across locale changes, including inventory data, loading state, selected listener, search, sorting, scope, source filter, actionable-only filter, other-listener expansion, pin preferences, pending action request, and focus return behavior.
- Localize stable Client-owned result codes and statuses through the catalog. Do not change Host result-code names or action semantics merely to support translation; an unknown opaque Host error may remain the existing diagnostic fallback.
- Keep Browser code free of Windows scanner, process identity, Koffi, Job/Terminal, termination, and other Host-only imports. The locale capability and catalog must remain serializable-safe at the Client boundary even though the locale subscription itself is local Browser state.
- Keep the current additive Slot registration and DSH Web layout ownership. Localization must not replace the Sidebar, Conversation, composer, application root, or shell overlay contract.
- Preserve existing source, handling, privacy, lifecycle, and action terminology from the domain glossary in both language catalogs. In particular, visual prominence, development relevance, and localized text must not be used as evidence of Process origin or authority.

## Testing Decisions

- Tests must assert observable Client behavior and public locale semantics, not private helper names, exact catalog object layout, string-literal counts, or the implementation mechanism used to subscribe.
- Add deterministic locale-resolution coverage for an active `ctx.locale` value, a conflicting DOM `lang`, a missing locale capability, `zh-CN`, `en-US`, missing `lang`, unknown `lang`, and an unsupported future active id.
- Add deterministic subscription coverage showing that an open presentation updates from Chinese to English and back without losing selected listener, filters, search, pin state, pending action state, or focus semantics.
- Add catalog behavior coverage for static labels, interpolated port/PID/count values, singular/plural English listener counts, Chinese count wording, known error statuses, confirmation copy, and translated accessibility labels.
- Add date-presentation coverage that proves the active locale reaches process creation-time formatting while the underlying canonical identity value remains unchanged.
- Add boundary coverage showing that user requests, commands, paths, executable names, toolchain names, Session/Call IDs, ports, PIDs, and redacted values are preserved exactly while adjacent labels change language.
- Add fallback coverage showing that no locale service does not crash the Client and that DOM fallback does not require `navigator`, storage, Host RPC, or a new network request.
- Retain and update existing Client panel and Session-context tests as behavioral tests. Replace assertions that require Chinese-only source literals with assertions over rendered or resolved user-facing behavior in both supported locales.
- Retain the existing Slot, Browser bridge, manifest, and Browser/Host boundary tests. They should prove that adding locale state does not add Host process primitives, alter RPC payloads, or change the existing `dsh.client` artifact contract.
- Add a real Stock DSH Web smoke on the certified Web baseline(s) available to the repository. It must load the actual locale plugin, verify the panel in English and Chinese, change the DSH language through the real settings flow or equivalent supported profile preference, verify the open panel updates, and confirm the existing inventory and action surface remains available.
- The real Web smoke should inspect the actual document language projection as supporting evidence, but the deterministic Client tests must separately prove that `ctx.locale` wins over a stale or conflicting DOM value.
- No native Windows G1–G6 lifecycle gate is required solely for this Browser presentation change because Host process, lifecycle, scanner, and action code are unchanged. If implementation modifies a Host projection or RPC contract despite this spec, the normal native gate becomes mandatory.
- Authoritative verification includes the Client/Host build, no-emit typecheck, deterministic Node test suite, real Web smoke where the Stock DSH checkout is available, and `git diff --check`.

## Out of Scope

- Changing DSH's locale detection, language selector, settings persistence, `LocaleRuntime`, `LocaleSnapshot`, `locale/change`, or HTML projection behavior.
- Adding a new Host settings namespace, locale-specific Host API, Browser-to-Host locale RPC, or language field to any existing Host DTO.
- Translating model-facing `port_list` output, Host logs, raw process metadata, user-provided text, executable names, toolchain names, project paths, commands, Session IDs, Call IDs, or other diagnostic data.
- Adding locale support for languages other than the DSH-supported `zh` and `en` ids. Unknown future ids use the safe English fallback until explicitly supported.
- Building a general-purpose localization framework, extracting all DSH translations, or modifying DSH's shared renderer locale seat.
- Calling `SlotRegistry.installLocale()` or registering Runtime Inspector's catalog as a DSH global locale namespace.
- Reading or writing language state through HTML meta tags, undocumented `data-*` attributes, `navigator`, local storage, session storage, visible settings labels, or arbitrary globals.
- Adding a Runtime Inspector language selector. DSH settings remain the sole user-facing owner of language selection.
- Changing panel layout, visual styling, Slot placement, Browser/Host transport, process scanning, Process origin, Verified attribution, Inferred attribution, Lifecycle owner, Managed shutdown, Direct external termination, action confirmation, or safety policy.
- Adding online translation services, runtime third-party requests, or a companion Web server.
- Changing the DSH product name or introducing localized branding beyond the message catalog.

## Further Notes

- The source research is recorded in `docs/dsh-runtime-inspector-i18n-research.md`. It identifies the Browser `ctx.locale` service as the authoritative current-locale seam, distinguishes it from the renderer-only `LocaleFace`, and confirms that HTML meta/data attributes do not carry a stable locale contract.
- The implementation should preserve the repository's current same-repository dual-face Bundle architecture: the Browser owns presentation state, while the Host remains authoritative for scanning, attribution, lifecycle ownership, and actions.
- The active locale id and the document language tag have different domains: DSH currently uses `zh`/`en` internally and projects them as `zh-CN`/`en`. Keep this mapping explicit so a future regional or script tag cannot silently become a new supported locale.
- The fallback exists for load order, isolated tests, and future composition variation. In the normal DSH Web profile, the locale service should be available; the fallback must not become a reason to bypass the service or add a compatibility warning.
- The first implementation pass should convert all existing panel copy and the fixed date formatter, then use the real Web smoke to find any missed title, tooltip, ARIA, or dynamic-count string.
