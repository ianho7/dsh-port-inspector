# DSH Runtime Inspector 官网规格

Status: resolved

## Confirmed decisions

- The official marketing site lives in this repository under `website/`.
- `website/` is an independent Astro application and is not part of the published plugin package.
- The site is a static build for Cloudflare Pages. The production URL is configured through `PUBLIC_SITE_URL` and can change later without changing page content.
- Locales use `/zh/` and `/en/`. The root path points visitors to `/zh/`.
- The first release is a focused single-page marketing site with installation guidance, feature explanation, product evidence, safety boundaries, and FAQ.
- The official product name remains `DSH Runtime Inspector`; the Chinese descriptor is `DSH 运行时检查器`.
- Astro is pinned to `7.2.9`.

## Design read

This is a technical product landing page for developers using DSH Web, with a trustworthy evidence-first visual language and a small amount of warmth from the rounded blue whale mark. The page uses an asymmetric split hero, real product screenshots, a single blue accent, a light theme, and restrained motion.

The design dials are `DESIGN_VARIANCE 7`, `MOTION_INTENSITY 4`, and `VISUAL_DENSITY 4`.

## Core user tasks

1. Understand what the plugin answers and why a normal process viewer is not enough.
2. Scan the plugin capabilities and the Windows/DSH boundary.
3. Inspect real product evidence before trusting the claims.
4. Install the plugin or open the source and release links.
5. Switch between Chinese and English without losing the page context.

## UI contract

- Primary navigation is made from native links to stable section IDs.
- Locale switching uses native links to `/zh/` and `/en/`.
- The install command has a native button with an accessible name and persistent readable copy feedback.
- FAQ uses native `details` and `summary` controls.
- No critical content depends on hover, animation, color alone, or JavaScript.
- The page includes canonical URLs, language alternates, Open Graph metadata, JSON-LD, `robots.txt`, and `sitemap.xml`.
