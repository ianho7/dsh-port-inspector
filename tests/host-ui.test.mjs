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

test('Browser-selected Session controls presentation without changing origin authority', () => {
  const { host } = harness({ origins: [origin({ id: 1, sessionId: 'session-a', jobId: 'job-a' })] })

  assert.equal(host.inventory({ currentSessionId: 'session-a' }).listeners[0].sessionVisibility, 'current-session')
  assert.equal(host.inventory({ currentSessionId: 'session-b' }).listeners[0].sessionVisibility, 'another-dsh-session')
  assert.equal(host.inventory({ currentSessionId: 'session-b' }).listeners[0].action.kind, 'managed-shutdown')
})

test('Host inventory projects current-project development presentation without changing process authority', () => {
  const { host } = harness({
    origins: [origin({
      id: 1,
      sessionId: 'session-a',
      jobId: 'job-a',
      workdir: 'C:\\projects\\runtime-inspector',
      command: 'npm exec vite -- --host 127.0.0.1',
    })],
  })

  const listener = host.inventory({
    currentSessionId: 'session-a',
    currentProject: 'C:\\projects\\runtime-inspector',
  }).listeners[0]

  assert.deepEqual({
    group: listener.development.group,
    reasons: listener.development.reasons,
    toolchain: listener.development.toolchain,
  }, {
    group: 'current-project',
    reasons: ['current-session', 'current-project'],
    toolchain: 'vite',
  })
  assert.match(listener.development.stableKey, /^project:runtime-inspector-[a-z0-9]+:vite$/)
  assert.doesNotMatch(listener.development.stableKey, new RegExp(String(listener.pid)))
  assert.equal(listener.confidence, 'verified')
  assert.equal(listener.action.kind, 'managed-shutdown')
  assert.equal(listener.lifecycleOwner.kind, 'job')
})

test('Host inventory separates known development runtimes from unrelated and port-only listeners', () => {
  const { host } = harness({
    origins: [],
    rows: [
      row({ pid: 301, port: 4173, originId: undefined, confidence: 'unattributed', executable: 'C:\\Program Files\\nodejs\\node.exe', project: '' }),
      row({ pid: 302, port: 57621, originId: undefined, confidence: 'unattributed', executable: 'C:\\Users\\dev\\AppData\\Spotify\\Spotify.exe', project: '' }),
      row({ pid: 303, port: 5432, originId: undefined, confidence: 'unattributed', executable: 'C:\\tools\\listener.exe', project: '' }),
    ],
  })

  const byPort = new Map(host.inventory().listeners.map(listener => [listener.port, listener]))
  assert.deepEqual(byPort.get(4173).development, {
    group: 'development-environment',
    reasons: ['runtime'],
    toolchain: 'nodejs',
    stableKey: 'application:nodejs',
  })
  assert.equal(byPort.get(57621).development.group, 'other')
  assert.deepEqual(byPort.get(57621).development.reasons, [])
  assert.equal(byPort.get(5432).development.group, 'other')
  assert.equal(byPort.get(5432).development.toolchain, undefined)
})

