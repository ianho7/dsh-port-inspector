# 01: Establish the Browser locale seam and bilingual shell

**What to build:** Make the Runtime Inspector Browser surface follow DSH's active Browser locale. When the user opens Runtime Inspector in Chinese or English, the Sidebar entry and core panel chrome use the matching language; changing DSH's language updates the open surface without resetting the investigation. The implementation must use DSH's public `ctx.locale` state, keep a local message catalog, and retain a safe DOM-language fallback for isolated or incomplete Client composition.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] The Browser Client reads the active `zh` or `en` id from the DSH `ctx.locale` service when it is available, and the active service value wins over a conflicting HTML `lang` value.
- [x] When the locale service is absent, `document.documentElement.lang` maps `zh-*` to Chinese and `en-*` to English; missing or unknown values fall back silently to English.
- [x] The locale resolver does not use `navigator`, storage, visible language-selector text, undocumented `data-*` attributes, HTML language meta tags, Host RPC, or a new network request.
- [x] A Browser-local typed message catalog and translator are available to the Runtime Inspector presentation without adding a second i18n service or calling `SlotRegistry.installLocale()`.
- [x] The Sidebar entry and core panel chrome render in both supported languages, including the panel title/close affordance, loading or initial state, refresh control, and search control text and accessibility labels.
- [x] The presentation subscribes to DSH locale changes and updates the open surface from Chinese to English and back without losing selection, search, filters, or focus behavior.
- [x] The change remains Browser-only: Host DTOs, Host actions, Browser RPC payloads, `port_list`, Process origin, Lifecycle owner, and action safety behavior are unchanged.
- [x] Deterministic tests cover active-service precedence, DOM fallback, unknown fallback, live locale changes, and the Browser/Host boundary.

## Answer

Implemented the Browser locale seam and bilingual shell. Runtime Inspector probes the public DSH Browser locale service through the optional `ctx.get('locale')`/`ctx.locale` seam and subscribes to its changes; isolated or incomplete compositions fall back silently through `document.documentElement.lang` with English as the safe default. The local catalog and translator are bundled in the existing Client artifact, and the Host/RPC boundary remains unchanged.

Evidence: focused Client locale/session/panel/slot tests pass 26/26; the full deterministic suite passes 126/126 with 3 optional Stock DSH tests skipped when `DSH_REPO` is unset; the real Stock DSH Web smoke passes on `0.1.1-rc.2`.
