import assert from 'node:assert/strict'
import test from 'node:test'
import {
  installRuntimeObservers,
  ProcessOriginRegistry,
  RuntimeAttribution,
} from '../lib/attribution.js'

function execution(callId, command, agentId = 'session-a') {
  return {
    callId,
    rootCallId: `root-${callId}`,
    name: 'pwsh',
    turn: 1,
    step: 1,
    arguments: { command, workdir: 'C:\\work' },
    agent: { id: agentId, session: { id: agentId, header: { cwd: 'C:\\session' } } },
  }
}

function serviceFor(pids) {
  return {
    spawn() {
      return { pid: pids.shift() }
    },
    async spawnTerminal() {
      return { pid: pids.shift() }
    },
    marker: 'unchanged',
  }
}

class LocalTerminalHandle {
  constructor(pid, started) {
    this.pid = 0
    this.rootIdentity = undefined
    this.done = new Promise(() => {})
    this.listeners = new Set()
    this.terminal = {
      pid: 0,
      onData: listener => {
        this.listeners.add(listener)
        return { dispose: () => this.listeners.delete(listener) }
      },
    }
    this.inspector = {
      processTree: candidate => candidate === pid ? [{ pid, started }] : [],
    }
  }

  ready(pid) {
    this.terminal.pid = pid
    for (const listener of [...this.listeners]) listener('READY')
  }
}

test('records valid spawn roots with Session/Turn/Step/Call context and redacted command', () => {
  const runtime = new RuntimeAttribution({
    enabled: () => true,
    readIdentity: pid => ({ pid, createdAt: `created-${pid}` }),
  })
  runtime.observeSessionEvent(
    { id: 'session-a', header: { cwd: 'C:\\session' } },
    { type: 'tool/call', data: {
      turn: 4,
      step: 2,
      callId: 'call-1',
      name: 'pwsh',
      arguments: JSON.stringify({ command: 'pwsh --token top-secret', workdir: 'C:\\repo' }),
    } },
  )
  const service = serviceFor([101])
  const proxy = runtime.decorateSubprocessService(service)
  const handle = runtime.runToolExecution(execution('call-1', 'pwsh --token top-secret'), () => proxy.spawn({ cwd: 'C:\\actual-workdir' }))

  assert.equal(handle.pid, 101)
  assert.equal(proxy.marker, 'unchanged')
  assert.deepEqual(runtime.registry.list(), [{
    id: 1,
    rootPid: 101,
    processCreatedAt: 'created-101',
    sessionId: 'session-a',
    agentId: 'session-a',
    turn: 4,
    step: 2,
    callId: 'call-1',
    rootCallId: 'root-call-1',
    tool: 'pwsh',
    command: 'pwsh --token [REDACTED]',
    workdir: 'C:\\actual-workdir',
    kind: 'spawn',
    observedAt: runtime.registry.list()[0].observedAt,
  }])
})

test('does not duplicate an observation when both subprocess seams see the same handle', () => {
  const handle = { pid: 150 }
  const registry = new ProcessOriginRegistry()
  const first = registry.record({
    handle,
    rootPid: 150,
    processCreatedAt: 'created-150',
    sessionId: 'session-a',
    agentId: 'session-a',
    turn: 1,
    step: 1,
    callId: 'call-150',
    rootCallId: 'call-150',
    tool: 'pwsh',
    kind: 'spawn',
  })
  const duplicate = registry.record({
    handle,
    rootPid: 150,
    processCreatedAt: 'created-150',
    sessionId: 'session-a',
    agentId: 'session-a',
    turn: 1,
    step: 1,
    callId: 'call-150',
    rootCallId: 'call-150',
    tool: 'pwsh',
    kind: 'spawn',
  })
  assert.equal(first?.id, 1)
  assert.equal(duplicate?.id, 1)
  assert.equal(registry.list().length, 1)
})

