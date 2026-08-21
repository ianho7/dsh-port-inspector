import assert from 'node:assert/strict'
import test from 'node:test'
import {
  LifecycleOwnerRegistry,
} from '../lib/lifecycle.js'
import {
  ProcessOriginRegistry,
  RuntimeAttribution,
} from '../lib/attribution.js'

function execution(agent, callId = 'call-1') {
  return {
    callId,
    rootCallId: callId,
    name: 'pwsh',
    turn: 1,
    step: 1,
    arguments: { command: 'start-service', workdir: 'C:\\work' },
    agent,
  }
}

function makeAgent(services) {
  return {
    id: 'agent-a',
    session: { id: 'session-a', header: { cwd: 'C:\\session' } },
    ctx: {
      get(name) {
        return services[name]
      },
    },
  }
}

function makeJobs(agent) {
  const records = new Map()
  const listeners = new Set()
  const calls = { kill: [], wait: [] }
  let killError
  return {
    calls,
    list() {
      return [...records.values()]
    },
    onJobsChanged(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    publish(id) {
      records.set(id, { id, status: 'running' })
      for (const listener of [...listeners]) listener(agent)
    },
    kill(id, owner, reason) {
      calls.kill.push({ id, owner, reason })
      if (killError !== undefined) throw killError
      return 'requested'
    },
    async wait(id, timeoutMs, owner) {
      calls.wait.push({ id, timeoutMs, owner })
      return { id, status: 'killed' }
    },
    setKillError(error) {
      killError = error
    },
  }
}

function makeTerminals(agent) {
  const sessions = []
  const calls = []
  return {
    sessions,
    calls,
    list(owner) {
      return sessions.filter(session => session.owner === owner).map(({ owner: _owner, ...snapshot }) => snapshot)
    },
    async kill(owner, sessionId, reason) {
      calls.push({ owner, sessionId, reason })
      const index = sessions.findIndex(session => session.owner === owner && session.sessionId === sessionId)
      if (index >= 0) sessions.splice(index, 1)
      return true
    },
  }
}

test('links a root spawned before Job allocation only after the new Job and result cross-check agree', () => {
  const registry = new ProcessOriginRegistry()
  const lifecycle = new LifecycleOwnerRegistry(registry)
  const jobs = makeJobs()
  const agent = makeAgent({ jobs })
  const runtime = new RuntimeAttribution({
    registry,
    lifecycle,
    enabled: () => true,
    readIdentity: pid => ({ pid, createdAt: `created-${pid}` }),
  })
  const service = { spawn: () => ({ pid: 501 }) }
  const proxy = runtime.decorateSubprocessService(service)

  runtime.runToolExecution(execution(agent), () => {
    const handle = proxy.spawn({})
    jobs.publish('pwsh-1')
    assert.equal(handle.pid, 501)
    return { value: { kind: 'background', jobId: 'pwsh-1' } }
  })

  assert.equal(registry.list()[0].jobId, 'pwsh-1')
  assert.equal(lifecycle.bindingFor(registry.list()[0].id)?.ownerId, 'pwsh-1')
})

test('keeps concurrent same-owner Job allocations isolated by the ALS callback', async () => {
  const registry = new ProcessOriginRegistry()
  const lifecycle = new LifecycleOwnerRegistry(registry)
  const jobs = makeJobs()
  const agent = makeAgent({ jobs })
  const runtime = new RuntimeAttribution({
    registry,
    lifecycle,
    enabled: () => true,
    readIdentity: pid => ({ pid, createdAt: `created-${pid}` }),
  })
  const proxy = runtime.decorateSubprocessService({
    spawn: (() => {
      let pid = 511
      return () => ({ pid: pid++ })
    })(),
  })
  let release
  const barrier = new Promise(resolve => { release = resolve })
  const first = runtime.runToolExecution(execution(agent, 'first'), async () => {
    await barrier
    proxy.spawn({})
    jobs.publish('pwsh-first')
    return { value: { kind: 'background', jobId: 'pwsh-first' } }
  })
  const second = runtime.runToolExecution(execution(agent, 'second'), async () => {
    await barrier
    proxy.spawn({})
    jobs.publish('pwsh-second')
    return { value: { kind: 'background', jobId: 'pwsh-second' } }
  })
  release()
  await Promise.all([first, second])

  assert.deepEqual(
    registry.list().map(origin => [origin.callId, origin.jobId]),
    [['first', 'pwsh-first'], ['second', 'pwsh-second']],
  )
})

test('does not link a root created after Job publication', () => {
  const registry = new ProcessOriginRegistry()
  const lifecycle = new LifecycleOwnerRegistry(registry)
  const jobs = makeJobs()
  const agent = makeAgent({ jobs })
  const runtime = new RuntimeAttribution({
    registry,
    lifecycle,
    enabled: () => true,
    readIdentity: pid => ({ pid, createdAt: `created-${pid}` }),
  })
  const proxy = runtime.decorateSubprocessService({ spawn: () => ({ pid: 521 }) })

  runtime.runToolExecution(execution(agent), () => {
    jobs.publish('pwsh-late')
    proxy.spawn({})
    return { value: { kind: 'background', jobId: 'pwsh-late' } }
  })

  assert.equal(registry.list()[0].jobId, undefined)
  assert.equal(lifecycle.bindingFor(registry.list()[0].id), undefined)
})

test('failed Job producer and mismatched structured result never create a managed link', () => {
  const registry = new ProcessOriginRegistry()
  const lifecycle = new LifecycleOwnerRegistry(registry)
  const jobs = makeJobs()
  const agent = makeAgent({ jobs })
  const runtime = new RuntimeAttribution({
    registry,
    lifecycle,
    enabled: () => true,
    readIdentity: pid => ({ pid, createdAt: `created-${pid}` }),
  })
  const proxy = runtime.decorateSubprocessService({
    spawn: () => ({ pid: 502 }),
  })

  assert.throws(() => runtime.runToolExecution(execution(agent, 'failed'), () => {
    proxy.spawn({})
    jobs.publish('pwsh-2')
    throw new Error('producer failed')
  }), /producer failed/)
  runtime.runToolExecution(execution(agent, 'mismatch'), () => {
    proxy.spawn({})
    jobs.publish('pwsh-3')
    return { value: { kind: 'background', jobId: 'other-job' } }
  })

  assert.equal(registry.list().find(origin => origin.callId === 'failed')?.jobId, undefined)
  assert.equal(registry.list().find(origin => origin.callId === 'mismatch')?.jobId, undefined)
})

test('links only first persistent terminal creation and closes it with the exact owner', async () => {
  const registry = new ProcessOriginRegistry()
  const lifecycle = new LifecycleOwnerRegistry(registry)
  const terminals = makeTerminals()
  const agent = makeAgent({ terminals })
  const runtime = new RuntimeAttribution({
    registry,
    lifecycle,
    enabled: () => true,
    readIdentity: pid => ({ pid, createdAt: `created-${pid}` }),
  })
  const proxy = runtime.decorateSubprocessService({
    async spawnTerminal() {
      return { pid: 601 }
    },
  })

  await runtime.runToolExecution(execution(agent), async () => {
    const handle = await proxy.spawnTerminal({ env: { DSH_PTY_SESSION_ID: 'pty-1' } })
    terminals.sessions.push({ owner: agent, sessionId: 'pty-1', pid: handle.pid, status: { kind: 'running' } })
    return { value: { kind: 'foreground' } }
  })
  runtime.runToolExecution(execution(agent, 'later-send'), () => ({ value: { kind: 'foreground' } }))

  const origin = registry.list()[0]
  assert.equal(origin.terminalSessionId, 'pty-1')
  assert.equal(registry.list().length, 1)
  const result = await lifecycle.shutdown(origin.id, { reason: 'test close' })
  assert.equal(result.ok, true)
  assert.deepEqual(terminals.calls, [{ owner: agent, sessionId: 'pty-1', reason: 'test close' }])
  assert.equal(terminals.sessions.length, 0)
})

test('managed shutdown is owner-fenced and never escalates after Job failure', async () => {
  const registry = new ProcessOriginRegistry()
  const lifecycle = new LifecycleOwnerRegistry(registry)
  const jobs = makeJobs()
  const agent = makeAgent({ jobs })
  const runtime = new RuntimeAttribution({
    registry,
    lifecycle,
    enabled: () => true,
    readIdentity: pid => ({ pid, createdAt: `created-${pid}` }),
  })
  const proxy = runtime.decorateSubprocessService({ spawn: () => ({ pid: 701 }) })
  runtime.runToolExecution(execution(agent), () => {
    proxy.spawn({})
    jobs.publish('pwsh-7')
    return { value: { kind: 'background', jobId: 'pwsh-7' } }
  })
  jobs.setKillError(new Error('owner kill denied'))

  const result = await lifecycle.shutdown(registry.list()[0].id)
  assert.equal(result.ok, false)
  assert.equal(result.escalated, false)
  assert.equal(jobs.calls.kill[0].owner, agent)
  assert.equal(jobs.calls.wait.length, 0)
})

test('lifecycle disposal only removes observer state and never kills a managed owner', () => {
  const registry = new ProcessOriginRegistry()
  const lifecycle = new LifecycleOwnerRegistry(registry)
  const jobs = makeJobs()
  const agent = makeAgent({ jobs })
  const runtime = new RuntimeAttribution({
    registry,
    lifecycle,
    enabled: () => true,
    readIdentity: pid => ({ pid, createdAt: `created-${pid}` }),
  })
  const proxy = runtime.decorateSubprocessService({ spawn: () => ({ pid: 801 }) })
  runtime.runToolExecution(execution(agent), () => {
    proxy.spawn({})
    jobs.publish('pwsh-dispose')
    return { value: { kind: 'background', jobId: 'pwsh-dispose' } }
  })

  const originId = registry.list()[0].id
  lifecycle.dispose()

  assert.equal(lifecycle.bindingFor(originId), undefined)
  assert.deepEqual(jobs.calls.kill, [])
  assert.deepEqual(jobs.calls.wait, [])
})
