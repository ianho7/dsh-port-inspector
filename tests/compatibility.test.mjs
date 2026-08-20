import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluateCompatibility, SUPPORTED_DSH_VERSION } from '../lib/compatibility.js'

const supported = {
  platform: 'win32',
  detectedDshVersion: SUPPORTED_DSH_VERSION,
  expectedDshVersion: SUPPORTED_DSH_VERSION,
  subprocessProvider: 'LocalSubprocessRuntime',
  hasSpawn: true,
  hasSpawnTerminal: true,
  hasObserverContract: true,
}

test('supported Stock DSH Windows local probe activates observing mode', () => {
  const result = evaluateCompatibility(supported)
  assert.equal(result.mode, 'observing')
  assert.equal(result.executionWorld, 'windows-local')
  assert.equal(result.verifiedAttributionEnabled, true)
  assert.equal(result.terminationEnabled, true)
  assert.equal(result.reason, undefined)
})

test('unknown DSH version fails closed to read-only degraded mode', () => {
  const result = evaluateCompatibility({
    ...supported,
    detectedDshVersion: '0.1.0-rc.9',
  })
  assert.equal(result.mode, 'read-only-degraded')
  assert.equal(result.verifiedAttributionEnabled, false)
  assert.equal(result.terminationEnabled, false)
  assert.equal(result.reason, 'dsh-version-unsupported')
})

test('non-Windows execution fails closed before attribution or actions', () => {
  const result = evaluateCompatibility({ ...supported, platform: 'linux' })
  assert.equal(result.mode, 'read-only-degraded')
  assert.equal(result.reason, 'windows-only')
})

test('remote or unknown subprocess providers fail closed', () => {
  const result = evaluateCompatibility({
    ...supported,
    subprocessProvider: 'E2BSubprocessRuntime',
  })
  assert.equal(result.mode, 'read-only-degraded')
  assert.equal(result.reason, 'execution-world-unsupported')
})

test('a missing subprocess contract fails closed without guessing', () => {
  const result = evaluateCompatibility({ ...supported, hasSpawnTerminal: false })
  assert.equal(result.mode, 'read-only-degraded')
  assert.equal(result.reason, 'subprocess-contract-unavailable')
})

test('a missing observer contract fails closed without verified claims', () => {
  const result = evaluateCompatibility({ ...supported, hasObserverContract: false })
  assert.equal(result.mode, 'read-only-degraded')
  assert.equal(result.verifiedAttributionEnabled, false)
  assert.equal(result.terminationEnabled, false)
  assert.equal(result.observerContractAvailable, false)
  assert.equal(result.reason, 'observer-contract-unavailable')
})
