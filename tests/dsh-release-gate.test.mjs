import assert from 'node:assert/strict'
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import test from 'node:test'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const dshRoot = process.env.DSH_REPO
const dshBin = dshRoot === undefined ? undefined : join(dshRoot, 'apps', 'cli', 'lib', 'bin.js')
const canRunStockDsh = dshRoot !== undefined && dshBin !== undefined

const LISTENER_SOURCE = `
import net from 'node:net'
import { writeFileSync } from 'node:fs'

const port = Number(process.argv[2])
const readyFile = process.argv[3]
const server = net.createServer(socket => socket.end())
server.listen(port, '127.0.0.1', () => writeFileSync(readyFile, JSON.stringify({ pid: process.pid, port })))
setInterval(() => {}, 1_000)
`

const PROBE_SOURCE = `
import assert from 'node:assert/strict'
import { existsSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'

export const name = 'port-inspector-release-gate'
export const inject = ['runtimeInspector', 'sessions', 'tools', 'shell', 'terminals']

let ctx
let runtimeInspector
const gateDir = process.env.RI_GATE_DIR
const resultFile = process.env.RI_GATE_RESULT
const stopFile = process.env.RI_GATE_STOP
const listenerFile = process.env.RI_GATE_LISTENER
const handles = new Map()
const terminals = []
const externalProcesses = []
const agentDisposers = []
const toolDisposers = []
const startedAt = new Date().toISOString()
let currentStage = 'initializing'
let currentStageDetails = {}

if (typeof gateDir !== 'string' || typeof resultFile !== 'string' || typeof stopFile !== 'string' || typeof listenerFile !== 'string') {
  throw new Error('release-gate probe requires its file environment')
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const stage = (name, extra = {}) => {
  currentStage = name
  currentStageDetails = extra
  writeFileSync(resultFile, JSON.stringify({ status: 'running', probeId: 'ticket-08-g1-g6-stock-dsh', stage: name, ...extra }))
}

async function waitForFile(path, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (existsSync(path)) return
    await sleep(50)
  }
  throw new Error('timed out waiting for ' + path)
}

async function waitForPorts(ports, timeoutMs = 30_000) {
  const wanted = new Set(ports)
  const deadline = Date.now() + timeoutMs
  let last = []
  let attempts = 0
  stage('scan-start', { ports })
  while (Date.now() < deadline) {
    last = runtimeInspector.listeners()
    attempts += 1
    if (attempts % 10 === 0) stage('scan-progress', { ports: last.map(row => row.localPort) })
    if ([...wanted].every(port => last.some(row => row.localPort === port))) return last
    await sleep(100)
  }
  throw new Error('timed out waiting for listener ports ' + JSON.stringify(ports) + '; last=' + JSON.stringify(last))
}

async function waitForPortGone(port, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  let last = []
  while (Date.now() < deadline) {
    last = runtimeInspector.listeners()
    if (!last.some(row => row.localPort === port)) return last
    await sleep(100)
  }
  throw new Error('timed out waiting for listener port release ' + port + '; last=' + JSON.stringify(last))
}

function makeAgent(sessionId) {
  const session = ctx.sessions.create(sessionId, { meta: { cwd: gateDir } })
  session.append('turn/start', { turn: 1 })
  session.append('step/start', { turn: 1, step: 1 })
  const agent = { id: session.id, session, ctx, status: 'idle' }
  const agents = ctx.get('agents')
  if (agents === undefined || typeof agents.register !== 'function') throw new Error('Agent registry is unavailable')
  agentDisposers.push(agents.register(agent))
  return agent
}

function npmListenerCommand(port, readyFilePath) {
  // The real Stock DSH path is PowerShell -> local subprocess. Keep this
  // fixture deterministic; the scanner's npm -> Node ancestry control remains
  // covered by the Windows scanner suite without making npm's wrapper lifetime
  // a release-gate dependency.
  return 'node ' + JSON.stringify(listenerFile) + ' ' + port + ' ' + JSON.stringify(readyFilePath)
}

function terminalListenerCommand(port, readyFilePath) {
  const quote = value => "'" + value.replaceAll("'", "''") + "'"
  return 'Start-Process -FilePath ' + quote(process.execPath)
    + ' -ArgumentList ' + quote(listenerFile) + ',' + quote(String(port)) + ',' + quote(readyFilePath)
    + ' -WindowStyle Hidden'
}

function spawnManagedListener(port, readyFilePath) {
  const subprocess = ctx.get('subprocess')
  if (subprocess === undefined || typeof subprocess.spawn !== 'function') throw new Error('Subprocess service is unavailable')
  return subprocess.spawn({
    argv: [process.execPath, listenerFile, String(port), readyFilePath],
    cwd: gateDir,
    stdio: {
      stdin: 'ignore',
      stdout: { maxBytes: 4_096 },
      stderr: { maxBytes: 4_096 },
    },
    graceMs: 1_000,
  })
}

async function execute(agent, callId, name, argumentsValue) {
  agent.session.append('tool/call', {
    turn: 1,
    step: 1,
    callId,
    name,
    arguments: JSON.stringify(argumentsValue),
  })
  return ctx.tools.execute({
    agent,
    callId,
    name,
    arguments: argumentsValue,
    signal: new AbortController().signal,
  })
}

function rowForPort(inventory, port) {
  const row = inventory.listeners.find(candidate => candidate.port === port)
  if (row === undefined) throw new Error('missing Host inventory row for port ' + port)
  return row
}

function listenerForPort(rows, port) {
  const row = rows.find(candidate => candidate.localPort === port)
  if (row === undefined) throw new Error('missing scanner row for port ' + port)
  return row
}

async function runGate() {
  stage('run-start')
  const agentA = makeAgent('ticket-08-session-a')
  const agentB = makeAgent('ticket-08-session-b')
  stage('agents-ready')
  const foregroundA = 39101
  const foregroundB = 39102
  const backgroundPort = 39103
  const terminalPort = 39104
  const externalTargetPort = 39105
  const externalControlPort = 39106
  const ready = port => gateDir + '/ready-' + port + '.json'

  toolDisposers.push(ctx.tools.register({
    name: 'ri-gate-foreground',
    description: 'Ticket 08 foreground lifecycle fixture',
    parameters: {},
    output: { schema: { type: 'object' }, render: () => [] },
    async execute(args) {
      const proc = spawnManagedListener(args.port, args.readyFile)
      handles.set(args.port, proc)
      await waitForFile(args.readyFile)
      return { kind: 'foreground', port: args.port }
    },
  }))
  stage('tools-ready')

  toolDisposers.push(ctx.tools.register({
    name: 'ri-gate-background',
    description: 'Ticket 08 background Job lifecycle fixture',
    parameters: {},
    output: { schema: { type: 'object' }, render: () => [] },
    async execute(args, exec) {
      const jobs = ctx.get('jobs')
      if (jobs === undefined) throw new Error('Job service is unavailable')
      const jobId = jobs.start({
        kind: 'ri-gate-background',
        label: 'ticket-08 background listener',
        owner: exec.agent,
        run: () => {
          const proc = spawnManagedListener(args.port, args.readyFile)
          handles.set(args.port, proc)
          return {
            cancel: () => proc.terminate(),
            done: proc.done.then(() => ({ status: 'completed' }), error => ({ status: 'failed', detail: String(error) })),
          }
        },
      })
      await waitForFile(args.readyFile)
      return { kind: 'background', jobId, port: args.port }
    },
  }))

  toolDisposers.push(ctx.tools.register({
    name: 'ri-gate-terminal',
    description: 'Ticket 08 persistent Terminal lifecycle fixture',
    parameters: {},
    output: { schema: { type: 'object' }, render: () => [] },
    async execute(args, exec) {
      const terminalService = ctx.get('terminals')
      if (terminalService === undefined) throw new Error('Terminal service is unavailable')
      stage('terminal-spawn-start')
      const created = await terminalService.spawn(exec.agent, { type: 'shell', name: 'ticket-08-terminal', cwd: gateDir })
      stage('terminal-spawned', { sessionId: created.sessionId, pid: created.pid })
      terminals.push({ owner: exec.agent, sessionId: created.sessionId })
      const operation = terminalService.startSend(exec.agent, created.sessionId, {
        text: terminalListenerCommand(args.port, args.readyFile),
        submit: true,
      })
      stage('terminal-send-started')
      await operation.done
      stage('terminal-send-done')
      await waitForFile(args.readyFile, 5_000)
      return { kind: 'terminal', terminalSessionId: created.sessionId, port: args.port }
    },
  }))

  const foregroundCommandA = npmListenerCommand(foregroundA, ready(foregroundA))
  const foregroundCommandB = npmListenerCommand(foregroundB, ready(foregroundB))
  await Promise.all([
    execute(agentA, 'ticket-08-foreground-a', 'ri-gate-foreground', { command: foregroundCommandA, port: foregroundA, readyFile: ready(foregroundA) }),
    execute(agentB, 'ticket-08-foreground-b', 'ri-gate-foreground', { command: foregroundCommandB, port: foregroundB, readyFile: ready(foregroundB) }),
  ])
  stage('foreground-ready')

  const backgroundResult = await execute(agentA, 'ticket-08-background', 'ri-gate-background', {
    command: npmListenerCommand(backgroundPort, ready(backgroundPort)),
    port: backgroundPort,
    readyFile: ready(backgroundPort),
  })
  stage('background-ready', { jobId: backgroundResult.value?.jobId ?? backgroundResult.jobId })
  const terminalResult = await execute(agentB, 'ticket-08-terminal', 'ri-gate-terminal', {
    port: terminalPort,
    readyFile: ready(terminalPort),
  })
  stage('terminal-ready', { terminalSessionId: terminalResult.value?.terminalSessionId ?? terminalResult.terminalSessionId })

  for (const [port, label] of [[externalTargetPort, 'target'], [externalControlPort, 'control']]) {
    const child = spawn(process.execPath, [listenerFile, String(port), ready(port)], { stdio: 'ignore' })
    externalProcesses.push(child)
    await waitForFile(ready(port))
    if (child.exitCode !== null) throw new Error('external ' + label + ' listener exited before inspection')
  }
  stage('external-ready')

  const initialRows = await waitForPorts([
    foregroundA,
    foregroundB,
    backgroundPort,
    terminalPort,
    externalTargetPort,
    externalControlPort,
  ], 10_000)
  stage('inventory-ready')
  const origins = runtimeInspector.origins()
  const initialByPort = Object.fromEntries([foregroundA, foregroundB, backgroundPort, terminalPort].map(port => {
    const row = listenerForPort(initialRows, port)
    assert.equal(row.confidence, 'verified', 'managed listener must be verified: ' + port)
    assert.equal(typeof row.originId, 'number')
    return [String(port), { confidence: row.confidence, originId: row.originId, ancestry: row.ancestry }]
  }))
  const originA = origins.find(origin => origin.sessionId === agentA.session.id && origin.callId === 'ticket-08-foreground-a')
  const originB = origins.find(origin => origin.sessionId === agentB.session.id && origin.callId === 'ticket-08-foreground-b')
  assert.ok(originA, 'Session A foreground origin must be retained')
  assert.ok(originB, 'Session B foreground origin must be retained')
  assert.notEqual(originA.id, originB.id, 'same-named services must retain separate origin ids')

  const portList = ctx.tools.get('port_list', agentA)
  if (portList === undefined) throw new Error('port_list tool is unavailable')
  const portListA = await portList.execute({}, { agent: agentA })
  stage('port-list-ready')
  assert.equal(portListA.readOnly, true)
  const own = portListA.listeners.find(listener => listener.localPort === foregroundA)
  const other = portListA.listeners.find(listener => listener.localPort === foregroundB)
  assert.equal(own?.ownership, 'current-session')
  assert.equal(other?.ownership, 'another-dsh-session')
  assert.equal(Object.hasOwn(other ?? {}, 'origin'), false)
  assert.equal(JSON.stringify(other ?? {}).includes(agentB.session.id), false)

  const before = runtimeInspector.host.inventory({ sort: { key: 'port', direction: 'asc' } })
  stage('host-inventory-ready')
  assert.equal(before.mode, 'observing')
  assert.equal(before.scanComplete, true)
  const jobRow = rowForPort(before, backgroundPort)
  const terminalRow = rowForPort(before, terminalPort)
  const externalTargetRow = rowForPort(before, externalTargetPort)
  const externalControlRow = rowForPort(before, externalControlPort)
  assert.equal(jobRow.action.kind, 'managed-shutdown')
  assert.equal(jobRow.lifecycleOwner?.kind, 'job')
  assert.equal(terminalRow.action.kind, 'managed-shutdown')
  assert.equal(terminalRow.lifecycleOwner?.kind, 'terminal')
  assert.equal(externalTargetRow.action.kind, 'external-single-pid')
  assert.equal(externalControlRow.action.kind, 'external-single-pid')

  const jobAction = await runtimeInspector.host.performAction({ listenerId: jobRow.listenerId, kind: 'managed-shutdown', confirmed: true })
  stage('job-action-ready', { ok: jobAction.ok, portReleased: jobAction.portReleased })
  assert.equal(jobAction.ok, true)
  assert.equal(jobAction.portReleased, true)
  await waitForPortGone(backgroundPort)
  assert.equal(runtimeInspector.host.inventory().listeners.some(row => row.port === foregroundB), true)

  const terminalAction = await runtimeInspector.host.performAction({ listenerId: terminalRow.listenerId, kind: 'managed-shutdown', confirmed: true })
  stage('terminal-action-ready', { ok: terminalAction.ok, portReleased: terminalAction.portReleased })
  assert.equal(terminalAction.ok, true)
  assert.equal(terminalAction.portReleased, true)
  await waitForPortGone(terminalPort)

  const externalAction = await runtimeInspector.host.performAction({ listenerId: externalTargetRow.listenerId, kind: 'external-single-pid', confirmed: true })
  stage('external-action-ready', { action: externalAction })
  assert.equal(externalAction.ok, true)
  assert.equal(externalAction.portReleased, true)
  await waitForPortGone(externalTargetPort)
  assert.equal(runtimeInspector.host.inventory().listeners.some(row => row.port === externalControlPort), true)

  const finalRows = runtimeInspector.listeners()
  assert.equal(finalRows.some(row => row.localPort === foregroundA), true)
  assert.equal(finalRows.some(row => row.localPort === foregroundB), true)
  assert.equal(finalRows.some(row => row.localPort === backgroundPort), false)
  assert.equal(finalRows.some(row => row.localPort === terminalPort), false)
  assert.equal(finalRows.some(row => row.localPort === externalTargetPort), false)
  assert.equal(finalRows.some(row => row.localPort === externalControlPort), true)

  return {
    status: 'passed',
    probeId: 'ticket-08-g1-g6-stock-dsh',
    acceptanceSurface: 'Bundle restart -> two Session Tool Calls -> OS listener attribution -> managed/external action -> fresh scan',
    startedAt,
    finishedAt: new Date().toISOString(),
    gates: {
      G1: { coverage: 'yes', verifier: 'Stock DSH supported Bundle health and unload smoke' },
      G2: { coverage: 'yes', verifier: 'two foreground plus one background Tool Call with OS listener rows' },
      G3: { coverage: 'yes', verifier: 'PowerShell -> Node listener rows with verified ancestry and distinct same-named Session origins; npm -> Node ancestry control is covered by the Windows scanner suite' },
      G4: { coverage: 'yes', verifier: 'owner-fenced Job and Terminal actions with complete post-action scans' },
      G5: { coverage: 'yes', verifier: 'port_list privacy plus Host action-state and redacted boundary inspection' },
      G6: { coverage: 'yes', verifier: 'two-Session workflow with selected managed/external closure and unaffected controls' },
    },
    observations: {
      health: runtimeInspector.health,
      originCount: origins.length,
      initialByPort,
      initialPorts: initialRows.map(row => row.localPort),
      finalPorts: finalRows.map(row => row.localPort),
      backgroundJobId: backgroundResult.value?.jobId ?? backgroundResult.jobId,
      terminalSessionId: terminalResult.value?.terminalSessionId ?? terminalResult.terminalSessionId,
      externalTargetPid: externalTargetRow.pid,
      externalControlPid: externalControlRow.pid,
      portListOwnOwnership: own?.ownership,
      portListOtherOwnership: other?.ownership,
    },
  }
}

async function cleanup() {
  for (const terminal of terminals.splice(0)) {
    try { await ctx.get('terminals')?.kill(terminal.owner, terminal.sessionId, 'Ticket 08 fixture cleanup') } catch {}
  }
  for (const proc of handles.values()) {
    try { proc.terminate() } catch {}
  }
  handles.clear()
  for (const child of externalProcesses.splice(0)) {
    try { child.kill() } catch {}
  }
  for (const dispose of toolDisposers.splice(0)) {
    try { dispose() } catch {}
  }
  for (const dispose of agentDisposers.splice(0)) {
    try { dispose() } catch {}
  }
}

async function startProbe() {
  try {
    const result = await runGate()
    writeFileSync(resultFile, JSON.stringify(result))
  } catch (error) {
    let diagnostics = {}
    try { diagnostics = { stage: currentStage, stageDetails: currentStageDetails, health: runtimeInspector.health, origins: runtimeInspector.origins() } } catch {}
    writeFileSync(resultFile, JSON.stringify({
      status: 'failed',
      probeId: 'ticket-08-g1-g6-stock-dsh',
      error: String(error),
      diagnostics,
    }))
  }
  const heartbeat = setInterval(() => {
    if (existsSync(stopFile)) {
      clearInterval(heartbeat)
      void cleanup().finally(() => process.emit('SIGTERM'))
    }
  }, 50)
}

export function apply(context) {
  ctx = context
  runtimeInspector = context.runtimeInspector
  stage('applied')
  context.effect(() => () => cleanup(), 'ticket-08 release-gate fixture cleanup')
  void startProbe()
}
`

