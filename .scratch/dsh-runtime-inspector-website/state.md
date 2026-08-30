phase: accept
status: complete

## Evidence

- Decision round completed with the user on 2026-08-30.
- Repository inspection found no existing marketing-site application.
- Existing ADR-0004 supports a single repository while keeping Browser/Host product boundaries explicit.
- Existing assets include the approved rounded blue logo and two real DSH Runtime Inspector screenshots.
- Astro `7.2.9` static build passed and emitted both locale routes plus SEO endpoints.
- Browser verification passed at desktop and mobile sizes: no broken images, no mobile horizontal overflow, language navigation works, native FAQ expands, and copy feedback is readable.
- Follow-up visual fix passed: the evidence and context screenshots now render at their native horizontal ratios (`2048×990` and `2560×1237`), and the install command wraps without horizontal overflow at desktop and mobile widths.
- Follow-up typography fix passed: the context caption now uses the site body hierarchy (`1.04rem`, muted body color, `1.7` line-height) in both locales without viewport overflow.
- `git diff --check` passed.

## Next acceptance actions

- Website implementation and acceptance checks are complete.
- The remaining release action is to set the final Cloudflare Pages `PUBLIC_SITE_URL` when the domain is ready.
