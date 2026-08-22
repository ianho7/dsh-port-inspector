import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createRuntimeInspectorHost,
} from '../lib/host-ui.js'

function origin({ id = 1, sessionId = 'session-a', jobId, workdir = 'C:\\projects\\runtime-inspector', command = 'pwsh --token super-secret' } = {}) {
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
    observedAt: 1,
    ...jobId === undefined ? {} : { jobId },
  }
}

function row({ pid = 101, port = 3000, originId, confidence = 'verified', createdAt = '1001', executable = 'C:\\Program Files\\nodejs\\node.exe', project = 'C:\\projects\\runtime-inspector' } = {}) {
  return {
    protocol: 'tcp4',
    localAddress: '127.0.0.1',
    localPort: port,
    owningPid: pid,
    processCreatedAt: createdAt,
    executable,
    project,
    confidence,
    ancestry: [pid, 100],
    reason: confidence === 'verified' ? 'creation-identity-match' : 'identity-unreadable',
    ...originId === undefined ? {} : { originId, rootPid: 101 },
  }
}

function harness({ rows, origins = [], mode = 'observing', clipboard, openDirectory } = {}) {
  const calls = { shutdown: [], external: [], clipboard: [], open: [] }
  let currentRows = rows ?? [row({ originId: 1 })]
  const host = createRuntimeInspectorHost({
    scanner: {
      scanWithStatus() {
        return { complete: true, rows: currentRows }
      },
    },
    origins: () => origins,
    mode: () => mode,
    currentSessionId: () => 'session-a',
    shutdown: async (originId) => {
      calls.shutdown.push(originId)
      currentRows = []
      return { ok: true, originId, status: 'completed', ownerKind: 'job', ownerId: 'job-1', escalated: false }
    },
    terminateExternal: async (selection) => {
      calls.external.push(selection.owningPid)
      currentRows = []
      return { ok: true, action: 'external-single-pid', status: 'completed', pid: selection.owningPid, port: selection.localPort, portReleased: true, rescan: [], revalidated: true }
    },
    clipboard: clipboard === false ? undefined : async (value) => {
      calls.clipboard.push(value)
      await clipboard?.(value)
    },
    openDirectory: openDirectory === false ? undefined : async (value) => {
      calls.open.push(value)
      await openDirectory?.(value)
    },
  })
  return { host, calls, setRows(value) { currentRows = value } }
}

test('Host inventory exposes redacted listener attribution and searches/sorts by UI fields', () => {
  const { host } = harness({
    origins: [origin({ id: 1, sessionId: 'session-a', jobId: 'job-a', workdir: 'C:\\projects\\TOKEN=secret' }), origin({ id: 2, sessionId: 'session-b', workdir: 'D:\\other' })],
    rows: [row({ pid: 202, port: 4200, originId: 2, project: 'D:\\other' }), row({ pid: 101, port: 3000, originId: 1 })],
  })

  const result = host.inventory({ search: '4200', sort: { key: 'port', direction: 'asc' } })
  assert.equal(result.listeners.length, 1)
  assert.equal(result.listeners[0].port, 4200)
  assert.equal(result.listeners[0].sessionVisibility, 'another-dsh-session')
  assert.equal(result.listeners[0].session.sessionId, 'session-b')
  assert.equal(result.listeners[0].lifecycleOwner, undefined)

  const sorted = host.inventory({ sort: { key: 'port', direction: 'desc' } })
  assert.deepEqual(sorted.listeners.map(listener => listener.port), [4200, 3000])
  assert.equal(host.inventory({ search: 'node.exe' }).listeners.length, 2)
  assert.equal(JSON.stringify(result).includes('secret'), false)
})

test('copy returns bounded redacted details and open-directory uses only the selected project', async () => {
  const { host, calls } = harness({ origins: [origin({ id: 1, workdir: 'C:\\projects\\TOKEN=secret' })] })
  const listener = host.inventory().listeners[0]

  const copied = await host.copyDetails({ listenerId: listener.listenerId })
  assert.equal(copied.ok, true)
  assert.match(copied.text, /Port: 3000/)
  assert.equal(copied.text.includes('super-secret'), false)
  assert.equal(copied.text.includes('TOKEN=secret'), false)
  assert.equal(calls.clipboard.length, 1)

  const opened = await host.openProjectDirectory({ listenerId: listener.listenerId })
  assert.equal(opened.ok, false)
  assert.equal(opened.reason, 'project-unavailable')
  assert.deepEqual(calls.open, [])

  const available = harness({ origins: [origin({ id: 1, workdir: 'C:\\projects\\runtime-inspector' })] })
  const availableRow = available.host.inventory().listeners[0]
  const openedAvailable = await available.host.openProjectDirectory({ listenerId: availableRow.listenerId })
  assert.equal(openedAvailable.ok, true)
  assert.deepEqual(available.calls.open, ['C:\\projects\\runtime-inspector'])
})

