import assert from 'node:assert/strict'
import test from 'node:test'
import { isWindowsProtectedProcessLevel } from '../lib/process-actions.js'

test('Windows protection levels treat PROTECTION_LEVEL_NONE as unprotected', () => {
  assert.equal(isWindowsProtectedProcessLevel(0xFFFFFFFE), false)
  assert.equal(isWindowsProtectedProcessLevel(0), true)
  assert.equal(isWindowsProtectedProcessLevel(0x51), true)
  assert.equal(isWindowsProtectedProcessLevel(-1), undefined)
})
