import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import test from 'node:test'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const dshRoot = process.env.DSH_REPO
const dshPackageRoot = process.env.DSH_PACKAGE_ROOT ?? dshRoot
const dshBin = process.env.DSH_BIN ?? (dshRoot === undefined ? undefined : join(dshRoot, 'apps', 'cli', 'lib', 'bin.js'))
const dshCwd = process.env.DSH_CWD ?? dshPackageRoot
const playwrightAnchor = process.env.DSH_PLAYWRIGHT_ANCHOR
  ?? (dshRoot === undefined ? undefined : join(dshRoot, 'apps', 'web', 'package.json'))
const enabled = process.env.DSH_WEB_E2E === '1'
const canRunStockDshWeb = enabled && dshPackageRoot !== undefined && dshBin !== undefined

const WEB_FIXTURE_LISTENER_SOURCE = `
import net from 'node:net'
import { writeFileSync } from 'node:fs'

const readyFile = process.argv[2]
const server = net.createServer(socket => socket.end())
server.listen(0, '127.0.0.1', () => writeFileSync(readyFile, JSON.stringify({ pid: process.pid, port: server.address().port })))
setInterval(() => {}, 1_000)
`

const WEB_FIXTURE_SOURCE = `
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

export const name = 'runtime-inspector-web-fixture'
export const inject = ['runtimeInspector', 'sessions', 'tools']

const fixtureDir = process.env.RI_WEB_FIXTURE_DIR
const listenerFile = process.env.RI_WEB_LISTENER_FILE
const readyFile = process.env.RI_WEB_READY_FILE
const resultFile = process.env.RI_WEB_RESULT_FILE
const sessionId = 'runtime-inspector-web-session'
const sessionTitle = '本地服务调试'
const userRequest = '请在当前项目启动一个本地 HTTP 服务，监听 127.0.0.1:4173，并保持运行。'
const callId = 'runtime-inspector-web-call'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
async function waitForFile(path) {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'))
    await sleep(50)
  }
  throw new Error('timed out waiting for ' + path)
}

export function apply(ctx) {
  let handle
  let disposeAgent
  const disposeTool = ctx.tools.register({
    name: 'runtime-inspector-web-listener',
    description: 'Real Stock DSH Web attribution fixture',
    parameters: {},
    output: { schema: { type: 'object' }, render: () => [] },
    async execute() {
      const subprocess = ctx.get('subprocess')
      if (subprocess === undefined || typeof subprocess.spawn !== 'function') throw new Error('subprocess unavailable')
      handle = subprocess.spawn({
        argv: [process.execPath, listenerFile, readyFile],
        cwd: fixtureDir,
        stdio: { stdin: 'ignore', stdout: { maxBytes: 4096 }, stderr: { maxBytes: 4096 } },
        graceMs: 1000,
      })
      const ready = await waitForFile(readyFile)
      return { port: ready.port }
    },
  })

  void (async () => {
    const session = ctx.sessions.create(sessionId, { meta: { cwd: fixtureDir } })
    session.append('user/message', {
      id: 'runtime-inspector-web-message',
      content: [{ type: 'text', text: userRequest }],
      source: { kind: 'user' },
    }, { surfaceOp: 'append' })
    session.append('session/title', { title: sessionTitle, messageSeqs: [], source: { kind: 'user' } })
    session.append('turn/start', { turn: 1 })
    session.append('step/start', { turn: 1, step: 1 })
    const agent = { id: session.id, session, ctx, status: 'idle' }
    const agents = ctx.get('agents')
    if (agents === undefined || typeof agents.register !== 'function') throw new Error('agents unavailable')
    disposeAgent = agents.register(agent)
    session.append('tool/call', {
      turn: 1,
      step: 1,
      callId,
      name: 'runtime-inspector-web-listener',
      arguments: '{}',
    })
    await ctx.tools.execute({
      agent,
      callId,
      name: 'runtime-inspector-web-listener',
      arguments: {},
      signal: new AbortController().signal,
    })
    const ready = await waitForFile(readyFile)
    writeFileSync(resultFile, JSON.stringify({ sessionId, sessionTitle, userRequest, callId, port: ready.port }))
  })().catch(error => writeFileSync(resultFile, JSON.stringify({ error: String(error?.stack ?? error) })))

  ctx.effect(() => () => {
    try { handle?.terminate() } catch {}
    try { disposeAgent?.() } catch {}
    try { disposeTool() } catch {}
  })
}
`

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

