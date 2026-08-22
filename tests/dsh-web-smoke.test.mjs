import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const dshRoot = process.env.DSH_REPO
const dshBin = dshRoot === undefined ? undefined : join(dshRoot, 'apps', 'cli', 'lib', 'bin.js')
const enabled = process.env.DSH_WEB_E2E === '1'
const canRunStockDshWeb = enabled && dshRoot !== undefined && dshBin !== undefined

function waitForOutput(child, pattern, timeoutMs = 30_000) {
  let stdout = ''
  let stderr = ''
  let settled = false
  let timer
  const finish = (fn, value) => {
    if (settled) return
    settled = true
    clearTimeout(timer)
    child.stdout?.off('data', onStdout)
    child.stderr?.off('data', onStderr)
    child.off('exit', onExit)
    fn(value)
  }
  const onStdout = chunk => {
    stdout += String(chunk)
    const match = stdout.match(pattern)
    if (match !== null) finish(resolve, { match, stdout, stderr })
  }
  const onStderr = chunk => { stderr += String(chunk) }
  const onExit = (code, signal) => finish(reject, new Error(
    'child exited before expected output (code=' + String(code) + ', signal=' + String(signal) + ')'
    + '\nstdout=' + stdout + '\nstderr=' + stderr,
  ))
  let resolve
  let reject
  const result = new Promise((res, rej) => { resolve = res; reject = rej })
  child.stdout?.on('data', onStdout)
  child.stderr?.on('data', onStderr)
  child.on('exit', onExit)
  timer = setTimeout(() => finish(reject, new Error(
    'timed out waiting for ' + String(pattern) + '\nstdout=' + stdout + '\nstderr=' + stderr,
  )), timeoutMs)
  return result
}

function waitForExit(child, timeoutMs = 10_000) {
  if (child === undefined || child.exitCode !== null || child.signalCode !== null) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out waiting for child exit')), timeoutMs)
    child.once('exit', () => {
      clearTimeout(timer)
      resolve()
    })
  })
}

async function stagePlugin(profile, installed) {
  await mkdir(join(profile, 'node_modules'), { recursive: true })
  await mkdir(installed, { recursive: true })
  await cp(join(repoRoot, 'package.json'), join(installed, 'package.json'))
  await cp(join(repoRoot, 'cordis.patch.yml'), join(installed, 'cordis.patch.yml'))
  await cp(join(repoRoot, 'lib'), join(installed, 'lib'), { recursive: true })

  // The stock DSH profile resolves native koffi from the profile dependency
  // boundary during this out-of-tree Bundle smoke, just like the Host smoke.
  const koffiSource = join(dshRoot, 'node_modules', '.pnpm', 'koffi@3.1.1', 'node_modules', 'koffi')
  const koffiNativeSource = join(
    dshRoot,
    'node_modules',
    '.pnpm',
    '@koromix+koffi-win32-x64@3.1.1',
    'node_modules',
    '@koromix',
    'koffi-win32-x64',
  )
  assert.equal(await readFile(join(koffiSource, 'package.json')).then(() => true, () => false), true)
  assert.equal(await readFile(join(koffiNativeSource, 'package.json')).then(() => true, () => false), true)
  await cp(koffiSource, join(profile, 'node_modules', 'koffi'), { recursive: true })
  await mkdir(join(profile, 'node_modules', '@koromix'), { recursive: true })
  await cp(koffiNativeSource, join(profile, 'node_modules', '@koromix', 'koffi-win32-x64'), { recursive: true })
}

async function startListener() {
  const child = spawn(process.execPath, ['-e', [
    "const net = require('node:net')",
    'const server = net.createServer()',
    "server.listen(0, '127.0.0.1', () => console.log(server.address().port))",
    'setInterval(() => {}, 1000)',
  ].join(';')], { stdio: ['ignore', 'pipe', 'pipe'] })
  const { match } = await waitForOutput(child, /(?:^|\n)(\d+)\s*$/)
  return { child, port: Number(match[1]) }
}

async function dismissInitialOnboarding(page) {
  // A fresh Stock DSH home may paint the welcome and provider setup steps
  // after the shell/Client modules have already mounted. Dismiss only those
  // product-owned first-run steps; the inspector test must not bypass its own
  // panel or action confirmation with force clicks.
  await page.waitForTimeout(500)
  for (let attempt = 0; attempt < 4; attempt += 1) {
    let dismissed = false
    for (const name of ['继续', 'Continue', '稍后配置', 'Configure later']) {
      const button = page.getByRole('button', { name, exact: true }).first()
      if (await button.count() > 0 && await button.isVisible()) {
        await button.click()
        dismissed = true
        await page.waitForTimeout(250)
        break
      }
    }
    if (!dismissed) return
  }
}

