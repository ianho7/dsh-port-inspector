import { defineConfig } from 'astro/config';

const siteUrl = process.env.PUBLIC_SITE_URL ?? 'https://dsh-runtime-inspector.pages.dev';

export default defineConfig({
  site: siteUrl,
  output: 'static',
  trailingSlash: 'always',
  compressHTML: true,
});