test('parallel Tool Execution frames stay isolated and one call can own multiple roots', async () => {
  const runtime = new RuntimeAttribution({
    enabled: () => true,
    readIdentity: pid => ({ pid, createdAt: `created-${pid}` }),
  })
  const proxy = runtime.decorateSubprocessService(serviceFor([201, 202, 203]))
  await Promise.all([
    runtime.runToolExecution(execution('a', 'start-a', 'agent-a'), async () => {
      await new Promise(resolve => setTimeout(resolve, 5))
      proxy.spawn({})
      proxy.spawn({})
    }),
    runtime.runToolExecution(execution('b', 'start-b', 'agent-b'), async () => {
      proxy.spawnTerminal({})
    }),
  ])

  const origins = runtime.registry.list()
  assert.equal(origins.length, 3)
  assert.equal(origins.filter(origin => origin.callId === 'a').length, 2)
  assert.equal(origins.filter(origin => origin.callId === 'b').length, 1)
  assert.deepEqual(origins.map(origin => origin.rootPid).sort((a, b) => a - b), [201, 202, 203])
})

test('spawn and terminal handles, arguments, cancellation, and tool errors keep provider semantics', async () => {
  const controller = new AbortController()
  const spawnHandle = { pid: 220 }
  const terminalHandle = { pid: 221 }
  const received = []
  const service = {
    spawn(spec) {
      received.push(spec)
      return spawnHandle
    },
    spawnTerminal(spec) {
      received.push(spec)
      return Promise.resolve(terminalHandle)
    },
  }
  const runtime = new RuntimeAttribution({
    enabled: () => true,
    readIdentity: pid => ({ pid, createdAt: `created-${pid}` }),
  })
  const proxy = runtime.decorateSubprocessService(service)
  const spawnSpec = { signal: controller.signal, cwd: 'C:\\cancel-safe' }
  assert.throws(() => runtime.runToolExecution(execution('throws', 'start'), () => {
    assert.equal(proxy.spawn(spawnSpec), spawnHandle)
    throw new Error('tool body failed')
  }), /tool body failed/)
  const returnedTerminal = await runtime.runToolExecution(execution('terminal', 'start-terminal'), () => proxy.spawnTerminal({ cwd: 'C:\\terminal' }))
  assert.equal(returnedTerminal, terminalHandle)
  assert.deepEqual(received, [spawnSpec, { cwd: 'C:\\terminal' }])
  assert.deepEqual(runtime.registry.list().map(origin => origin.rootPid), [220, 221])
})

test('a delayed Stock DSH Terminal PID is repaired and attributed before spawnTerminal returns', async () => {
  const terminalHandle = new LocalTerminalHandle(271, '2:71')
  const runtime = new RuntimeAttribution({
    enabled: () => true,
    readIdentity: pid => ({ pid, createdAt: `created-${pid}` }),
  })
  const proxy = runtime.decorateSubprocessService({
    async spawnTerminal() {
      return terminalHandle
    },
  })

  const returnedPromise = runtime.runToolExecution(execution('terminal-delayed', 'start-terminal'), () =>
    proxy.spawnTerminal({ cwd: 'C:\\terminal', env: { DSH_PTY_SESSION_ID: 'pty-271' } }),
  )
  terminalHandle.ready(271)
  const returned = await returnedPromise

  assert.equal(returned, terminalHandle)
  assert.equal(returned.pid, 271)
  assert.deepEqual(runtime.registry.list().map(origin => ({
    rootPid: origin.rootPid,
    processCreatedAt: origin.processCreatedAt,
    callId: origin.callId,
    terminalSessionId: origin.terminalSessionId,
  })), [{
    rootPid: 271,
    processCreatedAt: 'created-271',
    callId: 'terminal-delayed',
    terminalSessionId: 'pty-271',
  }])
})

