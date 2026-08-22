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
        constructor: { name: 'RemoteSubprocessRuntime' },
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

test('Stock-style uninjected tools property falls back to public service lookup', async () => {
  const effects = []
  const definitions = []
  const tools = {
    register(definition) {
      definitions.push(definition)
      return () => {}
    },
  }
  const context = {
    get(name) {
      return name === 'tools' ? tools : undefined
    },
    get tools() {
      throw new Error('cannot get property "tools" without inject')
    },
    provide() {},
    effect(factory) {
      effects.push(factory())
    },
  }

  apply(context)

  assert.equal(definitions.length, 1)
  assert.equal(definitions[0].name, 'port_list')
  await effects[0]()
})

test('port_list registers when the Stock DSH tools service is published after Bundle apply', async () => {
  const effects = []
  const listeners = new Map()
  const definitions = []
  let unregistered = false
  const context = {
    provide() {},
    get() {
      return undefined
    },
    on(name, listener) {
      if (!listeners.has(name)) listeners.set(name, [])
      listeners.get(name).push(listener)
      return () => listeners.get(name)?.splice(listeners.get(name).indexOf(listener), 1)
    },
    effect(factory) {
      effects.push(factory())
    },
  }

  apply(context)
  assert.equal(definitions.length, 0)

  const tools = {
    register(definition) {
      definitions.push(definition)
      return () => { unregistered = true }
    },
  }
  for (const listener of listeners.get('internal/service') ?? []) listener('tools', tools)

  assert.equal(definitions.length, 1)
  assert.equal(definitions[0].name, 'port_list')
  await effects[0]()
  assert.equal(unregistered, true)
})

test('compatibility rechecks when the local subprocess service is published after Bundle apply', async () => {
  const effects = []
  const listeners = new Map()
  let subprocess
  let runtimeInspector
  const context = {
    provide(name, service) {
      if (name === 'runtimeInspector') runtimeInspector = service
    },
    get(name) {
      return name === 'subprocess' ? subprocess : undefined
    },
    on(name, listener) {
      if (!listeners.has(name)) listeners.set(name, [])
      listeners.get(name).push(listener)
      return () => listeners.get(name)?.splice(listeners.get(name).indexOf(listener), 1)
    },
    effect(factory) {
      effects.push(factory())
    },
  }

  apply(context)
  assert.equal(context.get('subprocess'), undefined)

  subprocess = {
    constructor: { name: 'LocalSubprocessRuntime' },
    spawn() {},
    spawnTerminal() {},
  }
  for (const listener of listeners.get('internal/service') ?? []) listener('subprocess', subprocess)

  // The real DSH version is supported by the package's peer range; only the
  // late subprocess publication should have changed the initial degraded state.
  assert.equal(runtimeInspector.health.reason, undefined)
  assert.equal(runtimeInspector.health.mode, 'observing')
  await effects[0]?.()
})

test('Web bridge registers as one removable route without adding a second effect', async () => {
  const effects = []
  const routes = []
  let removed = false
  const context = {
    provide() {},
    get(name) {
      if (name !== 'webServer') return undefined
      return {
        register(route) {
          routes.push(route)
          return () => { removed = true }
        },
      }
    },
    on() { return () => {} },
    effect(factory) { effects.push(factory()) },
  }

  apply(context)

  assert.equal(routes.length, 1)
  assert.equal(routes[0].path, '/api/dsh-runtime-inspector')
  assert.equal(effects.length, 1)
  await effects[0]()
  assert.equal(removed, true)
})
