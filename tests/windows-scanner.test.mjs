import assert from 'node:assert/strict'
import test from 'node:test'
import {
  WindowsListenerScanner,
  matchProcessAncestry,
  parseNetstatTcpListeners,
} from '../lib/windows-scanner.js'
import { parseWindowsProcessCommandLines } from '../lib/windows-process-commandline.js'

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

test('parses only bounded CIM process projections and redacts command secrets', () => {
  const rows = parseWindowsProcessCommandLines(JSON.stringify([
    { pid: 300, parentPid: 200, executable: 'node.exe', commandLine: 'node "C:\\Users\\alice\\Project Files\\app.js" --token super-secret --db postgres://user:pass@example.test/db' },
    { pid: '200', parentPid: '100', executable: 'npm.exe', commandLine: 'npm run dev' },
    { pid: 201, parentPid: 100, executable: 'python.exe', commandLine: 'python C:/Users/alice/app.py' },
    { pid: 300, parentPid: 999, executable: 'reused.exe', commandLine: 'bad' },
    { pid: 0, parentPid: 1, executable: 'invalid.exe', commandLine: 'bad' },
  ]))

  assert.deepEqual(rows, [
    { pid: 300, parentPid: 200, executable: 'node.exe', commandLine: 'node "[PATH]" --token [REDACTED] --db postgres://[REDACTED]@example.test/db' },
    { pid: 200, parentPid: 100, executable: 'npm.exe', commandLine: 'npm run dev' },
    { pid: 201, parentPid: 100, executable: 'python.exe', commandLine: 'python [PATH]' },
  ])
})

test('scanner adds a redacted root-to-listener launch chain only for verified ancestry', () => {
  const scanner = new WindowsListenerScanner({
    listListeners: () => [listener(300, 3000), listener(400, 4000)],
    listProcesses: () => [
      { pid: 300, parentPid: 200, processCreatedAt: '3000', executable: 'node.exe' },
      { pid: 200, parentPid: 100, processCreatedAt: '2000', executable: 'npm.exe' },
      { pid: 100, parentPid: 1, processCreatedAt: '1000', executable: 'pwsh.exe' },
      { pid: 400, parentPid: 1, processCreatedAt: '4000', executable: 'other.exe' },
    ],
    readProcessCommandLines: () => [
      { pid: 300, parentPid: 200, executable: 'node.exe', commandLine: 'node app.js --token secret' },
      { pid: 200, parentPid: 100, executable: 'npm.exe', commandLine: 'npm run dev' },
      { pid: 100, parentPid: 1, executable: 'pwsh.exe', commandLine: 'pwsh -NoProfile' },
    ],
    readProcessIdentity: pid => ({ pid, createdAt: pid === 100 ? '1000' : pid === 200 ? '2000' : '3000' }),
  })

  const rows = scanner.scan([origin(1, 100, '1000')])
  assert.deepEqual(rows[0].launchChain, [
    { pid: 100, executable: 'pwsh.exe', command: 'pwsh -NoProfile', role: 'root' },
    { pid: 200, executable: 'npm.exe', command: 'npm run dev', role: 'intermediate' },
    { pid: 300, executable: 'node.exe', command: 'node app.js --token [REDACTED]', role: 'listener' },
  ])
  assert.equal(rows[1].launchChain, undefined)
})

test('scanner drops a command when the second identity check detects PID reuse', () => {
  const scanner = new WindowsListenerScanner({
    listListeners: () => [listener(300)],
    listProcesses: () => [
      { pid: 300, parentPid: 100, processCreatedAt: '3000', executable: 'node.exe' },
      { pid: 100, parentPid: 1, processCreatedAt: '1000', executable: 'pwsh.exe' },
    ],
    readProcessCommandLines: () => [
      { pid: 300, parentPid: 100, executable: 'node.exe', commandLine: 'node app.js' },
      { pid: 100, parentPid: 1, executable: 'pwsh.exe', commandLine: 'pwsh' },
    ],
    readProcessIdentity: pid => ({ pid: pid === 300 ? 301 : pid, createdAt: pid === 300 ? '3000' : '1000' }),
  })

  const row = scanner.scan([origin(1, 100, '1000')])[0]
  assert.deepEqual(row.launchChain, [
    { pid: 100, executable: 'pwsh.exe', command: 'pwsh', role: 'root' },
    { pid: 300, executable: 'node.exe', role: 'listener' },
  ])
})

