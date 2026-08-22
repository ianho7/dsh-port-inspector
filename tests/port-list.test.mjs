import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createPortListTool,
  projectPortList,
  registerPortListTool,
} from '../lib/port-list.js'

function origin({
  id,
  sessionId,
  jobId,
  command = 'pwsh --token super-secret --cwd C:\\project',
  workdir = 'C:\\projects\\runtime-inspector',
} = {}) {
  return {
    id,
    rootPid: 100 + id,
    processCreatedAt: `${1000 + id}`,
    sessionId,
    agentId: `agent-${id}`,
    turn: 2,
    step: 3,
    callId: `call-${id}`,
    rootCallId: `root-${id}`,
    tool: 'pwsh',
    command,
    workdir,
    kind: 'spawn',
    ...jobId === undefined ? {} : { jobId },
    observedAt: 1,
  }
}

function row({ pid, originId, confidence = 'verified', project } = {}) {
  return {
    protocol: 'tcp4',
    localAddress: '127.0.0.1',
    localPort: 3_000 + pid,
    owningPid: pid,
    processCreatedAt: '1000',
    executable: 'C:\\Program Files\\nodejs\\node.exe',
    confidence,
    ancestry: [pid, 101],
    reason: confidence === 'verified' ? 'creation-identity-match' : 'identity-unreadable',
    ...originId === undefined ? {} : { originId, rootPid: 101 },
    ...project === undefined ? {} : { project },
  }
}

test('port_list gives the current Session full redacted attribution and other Sessions only a coarse owner', () => {
  const origins = [
    origin({ id: 1, sessionId: 'session-current', jobId: 'job-current', workdir: 'C:\\projects\\TOKEN=path-secret' }),
    origin({ id: 2, sessionId: 'session-other', command: 'pwsh --password other-secret', workdir: 'C:\\other-project' }),
  ]
  const result = projectPortList({
    complete: true,
    rows: [row({ pid: 101, originId: 1 }), row({ pid: 102, originId: 2 })],
  }, origins, 'session-current')

  assert.equal(result.readOnly, true)
  assert.equal(result.listeners[0].ownership, 'current-session')
  assert.equal(result.listeners[0].origin.sessionId, 'session-current')
  assert.equal(result.listeners[0].origin.callId, 'call-1')
  assert.equal(result.listeners[0].lifecycleOwner.kind, 'job')
  assert.match(result.listeners[0].origin.command, /\[REDACTED\]/)
  assert.equal(result.listeners[0].origin.command.includes('super-secret'), false)
  assert.equal(result.listeners[0].origin.workdir.includes('path-secret'), false)

  const other = result.listeners[1]
  assert.equal(other.ownership, 'another-dsh-session')
  assert.equal(other.confidence, 'verified')
  assert.equal(Object.hasOwn(other, 'origin'), false)
  assert.equal(Object.hasOwn(other, 'project'), false)
  assert.equal(Object.hasOwn(other, 'lifecycleOwner'), false)
  assert.equal(JSON.stringify(other).includes('other-secret'), false)
  assert.equal(JSON.stringify(other).includes('session-other'), false)
})

test('inferred attribution remains visible but never exposes a managed lifecycle owner', () => {
  const result = projectPortList({
    complete: true,
    rows: [row({ pid: 101, originId: 1, confidence: 'inferred' })],
  }, [origin({ id: 1, sessionId: 'session-current', jobId: 'job-current' })], 'session-current')

  assert.equal(result.listeners[0].confidence, 'inferred')
  assert.equal(result.listeners[0].ownership, 'current-session')
  assert.equal(result.listeners[0].origin.sessionId, 'session-current')
  assert.equal(Object.hasOwn(result.listeners[0], 'lifecycleOwner'), false)
})

test('port_list is bounded, preserves incomplete scan status, and has no action capability', async () => {
  const rows = Array.from({ length: 130 }, (_, index) => row({ pid: 200 + index }))
  const result = projectPortList({ complete: false, rows }, [], 'session-current', 'read-only-degraded')

  assert.equal(result.mode, 'read-only-degraded')
  assert.equal(result.scanComplete, false)
  assert.equal(result.listeners.length, 128)
  assert.equal(result.truncated, true)
  assert.equal(result.listeners[0].localAddress.length <= 128, true)

  const tool = createPortListTool(() => result)
  assert.equal(tool.name, 'port_list')
  assert.equal(Object.hasOwn(tool, 'terminate'), false)
  assert.equal(Object.hasOwn(tool, 'shutdown'), false)
  assert.equal((await tool.execute({}, {})).readOnly, true)
  assert.equal(tool.output.render({}, result)[0].text.length <= 65_536, true)
})

test('port_list declares an object-rooted JSON Schema for its arguments', () => {
  const tool = createPortListTool(() => projectPortList({ complete: true, rows: [] }, [], 'session-current'))

  assert.deepEqual(tool.parameters, {
    type: 'object',
    properties: {},
    additionalProperties: false,
  })
})

test('tool registration is reversible and does not require a termination service', () => {
  const definitions = []
  let disposed = false
  const unregister = registerPortListTool({
    register(definition) {
      definitions.push(definition)
      return () => { disposed = true }
    },
  }, () => projectPortList({ complete: true, rows: [] }, [], 'session-current'))

  assert.equal(typeof unregister, 'function')
  assert.equal(definitions.length, 1)
  assert.equal(definitions[0].name, 'port_list')
  assert.equal(typeof definitions[0].execute, 'function')
  assert.deepEqual(definitions[0].output.schema.required, ['mode', 'readOnly', 'scanComplete', 'truncated', 'listeners'])
  assert.equal(Object.values(definitions[0].output.schema.properties).some(property => property.required === true), false)
  unregister()
  assert.equal(disposed, true)
})
