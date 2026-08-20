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

async function runProfileOnce({ dshRoot, dshBin, home, healthFile, stopFile, disposedFile, sentinel }) {
  const child = spawn(process.execPath, [dshBin, '--profile', 'inspector'], {
    cwd: dshRoot,
    env: {
      ...process.env,
      DSH_HOME: home,
      DSH_TELEMETRY_DISABLED: '1',
      RI_HEALTH_FILE: healthFile,
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
    const health = await waitForObservingHealth(healthFile)
    assert.equal(health.mode, 'observing', `${JSON.stringify(health)}\n${stdout}\n${stderr}`)
    assert.equal(health.verifiedAttributionEnabled, true)
    assert.equal(health.terminationEnabled, true)
    assert.equal(health.observerContractAvailable, true)

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
  const profile = join(home, 'profiles', 'inspector')
  const installed = join(profile, 'node_modules', 'dsh-runtime-inspector')
  const healthFile = join(home, 'health.json')
  const stopFile = join(home, 'stop')
  const disposedFile = join(home, 'disposed')
  const probeFile = join(home, 'probe.mjs')

  try {
    await mkdir(join(profile, 'node_modules'), { recursive: true })
    await mkdir(installed, { recursive: true })
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
      '      inject: [runtimeInspector]',
      '',
    ].join('\n'))
    await writeFile(probeFile, [
      "import { existsSync, writeFileSync } from 'node:fs'",
      "export const name = 'runtime-inspector-probe'",
      "export const inject = ['runtimeInspector']",
      'export function apply(ctx) {',
      '  const heartbeat = setInterval(() => {',
      '    writeFileSync(process.env.RI_HEALTH_FILE, JSON.stringify(ctx.runtimeInspector.health))',
      '    if (existsSync(process.env.RI_STOP_FILE)) process.emit(\'SIGTERM\')',
      '  }, 25)',
      '  ctx.effect(() => () => {',
      '    clearInterval(heartbeat)',
      '    writeFileSync(process.env.RI_DISPOSED_FILE, \'disposed\')',
      '  })',
      '}',
      '',
    ].join('\n'))

    const sentinel = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
      stdio: 'ignore',
    })

    try {
      const run = { dshRoot, dshBin, home, healthFile, stopFile, disposedFile, sentinel }
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
  }
})
