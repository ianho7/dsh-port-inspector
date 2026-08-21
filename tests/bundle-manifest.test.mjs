import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')

test('package declares an installable DSH Bundle patch', () => {
  assert.deepEqual(manifest.dsh, { bundle: { patch: './cordis.patch.yml' } })
  assert.equal(manifest.dependencies.koffi, '^3.1.0')
  assert.ok(manifest.files.includes('cordis.patch.yml'))
  assert.match(patch, /id: dsh-runtime-inspector/)
  assert.match(patch, /name: dsh-runtime-inspector/)
})
