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
  assert.equal(typeof published[0].service.host.inventory, 'function')
  assert.equal(typeof published[0].service.host.performAction, 'function')
  assert.equal(typeof published[0].service.terminateExternal, 'function')
  const externalResult = await published[0].service.terminateExternal({
    owningPid: 123,
    processCreatedAt: '1000',
    executable: 'node.exe',
  }, { confirmed: true })
  assert.equal(externalResult.reason, 'compatibility-disabled')
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
      assert.ok(['internal/get', 'tools/execute', 'tools/result', 'session/event', 'internal/service'].includes(name))
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

test('the model-facing port_list tool is registered read-only and removed on unload', async () => {
  const effects = []
  const definitions = []
  let unregistered = false
  const context = {
    tools: {
      register(definition) {
        definitions.push(definition)
        return () => { unregistered = true }
      },
    },
    provide() {},
    get() {
      return undefined
    },
    effect(factory) {
      effects.push(factory())
    },
  }

  apply(context)

  assert.equal(definitions.length, 1)
  assert.equal(definitions[0].name, 'port_list')
  assert.equal(Object.hasOwn(definitions[0], 'terminate'), false)
  const result = await definitions[0].execute({}, { agent: { session: { id: 'session-1' } } })
  assert.equal(result.readOnly, true)
  assert.equal(result.mode, 'read-only-degraded')
  assert.equal(result.listeners.every(listener => listener.confidence === 'unattributed'), true)
  assert.equal(result.listeners.every(listener => listener.ownership === 'unattributed'), true)

  await effects[0]()
  assert.equal(unregistered, true)
})
