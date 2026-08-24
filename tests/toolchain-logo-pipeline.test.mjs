import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { sanitizeSvg, updateToolchainLogos, validateSource } from '../scripts/update-toolchain-logos.mjs'

test('logo source validation only accepts same-host HTTPS assets', () => {
  assert.doesNotThrow(() => validateSource({ homepage: 'https://vite.dev/', assetUrl: 'https://vite.dev/logo.svg' }))
  assert.throws(() => validateSource({ homepage: 'https://vite.dev/', assetUrl: 'http://vite.dev/logo.svg' }), /HTTPS/)
  assert.throws(() => validateSource({ homepage: 'https://vite.dev/', assetUrl: 'https://cdn.example/logo.svg' }), /official homepage host/)
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

test('generated logo data is local and contains the initial web toolchains', async () => {
  const generated = await readFile(new URL('../src/client/toolchain-logo-data.ts', import.meta.url), 'utf8').catch(() => '')
  for (const id of ['vite', 'nextjs', 'nodejs']) assert.match(generated, new RegExp(id))
  assert.match(generated, /data:image\//)
  assert.doesNotMatch(generated, /https?:\/\//)
})

test('logo updater rejects an oversized response before buffering the body', async () => {
  const response = {
    ok: true,
    headers: new Headers({
      'content-length': String(256 * 1024 + 1),
      'content-type': 'image/svg+xml',
    }),
  }
  await assert.rejects(updateToolchainLogos({ fetchImpl: async () => response }), /exceeds 262144 bytes/)
})
