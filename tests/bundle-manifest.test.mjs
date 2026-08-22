import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')

test('package declares an installable DSH Bundle patch', () => {
  assert.deepEqual(manifest.dsh, {
    bundle: { patch: './cordis.patch.yml' },
    client: { platform: 'web', inject: ['@deepseek-ai/dsh-client-runtime'] },
  })
  assert.equal(manifest.exports['./client'].default, './lib/client.js')
  assert.equal(manifest.exports['./client'].types, './lib/client.d.ts')
  assert.equal(manifest.dependencies.koffi, '^3.1.0')
  assert.ok(manifest.files.includes('cordis.patch.yml'))
  assert.match(patch, /id: dsh-runtime-inspector/)
  assert.match(patch, /name: dsh-runtime-inspector/)
})

test('package includes the DSH lazy-CJS Browser artifact', async () => {
  const client = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  assert.match(client, /window\.__ModuleLoader__\.load/)
  assert.match(client, /dsh-runtime-inspector/)
  assert.match(client, /require\("react"\)/)
})
