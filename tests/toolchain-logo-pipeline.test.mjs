import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import test from 'node:test'
import { sanitizeSvg, updateToolchainLogos, validateSource } from '../scripts/update-toolchain-logos.mjs'

test('logo source validation only accepts HTTPS assets', () => {
  assert.doesNotThrow(() => validateSource('https://vite.dev/logo.svg'))
  assert.throws(() => validateSource('http://vite.dev/logo.svg'), /HTTPS/)
})

test('SVG sanitizer rejects active content and external references', () => {
  assert.equal(sanitizeSvg('<svg><path d="M0 0"/></svg>'), '<svg><path d="M0 0"/></svg>')
  assert.throws(() => sanitizeSvg('<svg><script>alert(1)</script></svg>'), /active content/)
  assert.throws(() => sanitizeSvg('<svg><image href="https://example.test/a.png"/></svg>'), /external reference/)
  assert.doesNotThrow(() => sanitizeSvg('<svg><style>.x{fill:red}</style></svg>'))
  assert.throws(() => sanitizeSvg('<svg><style>@import url(https://example.test/a)</style></svg>'), /active styling content/)
  assert.throws(() => sanitizeSvg('<svg><path fill="url(https://example.test/a)"/></svg>'), /external reference/)
  assert.throws(() => sanitizeSvg('<!DOCTYPE svg SYSTEM "https://example.test/a"><svg></svg>'), /external XML content/)
})

test('every logo source has a checked-in local asset', async () => {
  const manifest = JSON.parse(await readFile(new URL('../assets/toolchains/sources.json', import.meta.url), 'utf8'))
  const files = await readdir(new URL('../assets/toolchains/', import.meta.url))
  for (const id of Object.keys(manifest)) {
    assert.ok(files.some((file) => file.startsWith(`${id}.`)), `${id}: local asset is missing`)
  }
})

test('generated logo map imports the local first and second batch assets', async () => {
  const generated = await readFile(new URL('../src/client/toolchain-logo-data.ts', import.meta.url), 'utf8').catch(() => '')
  const manifest = JSON.parse(await readFile(new URL('../assets/toolchains/sources.json', import.meta.url), 'utf8'))
  for (const id of Object.keys(manifest)) assert.match(generated, new RegExp(`toolchain-assets/${id}\\.`))
  assert.ok(generated.length < 10_000)
  assert.doesNotMatch(generated, /data:image\//)
  assert.doesNotMatch(generated, /"name"/)
  assert.doesNotMatch(generated, /https?:\/\//)
})

test('built client exposes imported raster logos as data URIs', async () => {
  const built = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  assert.match(built, /data:image\/png;base64,/)
  assert.doesNotMatch(built, /"adb":\s*"iVBORw0KGgo/)
})

test('logo updater rejects an oversized response before buffering the body', async () => {
  const response = {
    ok: true,
    headers: new Headers({
      'content-length': String(256 * 1024 + 1),
      'content-type': 'image/svg+xml',
    }),
  }
  await assert.rejects(updateToolchainLogos({ fetchImpl: async () => response, refresh: true }), /exceeds 262144 bytes/)
})
