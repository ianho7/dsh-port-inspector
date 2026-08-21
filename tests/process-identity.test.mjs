import assert from 'node:assert/strict'
import test from 'node:test'
import { formatWindowsFileTime, readWindowsProcessIdentity } from '../lib/process-identity.js'

test('Windows creation identity uses a lossless canonical FILETIME string', () => {
  assert.equal(formatWindowsFileTime(0x01, 0x00000002), '4294967298')
  assert.equal(formatWindowsFileTime(-1, 0), undefined)
  assert.equal(formatWindowsFileTime(0, 0x1_0000_0000), undefined)
})

test('native identity reader fails closed outside Windows or for invalid PIDs', () => {
  assert.equal(readWindowsProcessIdentity(0), undefined)
  assert.equal(readWindowsProcessIdentity(-1), undefined)
})