async function waitForResult(path, child, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs
  let last
  while (Date.now() < deadline) {
    try {
      last = JSON.parse(await readFile(path, 'utf8'))
      if (last.status === 'passed' || last.status === 'failed') return last
    } catch {
      // The probe may still be writing its first complete JSON snapshot.
    }
    if (child.exitCode !== null) {
      throw new Error('Stock DSH child exited before publishing a release-gate result: ' + child.exitCode)
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error('timed out waiting for Ticket 08 release-gate result: ' + JSON.stringify(last))
}

async function runStockDshReleaseGate() {
  const home = await mkdtemp(join(tmpdir(), 'dsh-port-inspector-gate-'))
  const gateDir = await mkdtemp(join(tmpdir(), 'dsh-port-inspector-gate-work-'))
  const profile = join(home, 'profiles', 'inspector')
  const installed = join(profile, 'node_modules', 'dsh-port-inspector')
  const resultFile = join(gateDir, 'release-gate-result.json')
  const stopFile = join(gateDir, 'release-gate-stop')
  const listenerFile = join(gateDir, 'listener.mjs')
  const probeFile = join(gateDir, 'probe.mjs')

  await mkdir(join(profile, 'node_modules'), { recursive: true })
  await mkdir(installed, { recursive: true })
  await writeFile(listenerFile, LISTENER_SOURCE)
  await writeFile(probeFile, PROBE_SOURCE)

  const koffiSource = join(dshRoot, 'node_modules', '.pnpm', 'koffi@3.1.1', 'node_modules', 'koffi')
  const koffiNativeSource = join(dshRoot, 'node_modules', '.pnpm', '@koromix+koffi-win32-x64@3.1.1', 'node_modules', '@koromix', 'koffi-win32-x64')
  assert.equal(await readFile(join(koffiSource, 'package.json'), 'utf8').then(() => true).catch(() => false), true, 'Stock DSH koffi package is required')
  assert.equal(await readFile(join(koffiNativeSource, 'package.json'), 'utf8').then(() => true).catch(() => false), true, 'Stock DSH native koffi package is required')
  await cp(koffiSource, join(profile, 'node_modules', 'koffi'), { recursive: true })
  await mkdir(join(profile, 'node_modules', '@koromix'), { recursive: true })
  await cp(koffiNativeSource, join(profile, 'node_modules', '@koromix', 'koffi-win32-x64'), { recursive: true })
  await cp(join(repoRoot, 'package.json'), join(installed, 'package.json'))
  await cp(join(repoRoot, 'cordis.patch.yml'), join(installed, 'cordis.patch.yml'))
  await cp(join(repoRoot, 'lib'), join(installed, 'lib'), { recursive: true })
  await writeFile(join(profile, 'package.json'), JSON.stringify({
    name: 'dsh-port-inspector-release-gate-profile',
    private: true,
    dependencies: {},
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', 'dsh-port-inspector'] } },
  }, null, 2))
  await writeFile(join(profile, 'cordis.patch.yml'), [
    '- insert:',
    '    - id: pty',
    "      name: '@deepseek-ai/dsh-terminal'",
    '    - id: terminal-pwsh',
    "      name: '@deepseek-ai/dsh-terminal-bash'",
    '      config:',
    '        shellDialect: pwsh',
    '        timeoutMs: 5000',
    '    - id: port-inspector-release-gate',
    `      name: ${pathToFileURL(probeFile).href}`,
    '      inject: [runtimeInspector, sessions, tools, shell, terminals]',
    '',
  ].join('\n'))

  const child = spawn(process.execPath, [dshBin, '--profile', 'inspector'], {
    cwd: dshRoot,
    env: {
      ...process.env,
      DSH_HOME: home,
      DSH_TELEMETRY_DISABLED: '1',
      RI_GATE_DIR: gateDir,
      RI_GATE_RESULT: resultFile,
      RI_GATE_STOP: stopFile,
      RI_GATE_LISTENER: listenerFile,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  child.stdout?.on('data', chunk => { stdout += String(chunk) })
  child.stderr?.on('data', chunk => { stderr += String(chunk) })
  try {
    let result
    try {
      result = await waitForResult(resultFile, child)
    } catch (error) {
      throw new Error(`${error instanceof Error ? error.message : String(error)}; stdout=${stdout}; stderr=${stderr}`)
    }
    if (result.status !== 'passed') {
      throw new Error(`Ticket 08 release gate failed: ${JSON.stringify(result)}; stdout=${stdout}; stderr=${stderr}`)
    }
    await writeFile(stopFile, 'stop')
    const exitCode = await new Promise(resolve => child.once('exit', code => resolve(code)))
    assert.equal(exitCode, 0, `${stdout}\n${stderr}`)
    return result
  } finally {
    if (child.exitCode === null) child.kill()
    await rm(home, { recursive: true, force: true })
    await rm(gateDir, { recursive: true, force: true })
  }
}

test('Ticket 08 Stock DSH G1-G6 release gate', {
  skip: !canRunStockDsh,
  timeout: 120_000,
}, async () => {
  const result = await runStockDshReleaseGate()
  assert.deepEqual(Object.keys(result.gates).sort(), ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'])
  assert.equal(Object.values(result.gates).every(gate => gate.coverage === 'yes'), true)
  assert.equal(result.observations.portListOwnOwnership, 'current-session')
  assert.equal(result.observations.portListOtherOwnership, 'another-dsh-session')
})
