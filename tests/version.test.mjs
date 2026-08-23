import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { readDshVersionNearEntry } from '../lib/version.js'

test('reads the DSH version from the package that owns the running CLI entry', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-version-entry-'))
  try {
    await mkdir(join(root, 'lib'), { recursive: true })
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: '@deepseek-ai/dsh', version: '0.1.1-rc.2' }))
    await writeFile(join(root, 'lib', 'bin.js'), '')

    assert.equal(readDshVersionNearEntry(join(root, 'lib', 'bin.js')), '0.1.1-rc.2')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('does not mistake an unrelated package near the process entry for DSH', async () => {
  const root = await mkdtemp(join(tmpdir(), 'not-dsh-version-entry-'))
  try {
    await mkdir(join(root, 'lib'), { recursive: true })
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'another-cli', version: '9.9.9' }))
    assert.equal(readDshVersionNearEntry(join(root, 'lib', 'bin.js')), undefined)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