test('scanner preserves verified executable facts when command-line reading fails', () => {
  const scanner = new WindowsListenerScanner({
    listListeners: () => [listener(300)],
    listProcesses: () => [
      { pid: 300, parentPid: 100, processCreatedAt: '3000', executable: 'listener.exe' },
      { pid: 100, parentPid: 1, processCreatedAt: '1000', executable: 'launcher.exe' },
    ],
    readProcessCommandLines: () => { throw new Error('access denied') },
  })

  assert.deepEqual(scanner.scan([origin(1, 100, '1000')])[0].launchChain, [
    { pid: 100, executable: 'launcher.exe', role: 'root' },
    { pid: 300, executable: 'listener.exe', role: 'listener' },
  ])
})

test('scanner queries only verified ancestry and caps the PID batch', () => {
  const queried = []
  const scanner = new WindowsListenerScanner({
    listListeners: () => [listener(300, 3000), listener(400, 4000)],
    listProcesses: () => [
      { pid: 300, parentPid: 100, processCreatedAt: '3000', executable: 'node.exe' },
      { pid: 100, parentPid: 1, processCreatedAt: '1000', executable: 'pwsh.exe' },
      { pid: 400, parentPid: 999, processCreatedAt: '4000', executable: 'other.exe' },
    ],
    readProcessCommandLines: pids => { queried.push(...pids); return [] },
    readProcessIdentity: pid => ({ pid, createdAt: pid === 100 ? '1000' : '3000' }),
  })

  scanner.scan([origin(1, 100, '1000')])
  assert.deepEqual(queried, [100, 300])
})

test('scanner caps a large verified ancestry PID batch at 64 unique PIDs', () => {
  const listeners = Array.from({ length: 70 }, (_, index) => listener(1_000 + index, 3_000 + index))
  const processes = [
    { pid: 100, parentPid: 1, processCreatedAt: 'root', executable: 'pwsh.exe' },
    ...listeners.map(value => ({ pid: value.owningPid, parentPid: 100, processCreatedAt: `${value.owningPid}`, executable: 'listener.exe' })),
  ]
  const queried = []
  const scanner = new WindowsListenerScanner({
    listListeners: () => listeners,
    listProcesses: () => processes,
    readProcessCommandLines: pids => { queried.push(...pids); return [] },
  })

  scanner.scan([origin(1, 100, 'root')])
  assert.equal(queried.length, 64)
  assert.equal(queried[0], 100)
  assert.equal(queried[63], 1_062)
})

test('scanner keeps launch chains within 16 nodes while preserving root and listener', () => {
  const pids = Array.from({ length: 17 }, (_, index) => 100 + index)
  const processes = pids.map((pid, index) => ({
    pid,
    parentPid: index === 0 ? 1 : pid - 1,
    processCreatedAt: `${pid}`,
    executable: index === 0 ? 'pwsh.exe' : 'node.exe',
  }))
  const scanner = new WindowsListenerScanner({
    listListeners: () => [listener(116)],
    listProcesses: () => processes,
    readProcessCommandLines: () => [],
  })

  const chain = scanner.scan([origin(1, 100, '100')])[0].launchChain
  assert.equal(chain.length, 16)
  assert.equal(chain[0].pid, 100)
  assert.equal(chain[0].role, 'root')
  assert.equal(chain.at(-1).pid, 116)
  assert.equal(chain.at(-1).role, 'listener')
})

test('command-line parser fails closed on oversized output', () => {
  assert.deepEqual(parseWindowsProcessCommandLines('x'.repeat(256 * 1024 + 1)), [])
})

test('command-line parser fails closed on malformed or empty output and bounds public commands inclusively', () => {
  assert.deepEqual(parseWindowsProcessCommandLines('not-json'), [])
  assert.deepEqual(parseWindowsProcessCommandLines(''), [])
  const [row] = parseWindowsProcessCommandLines(JSON.stringify({
    pid: 300,
    parentPid: 200,
    executable: 'listener.exe',
    commandLine: 'x'.repeat(2_000),
  }))
  assert.equal(row.commandLine.length, 1_024)
  assert.equal(row.commandLine.at(-1), '…')
})