test('nested Code Mode execution inherits the outer Turn and Step while keeping its own call root', () => {
  const runtime = new RuntimeAttribution({
    enabled: () => true,
    readIdentity: pid => ({ pid, createdAt: `created-${pid}` }),
  })
  runtime.observeSessionEvent(
    { id: 'agent-a', header: { cwd: 'C:\\session' } },
    { type: 'tool/call', data: {
      turn: 8,
      step: 3,
      callId: 'outer',
      name: 'run_code',
      arguments: JSON.stringify({ code: 'tools.pwsh({ command: "start" })' }),
    } },
  )
  const proxy = runtime.decorateSubprocessService(serviceFor([250]))
  runtime.runToolExecution(execution('outer', 'run_code', 'agent-a'), () =>
    runtime.runToolExecution({
      ...execution('outer:code:1', 'start', 'agent-a'),
      rootCallId: 'outer',
      turn: undefined,
      step: undefined,
    }, () => proxy.spawn({ cwd: 'C:\\nested-workdir' })),
  )
  assert.deepEqual(runtime.registry.list().map(({ turn, step, callId, rootCallId, workdir }) => ({ turn, step, callId, rootCallId, workdir })), [{
    turn: 8,
    step: 3,
    callId: 'outer:code:1',
    rootCallId: 'outer',
    workdir: 'C:\\nested-workdir',
  }])
})

test('invalid PID, identity failure, spawn failure, and disposed proxies never create origins', async () => {
  const registry = new ProcessOriginRegistry()
  const runtime = new RuntimeAttribution({
    registry,
    enabled: () => true,
    readIdentity: pid => pid === 302 ? undefined : ({ pid, createdAt: 'ok' }),
  })
  let calls = 0
  const target = {
    spawn() {
      calls++
      if (calls === 1) throw new Error('spawn failed')
      if (calls === 2) return { pid: -1 }
      if (calls === 3) return { pid: 302 }
      return { pid: 303 }
    },
    spawnTerminal: async () => ({ pid: 304 }),
  }
  const proxy = runtime.decorateSubprocessService(target)
  assert.throws(() => runtime.runToolExecution(execution('bad', 'bad'), () => proxy.spawn({})), /spawn failed/)
  runtime.runToolExecution(execution('bad', 'bad'), () => proxy.spawn({}))
  runtime.runToolExecution(execution('bad', 'bad'), () => proxy.spawn({}))
  runtime.dispose()
  runtime.runToolExecution(execution('bad', 'bad'), () => proxy.spawn({}))
  assert.equal(registry.list().length, 0)
})

test('incomplete Tool Execution identity fails closed and the registry has a high-water bound', () => {
  const registry = new ProcessOriginRegistry(2)
  const runtime = new RuntimeAttribution({
    registry,
    enabled: () => true,
    readIdentity: pid => ({ pid, createdAt: `created-${pid}` }),
  })
  const proxy = runtime.decorateSubprocessService(serviceFor([360, 361, 362]))
  runtime.runToolExecution({ arguments: {} }, () => proxy.spawn({}))
  runtime.runToolExecution(execution('one', 'one'), () => proxy.spawn({}))
  runtime.runToolExecution(execution('two', 'two'), () => proxy.spawn({}))
  assert.deepEqual(runtime.registry.list().map(origin => origin.rootPid), [361, 362])
})

test('unexpected observer failures never change provider spawn behavior', () => {
  const runtime = new RuntimeAttribution({
    enabled: () => { throw new Error('gate failed') },
    readIdentity: () => { throw new Error('identity failed') },
  })
  const proxy = runtime.decorateSubprocessService(serviceFor([350]))
  const handle = runtime.runToolExecution(execution('observer-failure', 'start'), () => proxy.spawn({}))
  assert.equal(handle.pid, 350)
  assert.equal(runtime.registry.list().length, 0)
})

