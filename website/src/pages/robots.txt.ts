import type { APIRoute } from 'astro';

const defaultSiteUrl = 'https://dsh-runtime-inspector.pages.dev';

export const GET: APIRoute = ({ site }) => {
  const baseUrl = site ?? new URL(defaultSiteUrl);
  const sitemapUrl = new URL('/sitemap.xml', baseUrl).href;
  const body = [`User-agent: *`, `Allow: /`, `Disallow: /index.html`, `Sitemap: ${sitemapUrl}`, ''].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