test('Host inventory identifies backend frameworks before runtimes and explicit data services', () => {
  const origins = [
    origin({ id: 11, sessionId: 'session-b', jobId: 'job-django', command: 'python manage.py runserver', workdir: 'C:\\projects\\django-app' }),
    origin({ id: 12, sessionId: 'session-b', command: 'python -m flask run', workdir: 'C:\\projects\\flask-app' }),
    origin({ id: 13, sessionId: 'session-b', command: 'uvicorn api:app', workdir: 'C:\\projects\\fastapi-app' }),
    origin({ id: 14, sessionId: 'session-b', command: 'java -jar spring-boot-app.jar', workdir: 'C:\\projects\\spring-app' }),
    origin({ id: 15, sessionId: 'session-b', command: 'dotnet web.dll --urls http://localhost', workdir: 'C:\\projects\\dotnet-app' }),
  ]
  const rows = [
    row({ pid: 411, port: 8011, originId: 11, executable: 'C:\\Python312\\python.exe', project: 'C:\\projects\\django-app' }),
    row({ pid: 412, port: 8012, originId: 12, executable: 'C:\\Python312\\python.exe', project: 'C:\\projects\\flask-app' }),
    row({ pid: 413, port: 8013, originId: 13, executable: 'C:\\Python312\\python.exe', project: 'C:\\projects\\fastapi-app' }),
    row({ pid: 414, port: 8014, originId: 14, executable: 'C:\\Java\\bin\\java.exe', project: 'C:\\projects\\spring-app' }),
    row({ pid: 415, port: 8015, originId: 15, executable: 'C:\\Program Files\\dotnet\\dotnet.exe', project: 'C:\\projects\\dotnet-app' }),
    row({ pid: 416, port: 5432, confidence: 'unattributed', executable: 'C:\\PostgreSQL\\bin\\postgres.exe', project: '' }),
    row({ pid: 417, port: 6379, confidence: 'unattributed', executable: 'C:\\Redis\\redis-server.exe', project: '' }),
    row({ pid: 418, port: 27017, confidence: 'unattributed', executable: 'C:\\MongoDB\\mongod.exe', project: '' }),
    row({ pid: 419, port: 3306, confidence: 'unattributed', executable: 'C:\\MySQL\\bin\\mysqld.exe', project: '' }),
    row({ pid: 420, port: 3307, confidence: 'unattributed', executable: 'C:\\tools\\listener.exe', project: '' }),
  ]
  const { host } = harness({ origins, rows })
  const byPort = new Map(host.inventory({ currentSessionId: 'session-a' }).listeners.map(listener => [listener.port, listener]))

  assert.deepEqual([...byPort.entries()].slice(0, 9).map(([port, listener]) => [port, listener.development.toolchain]), [
    [8011, 'django'],
    [8012, 'flask'],
    [8013, 'fastapi'],
    [8014, 'spring'],
    [8015, 'dotnet'],
    [5432, 'postgresql'],
    [6379, 'redis'],
    [27017, 'mongodb'],
    [3306, 'mysql'],
  ])
  for (const port of [8011, 8012, 8013, 8014, 8015, 5432, 6379, 27017, 3306]) {
    assert.equal(byPort.get(port).development.group, 'development-environment')
  }
  assert.equal(byPort.get(3307).development.group, 'other')
  assert.equal(byPort.get(3307).development.toolchain, undefined)
  assert.equal(byPort.get(8011).action.kind, 'managed-shutdown')
})

test('Host inventory uses broad runtime fallbacks only from executable evidence', () => {
  const executables = [
    ['C:\\Python312\\python.exe', 'python'],
    ['C:\\Java\\bin\\java.exe', 'java'],
    ['C:\\Program Files\\dotnet\\dotnet.exe', 'dotnet'],
    ['C:\\Go\\bin\\go.exe', 'go'],
    ['C:\\Rust\\bin\\cargo.exe', 'rust'],
    ['C:\\PHP\\php-cgi.exe', 'php'],
    ['C:\\Ruby\\bin\\ruby.exe', 'ruby'],
    ['C:\\Bun\\bun.exe', 'bun'],
    ['C:\\Deno\\deno.exe', 'deno'],
    ['C:\\MariaDB\\bin\\mariadbd.exe', 'mariadb'],
  ]
  const { host } = harness({
    origins: [],
    rows: executables.map(([executable], index) => row({
      pid: 500 + index,
      port: 9000 + index,
      confidence: 'unattributed',
      executable,
      project: '',
    })),
  })

  assert.deepEqual(host.inventory().listeners.map(listener => listener.development.toolchain), executables.map(([, id]) => id))
  assert.ok(host.inventory().listeners.every(listener => listener.development.group === 'development-environment'))
  assert.ok(host.inventory().listeners.slice(0, 9).every(listener => listener.development.reasons.includes('runtime')))
})