test('Cordis observer registration wraps dynamic subprocess lookup and disposes safely', async () => {
  const listeners = new Map()
  const runtime = new RuntimeAttribution({
    enabled: () => true,
    readIdentity: pid => ({ pid, createdAt: `created-${pid}` }),
  })
  const registration = installRuntimeObservers({
    on(name, listener) {
      listeners.set(name, listener)
      return () => listeners.delete(name)
    },
  }, runtime)
  assert.equal(registration.available, true)

  const target = serviceFor([401])
  const decorated = listeners.get('internal/get')({}, 'subprocess', new Error(), () => target)
  await listeners.get('tools/execute')(
    execution('call-4', 'start'),
    () => decorated.spawn({}),
  )
  assert.equal(runtime.registry.list()[0].rootPid, 401)

  registration.dispose()
  assert.equal(listeners.size, 0)
})

test('the stock LocalSubprocessRuntime fallback is reversible and remains observational', () => {
  class LocalSubprocessRuntime {
    spawn() {
      return { pid: 450 }
    }
  }
  const runtime = new RuntimeAttribution({
    enabled: () => true,
    readIdentity: pid => ({ pid, createdAt: `created-${pid}` }),
  })
  const provider = new LocalSubprocessRuntime()
  const dispose = runtime.patchSubprocessProvider(provider)
  assert.equal(typeof dispose, 'function')
  const handle = runtime.runToolExecution(execution('fallback', 'start-fallback'), () => provider.spawn({ cwd: 'C:\\fallback' }))
  assert.equal(handle.pid, 450)
  assert.equal(runtime.registry.list()[0].rootPid, 450)
  dispose?.()
  runtime.runToolExecution(execution('fallback-after-dispose', 'start-fallback'), () => provider.spawn({}))
  assert.equal(runtime.registry.list().length, 1)
})

test('fallback never mutates unsupported or disposed providers and rolls back partial preflight', () => {
  class RemoteSubprocessRuntime {
    spawn() {
      return { pid: 451 }
    }
  }
  class LocalSubprocessRuntime {
    spawn() {
      return { pid: 452 }
    }
    spawnTerminal() {
      return { pid: 453 }
    }
  }

  const runtime = new RuntimeAttribution({ enabled: () => true, readIdentity: pid => ({ pid, createdAt: `created-${pid}` }) })
  const remote = new RemoteSubprocessRuntime()
  assert.equal(runtime.patchSubprocessProvider(remote), undefined)
  assert.equal(Object.hasOwn(remote, 'spawn'), false)

  const partial = new LocalSubprocessRuntime()
  Object.defineProperty(partial, 'spawnTerminal', { configurable: false, enumerable: true, writable: false, value: partial.spawnTerminal })
  assert.equal(runtime.patchSubprocessProvider(partial), undefined)
  assert.equal(Object.hasOwn(partial, 'spawn'), false)

  let failSecondDefine = true
  const flaky = new Proxy(new LocalSubprocessRuntime(), {
    defineProperty(target, property, descriptor) {
      if (property === 'spawnTerminal' && failSecondDefine) {
        failSecondDefine = false
        throw new Error('simulated provider descriptor failure')
      }
      return Reflect.defineProperty(target, property, descriptor)
    },
  })
  assert.equal(runtime.patchSubprocessProvider(flaky), undefined)
  assert.equal(Object.hasOwn(flaky, 'spawn'), false)

  const local = new LocalSubprocessRuntime()
  const dispose = runtime.patchSubprocessProvider(local)
  assert.equal(typeof dispose, 'function')
  runtime.dispose()
  const executionWithContext = { ...execution('after-dispose', 'start'), agent: { ...execution('after-dispose', 'start').agent, ctx: { subprocess: local } } }
  runtime.runToolExecution(executionWithContext, () => local.spawn({}))
  assert.equal(Object.hasOwn(local, 'spawn'), false)
})

test('observer availability fails closed when a registration has no disposer', () => {
  const runtime = new RuntimeAttribution({ enabled: () => true })
  const registration = installRuntimeObservers({ on: () => undefined }, runtime)
  assert.equal(registration.available, false)
  registration.dispose()
})
