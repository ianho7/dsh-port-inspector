import assert from 'node:assert/strict'
import test from 'node:test'
import { apply } from '../lib/index.js'

test('plugin publishes health and unload only disables its own service', async () => {
  const effects = []
  const published = []
  const context = {
    provide(name, service) {
      published.push({ name, service })
    },
    get() {
      return undefined
    },
    effect(factory) {
      effects.push(factory())
    },
  }

  apply(context)

  assert.equal(published.length, 1)
  assert.equal(published[0].name, 'runtimeInspector')
  assert.equal(published[0].service.health.mode, 'read-only-degraded')
  assert.ok(published[0].service.health.reason)
  assert.equal(published[0].service.health.verifiedAttributionEnabled, false)
  assert.equal(published[0].service.health.terminationEnabled, false)
  assert.equal(published[0].service.isActive(), true)
  assert.equal(typeof published[0].service.listeners, 'function')
  assert.equal(effects.length, 1)

  await effects[0]()

  assert.equal(published[0].service.isActive(), false)
  assert.equal(published[0].service.health.lifecycle, 'disposed')
})

test('a registered Cordis observer contract is reported even when another gate fails', async () => {
  const effects = []
  const published = []
  const context = {
    provide(name, service) {
      published.push({ name, service })
    },
    get() {
      return {
        constructor: { name: 'LocalSubprocessRuntime' },
        spawn() {},
        spawnTerminal() {},
      }
    },
    on(name, listener) {
      assert.ok(['internal/get', 'tools/execute', 'session/event', 'internal/service'].includes(name))
      assert.equal(typeof listener, 'function')
      return () => {}
    },
    effect(factory) {
      effects.push(factory())
    },
  }

  apply(context)

  assert.equal(published[0].service.health.mode, 'read-only-degraded')
  assert.equal(published[0].service.health.observerContractAvailable, true)
  assert.equal(published[0].service.health.verifiedAttributionEnabled, false)
  await effects[0]()
})