test('Host inventory identifies explicit container, mobile and local AI evidence without port guessing', () => {
  const origins = [
    origin({ id: 21, sessionId: 'session-b', command: 'npx react-native start', workdir: 'C:\\projects\\mobile' }),
    origin({ id: 22, sessionId: 'session-b', command: 'firebase emulators:start', workdir: 'C:\\projects\\firebase' }),
  ]
  const { host } = harness({
    origins,
    rows: [
      row({ pid: 521, port: 8081, originId: 21, executable: 'C:\\nodejs\\node.exe', project: 'C:\\projects\\mobile' }),
      row({ pid: 522, port: 4400, originId: 22, executable: 'C:\\nodejs\\node.exe', project: 'C:\\projects\\firebase' }),
      row({ pid: 523, port: 5037, confidence: 'unattributed', executable: 'C:\\Android\\platform-tools\\adb.exe', project: '' }),
      row({ pid: 524, port: 11434, confidence: 'unattributed', executable: 'C:\\Ollama\\ollama.exe', project: '' }),
      row({ pid: 525, port: 5501, confidence: 'unattributed', executable: 'C:\\Docker\\docker-proxy.exe', project: '' }),
      row({ pid: 526, port: 5502, confidence: 'unattributed', executable: 'C:\\Windows\\System32\\wslhost.exe', project: '' }),
      row({ pid: 527, port: 8081, confidence: 'unattributed', executable: 'C:\\tools\\proxy.exe', project: '' }),
    ],
  })
  const byPortAndPid = new Map(host.inventory().listeners.map(listener => [`${listener.port}:${listener.pid}`, listener]))

  assert.equal(byPortAndPid.get('8081:521').development.toolchain, 'metro')
  assert.equal(byPortAndPid.get('4400:522').development.toolchain, 'firebase')
  assert.equal(byPortAndPid.get('5037:523').development.toolchain, 'adb')
  assert.equal(byPortAndPid.get('11434:524').development.toolchain, 'ollama')
  assert.equal(byPortAndPid.get('5501:525').development.toolchain, 'docker')
  assert.equal(byPortAndPid.get('5502:526').development.toolchain, 'wsl')
  assert.equal(byPortAndPid.get('8081:527').development.group, 'other')
  assert.equal(byPortAndPid.get('8081:527').development.toolchain, undefined)
})

test('copy returns bounded redacted details and open-directory uses only the selected project', async () => {
  const { host, calls } = harness({ origins: [origin({ id: 1, workdir: 'C:\\projects\\TOKEN=secret' })] })
  const listener = host.inventory().listeners[0]

  const copied = await host.copyDetails({ listenerId: listener.listenerId })
  assert.equal(copied.ok, true)
  assert.match(copied.text, /Port: 3000/)
  assert.match(copied.text, /Agent: agent-1/)
  assert.match(copied.text, /Turn\/Step: 2\/3/)
  assert.match(copied.text, /Call ID: call-1/)
  assert.match(copied.text, /Root Call ID: root-1/)
  assert.match(copied.text, /Tool: pwsh/)
  assert.match(copied.text, /Spawn type: spawn/)
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

test('source tracking degradation does not disable a separately safe external action', async () => {
  const degraded = harness({ mode: 'read-only-degraded', rows: [row({ originId: 1 })], origins: [origin({ id: 1, jobId: 'job-a' })] })
  const degradedRow = degraded.host.inventory().listeners[0]
  assert.equal(degradedRow.action.kind, 'external-single-pid')
  assert.equal(degradedRow.action.available, true)
  const degradedResult = await degraded.host.performAction({ listenerId: degradedRow.listenerId, kind: 'external-single-pid', confirmed: true })
  assert.equal(degradedResult.status, 'completed')
  assert.deepEqual(degraded.calls.external, [101])
})

test('incomplete process identity remains read-only', async () => {
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