async function waitForJson(path, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  let lastError
  while (Date.now() < deadline) {
    try {
      return JSON.parse(await readFile(path, 'utf8'))
    } catch (error) {
      lastError = error
      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }
  throw new Error(`timed out waiting for ${path}: ${String(lastError)}`)
}

async function stagePlugin(profile, installed) {
  await mkdir(join(profile, 'node_modules'), { recursive: true })
  await mkdir(installed, { recursive: true })
  await cp(join(repoRoot, 'package.json'), join(installed, 'package.json'))
  await cp(join(repoRoot, 'cordis.patch.yml'), join(installed, 'cordis.patch.yml'))
  await cp(join(repoRoot, 'lib'), join(installed, 'lib'), { recursive: true })

  // The stock DSH profile resolves native koffi from the profile dependency
  // boundary during this out-of-tree Bundle smoke, just like the Host smoke.
  const packagedKoffi = join(dshPackageRoot, 'node_modules', 'koffi')
  const packagedKoffiNative = join(dshPackageRoot, 'node_modules', '@koromix', 'koffi-win32-x64')
  const koffiSource = await readFile(join(packagedKoffi, 'package.json')).then(() => packagedKoffi, () => join(dshPackageRoot, 'node_modules', '.pnpm', 'koffi@3.1.1', 'node_modules', 'koffi'))
  const koffiNativeSource = await readFile(join(packagedKoffiNative, 'package.json')).then(() => packagedKoffiNative, () => join(
    dshPackageRoot, 'node_modules', '.pnpm', '@koromix+koffi-win32-x64@3.1.1', 'node_modules', '@koromix', 'koffi-win32-x64',
  ))
  assert.equal(await readFile(join(koffiSource, 'package.json')).then(() => true, () => false), true)
  assert.equal(await readFile(join(koffiNativeSource, 'package.json')).then(() => true, () => false), true)
  await cp(koffiSource, join(profile, 'node_modules', 'koffi'), { recursive: true })
  await mkdir(join(profile, 'node_modules', '@koromix'), { recursive: true })
  await cp(koffiNativeSource, join(profile, 'node_modules', '@koromix', 'koffi-win32-x64'), { recursive: true })
}

async function startListener(executable = process.execPath) {
  const child = spawn(executable, ['-e', [
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
    const fixtureDir = join(home, 'fixture-project')
    const fixtureFile = join(home, 'runtime-inspector-web-fixture.mjs')
    const fixtureListenerFile = join(home, 'runtime-inspector-web-listener.mjs')
    const fixtureReadyFile = join(home, 'runtime-inspector-web-listener-ready.json')
    const fixtureResultFile = join(home, 'runtime-inspector-web-fixture-result.json')
    const externalListenerExecutable = join(home, 'external-listener.exe')
    await mkdir(fixtureDir, { recursive: true })
    await writeFile(fixtureFile, WEB_FIXTURE_SOURCE)
    await writeFile(fixtureListenerFile, WEB_FIXTURE_LISTENER_SOURCE)
    await writeFile(join(profile, 'package.json'), JSON.stringify({
      name: 'dsh-runtime-inspector-web-profile',
      private: true,
      dependencies: {},
      dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dsh-runtime-inspector'] } },
    }, null, 2))
    await writeFile(join(profile, 'cordis.patch.yml'), [
      '- insert:',
      '    - id: runtime-inspector-web-fixture',
      `      name: ${pathToFileURL(fixtureFile).href}`,
      '      inject: [runtimeInspector, sessions, tools]',
      '',
    ].join('\n'))

    await cp(process.execPath, externalListenerExecutable)
    listener = await startListener(externalListenerExecutable)
    dsh = spawn(process.execPath, [dshBin, '--profile', 'inspector', '--no-open', '--port', '0'], {
      cwd: dshCwd,
      env: {
        ...process.env,
        DSH_HOME: home,
        DSH_TELEMETRY_DISABLED: '1',
        RI_WEB_FIXTURE_DIR: fixtureDir,
        RI_WEB_LISTENER_FILE: fixtureListenerFile,
        RI_WEB_READY_FILE: fixtureReadyFile,
        RI_WEB_RESULT_FILE: fixtureResultFile,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const { match: urlMatch } = await waitForOutput(dsh, /dsh web: (http:\/\/127\.0\.0\.1:\d+)/)
    const baseUrl = urlMatch[1]
    const fixture = await waitForJson(fixtureResultFile)
    assert.equal(fixture.error, undefined, fixture.error)
    const attributedResponse = await fetch(`${baseUrl}/api/dsh-runtime-inspector/inventory`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ currentSessionId: fixture.sessionId }),
    })
    assert.equal(attributedResponse.status, 200)
    const attributedInventory = await attributedResponse.json()
    assert.equal(attributedInventory.mode, 'observing')
    const attributedRow = attributedInventory.listeners.find(candidate => candidate.port === fixture.port)
    assert.equal(attributedRow?.confidence, 'verified')
    assert.equal(attributedRow?.sessionVisibility, 'current-session')
    assert.equal(attributedRow?.session?.callId, fixture.callId)
    assert.equal(attributedRow?.project, fixtureDir)

    const dshRequire = createRequire(playwrightAnchor ?? join(dshPackageRoot, 'package.json'))
    const { chromium } = dshRequire('playwright')
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
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
    const artifactText = await artifact.text()
    assert.match(artifactText, /window\.__ModuleLoader__\.load/)
    assert.doesNotMatch(artifactText, /https:\/\/(?:vite\.dev|nextjs\.org|nodejs\.org)/)

    const panelEntry = page.locator('[data-runtime-inspector-entry="open"]')
    await panelEntry.click()
    const panel = page.locator('[data-runtime-inspector-surface="panel"]')
    await panel.waitFor()
    await page.locator('[data-runtime-inspector-state="ready"], [data-runtime-inspector-state="incomplete"], [data-runtime-inspector-state="failure"]').first().waitFor()
    assert.equal(await panel.locator('[data-runtime-inspector-search="input"]').count(), 1)
    assert.equal(await panel.locator('[data-runtime-inspector-source-filter="select"]').count(), 1)
    assert.equal(await panel.locator('[data-runtime-inspector-actionable-only="toggle"]').count(), 1)
    assert.equal(await panel.locator('.dsh-ri-summary').count(), 0)
    const modalChrome = await panel.evaluate(element => {
      const panelStyle = getComputedStyle(element)
      const mask = document.querySelector('.dsh-ri-mask')
      const maskStyle = mask === null ? undefined : getComputedStyle(mask)
      const header = element.querySelector('.dsh-ri-header')
      const headerTitle = element.querySelector('.dsh-ri-header-title')
      const toolbar = element.querySelector('.dsh-ri-toolbar')
      const options = element.querySelector('.dsh-ri-options')
      const body = element.querySelector('.dsh-ri-body')
      const list = element.querySelector('.dsh-ri-list-column')
      const detail = element.querySelector('.dsh-ri-detail-column')
      const listRect = list?.getBoundingClientRect()
      const detailRect = detail?.getBoundingClientRect()
      return {
        width: panelStyle.width,
        height: panelStyle.height,
        borderRadius: panelStyle.borderRadius,
        position: panelStyle.position,
        x: element.getBoundingClientRect().x,
        navCount: element.querySelectorAll('.dsh-ri-nav').length,
        headerTitle: headerTitle?.textContent,
        headerHeight: header === null ? undefined : getComputedStyle(header).height,
        toolbarDisplay: toolbar === null ? undefined : getComputedStyle(toolbar).display,
        optionsOverflowY: options === null ? undefined : getComputedStyle(options).overflowY,
        listOverflowY: list === null ? undefined : getComputedStyle(list).overflowY,
        detailOverflowY: detail === null ? undefined : getComputedStyle(detail).overflowY,
        bodyOverflowY: body === null ? undefined : getComputedStyle(body).overflowY,
        bodyHeight: body?.getBoundingClientRect().height,
        listHeight: listRect?.height,
        detailHeight: detailRect?.height,
        toolbarOverflow: toolbar === null ? undefined : toolbar.scrollWidth - toolbar.clientWidth,
        centeredOffset: Math.abs(element.getBoundingClientRect().x - ((window.innerWidth - element.getBoundingClientRect().width) / 2)),
        maskBackdropFilter: maskStyle?.backdropFilter,
        maskBackground: maskStyle?.backgroundColor,
      }
    })
    assert.equal(modalChrome.width, '1040px')
    assert.equal(modalChrome.height, '672px')
    assert.equal(modalChrome.borderRadius, '24px')
    assert.equal(modalChrome.position, 'relative')
    assert.ok((modalChrome.centeredOffset ?? Number.POSITIVE_INFINITY) < 1, 'the modal should be centered instead of right-anchored')
    assert.equal(modalChrome.navCount, 0)
    assert.equal(modalChrome.headerTitle, 'Runtime Inspector')
    assert.equal(modalChrome.headerHeight, '54px')
    assert.equal(modalChrome.toolbarDisplay, 'grid')
    assert.equal(modalChrome.optionsOverflowY, 'hidden')
    assert.equal(modalChrome.listOverflowY, 'auto')
    assert.equal(modalChrome.detailOverflowY, 'auto')
    assert.equal(modalChrome.bodyOverflowY, 'hidden')
    assert.ok((modalChrome.toolbarOverflow ?? Number.POSITIVE_INFINITY) <= 0, 'toolbar controls should fit without horizontal overflow')
    assert.ok(Math.abs((modalChrome.listHeight ?? 0) - (modalChrome.detailHeight ?? 0)) < 1, 'list and detail columns should share a fixed viewport height')
    assert.notEqual(modalChrome.maskBackground, 'rgba(0, 0, 0, 0)')
    for (const viewportCase of [
      { width: 1440, height: 900, panelWidth: '1040px', panelHeight: '800px' },
      { width: 1024, height: 768, panelWidth: '976px', panelHeight: '720px' },
      { width: 800, height: 600, panelWidth: '752px', panelHeight: '552px' },
    ]) {
      await page.setViewportSize({ width: viewportCase.width, height: viewportCase.height })
      const responsiveChrome = await panel.evaluate(element => {
        const style = getComputedStyle(element)
        return {
          width: style.width,
          height: style.height,
          toolbarDisplay: getComputedStyle(element.querySelector('.dsh-ri-toolbar')).display,
          toolbarOverflow: element.querySelector('.dsh-ri-toolbar').scrollWidth - element.querySelector('.dsh-ri-toolbar').clientWidth,
        }
      })
      assert.deepEqual(responsiveChrome, {
        width: viewportCase.panelWidth,
        height: viewportCase.panelHeight,
        toolbarDisplay: viewportCase.width <= 960 ? 'flex' : 'grid',
        toolbarOverflow: 0,
      })
    }
    await page.setViewportSize({ width: 1280, height: 720 })
    assert.equal(await panel.locator('[data-runtime-inspector-close]').evaluate(element => document.activeElement === element), true)
    await page.keyboard.press('Escape')
    await panel.waitFor({ state: 'detached' })
    assert.equal(await panelEntry.evaluate(element => document.activeElement === element), true)
    await panelEntry.click()
    await panel.waitFor()
    await page.locator('[data-runtime-inspector-state="ready"], [data-runtime-inspector-state="incomplete"], [data-runtime-inspector-state="failure"]').first().waitFor()
    await page.locator('.dsh-ri-mask').click({ position: { x: 4, y: 4 } })
    await panel.waitFor({ state: 'detached' })
    await panelEntry.click()
    await panel.waitFor()
    await page.locator('[data-runtime-inspector-state="ready"], [data-runtime-inspector-state="incomplete"], [data-runtime-inspector-state="failure"]').first().waitFor()

    await page.waitForFunction((port) => [...document.querySelectorAll('[data-runtime-inspector-row]')]
      .some(candidate => candidate.textContent?.includes('端口 ' + String(port))), fixture.port, { timeout: 30_000 })
    const managedRow = page.locator('[data-runtime-inspector-row]').filter({ hasText: '端口 ' + String(fixture.port) }).first()
    assert.match(await managedRow.textContent(), /由 DSH 启动/)
    await managedRow.locator('[data-runtime-inspector-select]').click()
    const detail = page.locator('.dsh-ri-detail-column')
    const compactLogoSource = await managedRow.locator('.dsh-ri-toolchain-logo.is-compact').getAttribute('src')
    const detailLogoSource = await detail.locator('.dsh-ri-toolchain-logo.is-detail').getAttribute('src')
    assert.equal(compactLogoSource, detailLogoSource)
    assert.match(compactLogoSource ?? '', /^data:image\//)
    const selectedStyle = await managedRow.locator('[data-runtime-inspector-select]').evaluate(element => {
      const style = getComputedStyle(element)
      return { borderColor: style.borderColor, boxShadow: style.boxShadow }
    })
    assert.match(selectedStyle.boxShadow, /inset/)
    await managedRow.locator('[data-runtime-inspector-select]').focus()
    assert.equal(await managedRow.locator('[data-runtime-inspector-select]').evaluate(element => document.activeElement === element), true)
    await detail.getByText(fixture.callId, { exact: true }).waitFor()
    await detail.getByText(fixtureDir, { exact: true }).waitFor()
    const createdAt = await detail.locator('.dsh-ri-fact').filter({ hasText: '创建时间' }).locator('dd').textContent()
    assert.doesNotMatch(createdAt ?? '', /^\d{17,20}$/u)

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseUrl })
    const externalRow = () => page.locator('[data-runtime-inspector-row]').filter({ hasText: '端口 ' + String(listener.port) })
    assert.equal(await externalRow().count(), 0, 'an unrelated executable should be folded into other listeners by default')
    const search = panel.locator('[data-runtime-inspector-search="input"]')
    await search.fill(String(listener.port))
    await externalRow().first().waitFor()
    assert.match(await panel.textContent(), /搜索已覆盖全部监听/)
    await externalRow().first().locator('[data-runtime-inspector-pin]').click()
    await search.fill('')
    await panel.locator('[data-runtime-inspector-group="pinned"]').waitFor()
    assert.equal(await externalRow().count(), 1)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.locator('[data-runtime-inspector-entry="open"]').waitFor({ timeout: 30_000 })
    await dismissInitialOnboarding(page)
    await page.locator('[data-runtime-inspector-entry="open"]').click()
    const reloadedPanel = page.locator('[data-runtime-inspector-surface="panel"]')
    await reloadedPanel.waitFor()
    await reloadedPanel.locator('[data-runtime-inspector-group="pinned"]').waitFor({ timeout: 30_000 })
    const row = reloadedPanel.locator('[data-runtime-inspector-row]').filter({ hasText: '端口 ' + String(listener.port) }).first()
    assert.equal(await reloadedPanel.locator('[data-runtime-inspector-row]').filter({ hasText: '端口 ' + String(listener.port) }).count(), 1)
    await row.locator('[data-runtime-inspector-select]').click()
    await reloadedPanel.locator('[data-runtime-inspector-copy]').click()
    await reloadedPanel.locator('[data-runtime-inspector-state="result"]').waitFor()
    assert.match(await page.evaluate(() => navigator.clipboard.readText()), new RegExp(`Port: ${String(listener.port)}`))

    await row.locator('[data-runtime-inspector-pin]').click()
    await row.waitFor({ state: 'detached' })
    await reloadedPanel.locator('[data-runtime-inspector-search="input"]').fill(String(listener.port))
    const searchedRow = reloadedPanel.locator('[data-runtime-inspector-row]').filter({ hasText: '端口 ' + String(listener.port) }).first()
    await searchedRow.waitFor()
    await searchedRow.locator('[data-runtime-inspector-select]').click()

    await reloadedPanel.locator('[data-runtime-inspector-action="external-single-pid"]').waitFor()
    await reloadedPanel.locator('[data-runtime-inspector-action="external-single-pid"]').click()
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