test('open-directory can use the scanner project fallback for an unattributed listener', async () => {
  const available = harness({
    origins: [],
    rows: [row({ originId: undefined, confidence: 'inferred', project: 'C:\\projects\\external-service' })],
  })
  const listener = available.host.inventory().listeners[0]

  const opened = await available.host.openProjectDirectory({ listenerId: listener.listenerId })
  assert.equal(opened.ok, true)
  assert.deepEqual(available.calls.open, ['C:\\projects\\external-service'])
})

test('managed action requires confirmation, uses the owner API, and reports a fresh released scan', async () => {
  const { host, calls } = harness({ origins: [origin({ id: 1, jobId: 'job-a' })] })
  const listener = host.inventory().listeners[0]
  assert.equal(listener.action.kind, 'managed-shutdown')
  assert.equal(listener.action.available, true)
  assert.equal(listener.action.requiresConfirmation, true)

  const denied = await host.performAction({ listenerId: listener.listenerId, kind: 'managed-shutdown', confirmed: false })
  assert.equal(denied.status, 'denied')
  assert.deepEqual(calls.shutdown, [])

  const completed = await host.performAction({ listenerId: listener.listenerId, kind: 'managed-shutdown', confirmed: true })
  assert.equal(completed.status, 'completed')
  assert.equal(completed.portReleased, true)
  assert.deepEqual(calls.shutdown, [1])
  assert.deepEqual(calls.external, [])
  assert.equal(completed.freshScan.scanComplete, true)
})

test('external action is distinct, confirmed, and cannot be invoked for a managed row', async () => {
  const external = harness({ rows: [row({ originId: undefined, confidence: 'inferred' })], origins: [] })
  const externalRow = external.host.inventory().listeners[0]
  assert.equal(externalRow.action.kind, 'external-single-pid')
  const result = await external.host.performAction({ listenerId: externalRow.listenerId, kind: 'external-single-pid', confirmed: true })
  assert.equal(result.status, 'completed')
  assert.deepEqual(external.calls.external, [101])
  assert.deepEqual(external.calls.shutdown, [])

  const managed = harness({ origins: [origin({ id: 1, jobId: 'job-a' })] })
  const managedRow = managed.host.inventory().listeners[0]
  const wrongAction = await managed.host.performAction({ listenerId: managedRow.listenerId, kind: 'external-single-pid', confirmed: true })
  assert.equal(wrongAction.status, 'denied')
  assert.equal(wrongAction.reason, 'action-not-allowed')
  assert.deepEqual(managed.calls.shutdown, [])
  assert.deepEqual(managed.calls.external, [])
})

test('degraded and incomplete-identity rows remain read-only and expose no action callback', async () => {
  const degraded = harness({ mode: 'read-only-degraded', rows: [row({ originId: 1 })], origins: [origin({ id: 1, jobId: 'job-a' })] })
  const degradedRow = degraded.host.inventory().listeners[0]
  assert.equal(degradedRow.action.kind, 'degraded')
  assert.equal(degradedRow.action.available, false)
  const degradedResult = await degraded.host.performAction({ listenerId: degradedRow.listenerId, kind: 'managed-shutdown', confirmed: true })
  assert.equal(degradedResult.status, 'denied')
  assert.deepEqual(degraded.calls.shutdown, [])

  const readOnly = harness({ rows: [row({ createdAt: '', executable: '' })] })
  const readOnlyRow = readOnly.host.inventory().listeners[0]
  assert.equal(readOnlyRow.action.kind, 'read-only')
  assert.equal(readOnlyRow.action.available, false)
  const readOnlyResult = await readOnly.host.performAction({ listenerId: readOnlyRow.listenerId, kind: 'external-single-pid', confirmed: true })
  assert.equal(readOnlyResult.status, 'denied')
  assert.deepEqual(readOnly.calls.external, [])
})

test('RPC surface contains inventory and safe actions but no process primitives', async () => {
  const { host } = harness()
  assert.equal(typeof host.rpc.inventory, 'function')
  assert.equal(typeof host.rpc.copyDetails, 'function')
  assert.equal(typeof host.rpc.openProjectDirectory, 'function')
  assert.equal(typeof host.rpc.performAction, 'function')
  assert.equal(Object.hasOwn(host.rpc, 'scanner'), false)
  assert.equal(Object.hasOwn(host.rpc, 'origins'), false)
  assert.equal(Object.hasOwn(host.rpc, 'shutdown'), false)
  assert.equal(Object.hasOwn(host.rpc, 'terminateExternal'), false)
  assert.equal((await host.rpc.copyDetails({ listenerId: 'missing' })).ok, false)
})
