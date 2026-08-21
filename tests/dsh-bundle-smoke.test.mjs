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
const canRunStockDsh = dshBin !== undefined && dshRoot !== undefined

async function waitForFile(path, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      await readFile(path)
      return
    } catch {
      await new Promise(resolve => setTimeout(resolve, 25))
    }
  }
  throw new Error(`timed out waiting for ${path}`)
}

async function waitForObservingHealth(path, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs
  let last
  while (Date.now() < deadline) {
    try {
      last = JSON.parse(await readFile(path, 'utf8'))
      if (last.mode === 'observing') return last
    } catch {
      // The probe has not published its first snapshot yet.
    }
    await new Promise(resolve => setTimeout(resolve, 25))
  }
  throw new Error(`timed out waiting for observing health: ${JSON.stringify(last)}`)
}

async function waitForOrigins(path, healthPath, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs
  let last
  while (Date.now() < deadline) {
    try {
      const raw = await readFile(path, 'utf8')
      try {
        last = JSON.parse(raw)
        if (Array.isArray(last) && last.length > 0) return last
      } catch {
        for (const line of raw.trim().split('\n').reverse()) {
          try {
            last = JSON.parse(line)
            if (Array.isArray(last) && last.length > 0) return last
          } catch {
            // The probe may be midway through an append.
          }
        }
      }
    } catch {
      // The delayed probe has not spawned its process yet.
    }
    try {
      last = JSON.parse(await readFile(healthPath, 'utf8')).origins
      if (Array.isArray(last) && last.length > 0) return last
    } catch {
      // The heartbeat has not published an origin snapshot yet.
    }
    await new Promise(resolve => setTimeout(resolve, 25))
  }
  throw new Error(`timed out waiting for process origins: ${JSON.stringify(last)}`)
}

