import assert from 'node:assert/strict'
import test from 'node:test'
import {
  WindowsListenerScanner,
  matchProcessAncestry,
  parseNetstatTcpListeners,
} from '../lib/windows-scanner.js'

function origin(id, rootPid, processCreatedAt, workdir = `C:\\project-${id}`) {
  return {
    id,
    rootPid,
    processCreatedAt,
    sessionId: `session-${id}`,
    agentId: `agent-${id}`,
    turn: 1,
    step: 1,
    callId: `call-${id}`,
    rootCallId: `root-${id}`,
    tool: 'pwsh',
    workdir,
    kind: 'spawn',
    observedAt: 1,
  }
}

function listener(pid, port = 3000) {
  return {
    protocol: 'tcp4',
    localAddress: '127.0.0.1',
    localPort: port,
    owningPid: pid,
  }
}

test('parses bounded IPv4/IPv6 TCP LISTENING rows and ignores non-listeners', () => {
  const rows = parseNetstatTcpListeners([
    '  TCP    0.0.0.0:3000       0.0.0.0:0       LISTENING       100',
    '  TCP    [::]:443           [::]:0           LISTENING       200',
    '  TCP    127.0.0.1:5000     127.0.0.1:6000   ESTABLISHED     300',
    '  UDP    0.0.0.0:53        *:*                              400',
    '  TCP    malformed          0.0.0.0:0       LISTENING       500',
  ].join('\r\n'))

  assert.deepEqual(rows, [
    { protocol: 'tcp4', localAddress: '0.0.0.0', localPort: 3000, owningPid: 100 },
    { protocol: 'tcp6', localAddress: '::', localPort: 443, owningPid: 200 },
  ])
})

test('verifies a listener only when every PID and creation identity in the chain matches', () => {
  const processes = [
    { pid: 300, parentPid: 200, processCreatedAt: '3000', executable: 'node.exe' },
    { pid: 200, parentPid: 100, processCreatedAt: '2000', executable: 'npm.exe' },
    { pid: 100, parentPid: 1, processCreatedAt: '1000', executable: 'pwsh.exe' },
  ]
  const result = matchProcessAncestry(300, processes, [origin(1, 100, '1000')])

  assert.deepEqual(result, {
    confidence: 'verified',
    rootPid: 100,
    originId: 1,
    ancestry: [300, 200, 100],
    reason: 'creation-identity-match',
  })
})

test('keeps same-named unrelated processes and PID reuse unattributed', () => {
  const origins = [origin(1, 100, '1000')]
  const unrelated = matchProcessAncestry(400, [
    { pid: 400, parentPid: 1, processCreatedAt: '4000', executable: 'node.exe' },
  ], origins)
  const reused = matchProcessAncestry(300, [
    { pid: 300, parentPid: 100, processCreatedAt: '3000', executable: 'node.exe' },
    { pid: 100, parentPid: 1, processCreatedAt: '9999', executable: 'pwsh.exe' },
  ], origins)

  assert.equal(unrelated.confidence, 'unattributed')
  assert.equal(unrelated.reason, 'root-not-reached')
  assert.equal(reused.confidence, 'unattributed')
  assert.equal(reused.reason, 'creation-identity-mismatch')
})

test('degrades to inferred when the candidate root is reached but an identity is unreadable', () => {
  const result = matchProcessAncestry(300, [
    { pid: 300, parentPid: 200, processCreatedAt: '3000', executable: 'node.exe' },
    { pid: 200, parentPid: 100, executable: 'npm.exe' },
    { pid: 100, parentPid: 1, processCreatedAt: '1000', executable: 'pwsh.exe' },
  ], [origin(1, 100, '1000')])

  assert.equal(result.confidence, 'inferred')
  assert.equal(result.originId, 1)
  assert.equal(result.reason, 'identity-unreadable')
  assert.deepEqual(result.ancestry, [300, 200, 100])
})

test('cycle-safe traversal never upgrades a parent cycle to verified', () => {
  const result = matchProcessAncestry(300, [
    { pid: 300, parentPid: 200, processCreatedAt: '3000' },
    { pid: 200, parentPid: 300, processCreatedAt: '2000' },
  ], [origin(1, 100, '1000')])

  assert.equal(result.confidence, 'unattributed')
  assert.equal(result.reason, 'parent-cycle')
  assert.deepEqual(result.ancestry, [300, 200])
})

test('ambiguous root identities never choose one concurrent Tool Call arbitrarily', () => {
  const result = matchProcessAncestry(300, [
    { pid: 300, parentPid: 100, processCreatedAt: '3000' },
    { pid: 100, parentPid: 1, processCreatedAt: '1000' },
  ], [origin(1, 100, '1000'), origin(2, 100, '1000')])

  assert.equal(result.confidence, 'unattributed')
  assert.equal(result.reason, 'ambiguous-root')
})

test('scanner preserves multiple listener roots and bounds malformed input', () => {
  const scanner = new WindowsListenerScanner({
    listListeners: () => [listener(300, 3000), listener(400, 4000), { ...listener(-1, 0) }],
    listProcesses: () => [
      { pid: 300, parentPid: 100, processCreatedAt: '3000', executable: 'node.exe' },
      { pid: 100, parentPid: 1, processCreatedAt: '1000', executable: 'pwsh.exe' },
      { pid: 400, parentPid: 200, processCreatedAt: '4000', executable: 'node.exe' },
      { pid: 200, parentPid: 1, processCreatedAt: '2000', executable: 'pwsh.exe' },
    ],
  }, 2)
  const rows = scanner.scan([origin(1, 100, '1000'), origin(2, 200, '2000')])

  assert.equal(rows.length, 2)
  assert.deepEqual(rows.map(row => ({ port: row.localPort, confidence: row.confidence, rootPid: row.rootPid, originId: row.originId })), [
    { port: 3000, confidence: 'verified', rootPid: 100, originId: 1 },
    { port: 4000, confidence: 'verified', rootPid: 200, originId: 2 },
  ])
  assert.equal(rows[0].project, 'C:\\project-1')
  assert.equal(rows[0].executable, 'node.exe')
})
