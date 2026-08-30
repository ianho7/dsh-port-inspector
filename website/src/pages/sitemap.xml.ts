import type { APIRoute } from 'astro';

const defaultSiteUrl = 'https://dsh-runtime-inspector.pages.dev';
const paths = ['/zh/', '/en/'];

export const GET: APIRoute = ({ site }) => {
  const baseUrl = site ?? new URL(defaultSiteUrl);
  const urls = paths
    .map((path) => `  <url><loc>${new URL(path, baseUrl).href}</loc></url>`)
    .join('\n');
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