async function runProfileOnce({ dshRoot, dshBin, home, healthFile, originsFile, stopFile, disposedFile, sentinel }) {
  const child = spawn(process.execPath, [dshBin, '--profile', 'inspector'], {
    cwd: dshRoot,
    env: {
      ...process.env,
      DSH_HOME: home,
      DSH_TELEMETRY_DISABLED: '1',
      RI_HEALTH_FILE: healthFile,
      RI_ORIGINS_FILE: originsFile,
      RI_STOP_FILE: stopFile,
      RI_DISPOSED_FILE: disposedFile,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  child.stdout?.on('data', chunk => { stdout += String(chunk) })
  child.stderr?.on('data', chunk => { stderr += String(chunk) })
  try {
    let health
    try {
      health = await waitForObservingHealth(healthFile)
    } catch (error) {
      throw new Error(`${error instanceof Error ? error.message : String(error)}; stdout=${stdout}; stderr=${stderr}`)
    }
    assert.equal(health.mode, 'observing', `${JSON.stringify(health)}\n${stdout}\n${stderr}`)
    assert.equal(health.verifiedAttributionEnabled, true)
    assert.equal(health.terminationEnabled, true)
    assert.equal(health.observerContractAvailable, true)
    let origins
    try {
      origins = await waitForOrigins(originsFile, healthFile)
    } catch (error) {
      const originsSnapshot = await readFile(originsFile, 'utf8').catch(() => '<no origins file>')
      throw new Error(`${error instanceof Error ? error.message : String(error)}; origins=${originsSnapshot}; stdout=${stdout}; dsh-stderr=${stderr}`)
    }
    assert.equal(origins[0].rootPid > 0, true)
    assert.equal(typeof origins[0].processCreatedAt, 'string')
    assert.equal(origins[0].callId, 'ri-root-pid-probe')
    assert.equal(origins[0].tool, 'ri-probe')
    assert.match(origins[0].command, /--token \[REDACTED\]/)

    await writeFile(stopFile, 'stop')
    const exitCode = await new Promise(resolve => child.once('exit', code => resolve(code)))
    assert.equal(exitCode, 0, `${stdout}\n${stderr}`)
    await waitForFile(disposedFile)
    assert.equal(sentinel.exitCode, null, 'Bundle disposal must not terminate an unrelated process')
  } finally {
    if (child.exitCode === null) child.kill()
  }
}

test('real Stock DSH loads the Bundle and disposes it without process ownership', {
  skip: !canRunStockDsh,
}, async () => {
  const home = await mkdtemp(join(tmpdir(), 'dsh-runtime-inspector-'))
  const resultDir = await mkdtemp(join(tmpdir(), 'dsh-runtime-inspector-result-'))
  const profile = join(home, 'profiles', 'inspector')
  const installed = join(profile, 'node_modules', 'dsh-runtime-inspector')
  const healthFile = join(home, 'health.json')
  const originsFile = join(resultDir, 'origins.json')
  const stopFile = join(home, 'stop')
  const disposedFile = join(home, 'disposed')
  const probeFile = join(home, 'probe.mjs')

  try {
    await mkdir(join(profile, 'node_modules'), { recursive: true })
    await mkdir(installed, { recursive: true })
    const koffiSource = join(dshRoot, 'node_modules', '.pnpm', 'koffi@3.1.1', 'node_modules', 'koffi')
    if (await readFile(join(koffiSource, 'package.json'), 'utf8').catch(() => undefined) === undefined) {
      throw new Error(`Stock DSH smoke requires the declared koffi dependency at ${koffiSource}`)
    }
    await cp(koffiSource, join(profile, 'node_modules', 'koffi'), { recursive: true })
    const koffiNativeSource = join(dshRoot, 'node_modules', '.pnpm', '@koromix+koffi-win32-x64@3.1.1', 'node_modules', '@koromix', 'koffi-win32-x64')
    if (await readFile(join(koffiNativeSource, 'package.json'), 'utf8').catch(() => undefined) === undefined) {
      throw new Error(`Stock DSH smoke requires the declared Koffi native package at ${koffiNativeSource}`)
    }
    await mkdir(join(profile, 'node_modules', '@koromix'), { recursive: true })
    await cp(koffiNativeSource, join(profile, 'node_modules', '@koromix', 'koffi-win32-x64'), { recursive: true })
    await cp(join(repoRoot, 'package.json'), join(installed, 'package.json'))
    await cp(join(repoRoot, 'cordis.patch.yml'), join(installed, 'cordis.patch.yml'))
    await cp(join(repoRoot, 'lib'), join(installed, 'lib'), { recursive: true })
    await writeFile(join(profile, 'package.json'), JSON.stringify({
      name: 'dsh-runtime-inspector-profile',
      private: true,
      dependencies: {},
      dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', 'dsh-runtime-inspector'] } },
    }, null, 2))
    await writeFile(join(profile, 'cordis.patch.yml'), [
      '- insert:',
      '    - id: runtime-inspector-probe',
      `      name: ${pathToFileURL(probeFile).href}`,
      '      inject: [runtimeInspector, sessions, tools, shell]',
      '',
    ].join('\n'))
    await writeFile(probeFile, [
      "import { existsSync, writeFileSync } from 'node:fs'",
      "export const name = 'runtime-inspector-probe'",
      "export const inject = ['runtimeInspector', 'sessions', 'tools', 'shell']",
      'let retainedOrigins = []',
      'export function apply(ctx) {',
      "  const probeSession = ctx.sessions.create('smoke-session', { meta: { cwd: process.cwd() } })",
      "  const probeAgent = { id: probeSession.id, session: probeSession, ctx }",
      "  probeSession.append('turn/start', { turn: 1 })",
      "  probeSession.append('step/start', { turn: 1, step: 1 })",
      "  ctx.tools.register({ name: 'ri-probe', description: 'runtime inspector smoke probe', parameters: {}, output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] }, async execute() {",
      "    try {",
      "      const shellProcess = ctx.shell.start(ctx.shell.resolve({ command: 'Start-Sleep -Seconds 30', workdir: globalThis.process.cwd() }))",
      "      let originTimer",
      "      const publishOrigins = () => { try { const originSnapshot = ctx.runtimeInspector.origins(); if (originSnapshot.length > 0) { retainedOrigins = originSnapshot; writeFileSync(globalThis.process.env.RI_ORIGINS_FILE, JSON.stringify(originSnapshot)) } } catch { if (originTimer !== undefined) clearInterval(originTimer) } }",
      "      publishOrigins()",
      "      originTimer = setInterval(publishOrigins, 25)",
      "      setTimeout(() => { clearInterval(originTimer); try { shellProcess.kill() } catch {} }, 1_500)",
      "    } catch {}",
      "    return 'ok'",
      '  } })',
      "  const probeTimer = setTimeout(() => { probeSession.append('tool/call', { turn: 1, step: 1, callId: 'ri-root-pid-probe', name: 'ri-probe', arguments: JSON.stringify({ command: 'node --token top-secret', workdir: process.cwd() }) }); void ctx.tools.execute({ agent: probeAgent, callId: 'ri-root-pid-probe', name: 'ri-probe', arguments: { command: 'node --token top-secret', workdir: process.cwd() }, signal: new AbortController().signal }) }, 250)",
      '  const heartbeat = setInterval(() => {',
      '    const origins = ctx.runtimeInspector.origins()',
      '    if (origins.length > 0) retainedOrigins = origins',
      '    writeFileSync(process.env.RI_HEALTH_FILE, JSON.stringify({ ...ctx.runtimeInspector.health, origins: retainedOrigins }))',
      '    if (retainedOrigins.length > 0) writeFileSync(process.env.RI_ORIGINS_FILE, JSON.stringify(retainedOrigins))',
      '    if (existsSync(process.env.RI_STOP_FILE)) process.emit(\'SIGTERM\')',
      '  }, 25)',
      '  ctx.effect(() => () => {',
      '    clearInterval(heartbeat)',
      '    clearTimeout(probeTimer)',
      '    writeFileSync(process.env.RI_DISPOSED_FILE, \'disposed\')',
      '  })',
      '}',
      '',
    ].join('\n'))

    const sentinel = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
      stdio: 'ignore',
    })

    try {
      const run = { dshRoot, dshBin, home, healthFile, originsFile, stopFile, disposedFile, sentinel }
      await runProfileOnce(run)
      await rm(stopFile, { force: true })
      await rm(disposedFile, { force: true })
      await rm(healthFile, { force: true })
      const updatedManifest = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'))
      updatedManifest.version = '0.1.0-smoke-update'
      await writeFile(join(installed, 'package.json'), JSON.stringify(updatedManifest, null, 2))
      await runProfileOnce(run)
    } finally {
      if (sentinel.exitCode === null) {
        sentinel.kill()
        await new Promise(resolve => sentinel.once('exit', resolve))
      }
    }
  } finally {
    await rm(home, { recursive: true, force: true })
    await rm(resultDir, { recursive: true, force: true })
  }
})