test('real Stock DSH Web loads the Bundle, opens the panel, and rechecks an external action', {
  skip: !canRunStockDshWeb,
}, async () => {
  const home = await mkdtemp(join(tmpdir(), 'dsh-runtime-inspector-web-'))
  const profile = join(home, 'profiles', 'inspector')
  const installed = join(profile, 'node_modules', 'dsh-runtime-inspector')
  let dsh
  let listener
  let browser
  try {
    await stagePlugin(profile, installed)
    await writeFile(join(profile, 'package.json'), JSON.stringify({
      name: 'dsh-runtime-inspector-web-profile',
      private: true,
      dependencies: {},
      dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dsh-runtime-inspector'] } },
    }, null, 2))
    await writeFile(join(profile, 'cordis.patch.yml'), '[]\n')

    listener = await startListener()
    dsh = spawn(process.execPath, [dshBin, '--profile', 'inspector', '--no-open', '--port', '0'], {
      cwd: dshRoot,
      env: {
        ...process.env,
        DSH_HOME: home,
        DSH_TELEMETRY_DISABLED: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const { match: urlMatch } = await waitForOutput(dsh, /dsh web: (http:\/\/127\.0\.0\.1:\d+)/)
    const baseUrl = urlMatch[1]

    const dshRequire = createRequire(join(dshRoot, 'apps', 'web', 'package.json'))
    const { chromium } = dshRequire('playwright')
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    const pageErrors = []
    page.on('pageerror', error => pageErrors.push(String(error)))

    const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
    assert.equal(response?.status(), 200)
    await page.locator('[data-runtime-inspector-entry="open"]').waitFor({ timeout: 30_000 })
    await dismissInitialOnboarding(page)

    const boot = await page.evaluate(() => window.__DSH_BOOT__)
    const pluginEntry = boot?.entries?.find(entry => entry.id === 'dsh-runtime-inspector')
    assert.ok(pluginEntry, 'the Stock DSH boot graph must contain the inspector Browser module')
    assert.match(pluginEntry.url, /\/plugins\/dsh-runtime-inspector\/client\.js\?rev=/)
    const artifact = await page.request.get(new URL(pluginEntry.url, baseUrl).href)
    assert.equal(artifact.status(), 200)
    assert.match(await artifact.text(), /window\.__ModuleLoader__\.load/)

    const panelEntry = page.locator('[data-runtime-inspector-entry="open"]')
    await panelEntry.click()
    const panel = page.locator('[data-runtime-inspector-surface="panel"]')
    await panel.waitFor()
    await page.locator('[data-runtime-inspector-state="ready"], [data-runtime-inspector-state="incomplete"], [data-runtime-inspector-state="failure"]').first().waitFor()
    assert.equal(await panel.locator('[data-runtime-inspector-search="input"]').count(), 1)

    await page.waitForFunction((port) => {
      const row = [...document.querySelectorAll('[data-runtime-inspector-row]')]
        .find(candidate => candidate.textContent?.includes('端口 ' + String(port)))
      return row?.querySelector('[data-runtime-inspector-action="external-single-pid"]') !== null
    }, listener.port, { timeout: 30_000 })
    const row = page.locator('[data-runtime-inspector-row]').filter({ hasText: '端口 ' + String(listener.port) }).first()
    await row.locator('[data-runtime-inspector-action="external-single-pid"]').click()
    await page.locator('[data-runtime-inspector-confirmation="dialog"]').waitFor()
    const actionResponse = page.waitForResponse(responseItem => (
      responseItem.url().endsWith('/api/dsh-runtime-inspector/action')
      && responseItem.request().method() === 'POST'
    ))
    await page.locator('[data-runtime-inspector-confirm="confirm"]').click()
    const actionBody = await (await actionResponse).json()
    assert.equal(actionBody.ok, true)
    assert.equal(actionBody.action, 'external-single-pid')
    assert.equal(actionBody.port, listener.port)
    assert.equal(actionBody.portReleased, true)
    await waitForExit(listener.child)
    await page.locator('[data-runtime-inspector-state="post-action"]').waitFor()
    const webAfterAction = await fetch(baseUrl)
    assert.equal(webAfterAction.status, 200, 'the unaffected Stock DSH Web listener must remain alive')
    assert.deepEqual(pageErrors, [])
  } finally {
    await browser?.close().catch(() => {})
    if (dsh !== undefined && dsh.exitCode === null) dsh.kill()
    if (listener !== undefined && listener.child.exitCode === null) listener.child.kill()
    await waitForExit(dsh).catch(() => {})
    await waitForExit(listener?.child).catch(() => {})
    await rm(home, { recursive: true, force: true })
  }
})
