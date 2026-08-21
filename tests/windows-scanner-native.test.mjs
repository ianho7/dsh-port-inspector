import assert from 'node:assert/strict'
import test from 'node:test'
import { WindowsListenerScanner } from '../lib/windows-scanner.js'

test('Windows scanner native boundary is safe to call on the current host', { skip: process.platform !== 'win32' }, () => {
  const rows = new WindowsListenerScanner().scan([])
  assert.ok(Array.isArray(rows))
  for (const row of rows) {
    assert.ok(row.owningPid > 0)
    assert.ok(row.localPort > 0 && row.localPort <= 65_535)
    assert.ok(row.protocol === 'tcp4' || row.protocol === 'tcp6')
    assert.equal(row.confidence, 'unattributed')
  }
})
