import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(new URL('../src/client/panel.ts', import.meta.url), 'utf8')
const slotsSource = await readFile(new URL('../src/client/slots.ts', import.meta.url), 'utf8')
const stylesSource = await readFile(new URL('../src/client/styles.ts', import.meta.url), 'utf8')
const logoSource = await readFile(new URL('../src/client/toolchain-logos.ts', import.meta.url), 'utf8').catch(() => '')

test('Runtime Inspector panel exposes semantic stable controls and all required state labels', () => {
  for (const locator of [
    'data-runtime-inspector-entry',
    'data-runtime-inspector-panel',
    'data-runtime-inspector-refresh',
    'data-runtime-inspector-select',
    'data-runtime-inspector-copy',
    'data-runtime-inspector-open-directory',
    'data-runtime-inspector-confirm',
    'data-runtime-inspector-action-result',
  ]) {
    assert.match(source, new RegExp(locator))
  }
  assert.match(source, /data-runtime-inspector-state': 'loading'/)
  assert.match(source, /data-runtime-inspector-state': 'empty'/)
  assert.match(source, /data-runtime-inspector-state': 'failure'/)
  assert.match(source, /snapshot\.scanComplete/)
  assert.match(source, /state\.postAction === true \? 'post-action' : 'result'/)
  assert.match(source, /data-runtime-inspector-confirmation/)
  assert.match(slotsSource, /sidebar\.footer\.action/)
  assert.match(slotsSource, /shell\.overlay/)
  assert.match(source, /观察模式/)
  assert.match(source, /来源追踪暂不可用/)
  assert.match(source, /可处理项仍会基于进程身份独立校验/)
  assert.doesNotMatch(source, /来源追踪暂不可用，当前仅可查看/)
  assert.match(source, /DSH 来源已确认/)
  assert.match(source, /来源未确认/)
  assert.match(source, /停止 DSH 任务/)
  assert.match(source, /结束该进程/)
  assert.match(source, /仅可查看/)
  assert.match(source, /本会话已确认/)
  assert.match(source, /Session/)
  assert.match(source, /用户请求/)
  assert.match(source, /Call ID/)
  assert.match(source, /formatProcessCreatedAt\(row\.processCreatedAt\)/)
  assert.match(source, /currentSessionId: sessionContext\.sessionId/)
  assert.match(source, /row\.confidence === 'verified' && row\.sessionVisibility === 'current-session'/)
  assert.match(source, /result\.ok && result\.copied/)
  assert.match(source, /剪贴板不可用/)
  assert.match(source, /当前环境不支持打开项目目录/)
})

test('development surface prioritizes current-project listeners with a calm selected state', () => {
  assert.match(source, /开发端口/)
  assert.match(source, /当前项目/)
  assert.match(source, /row\.development\.group === 'current-project'/)
  assert.match(source, /data-runtime-inspector-group/)
  assert.match(stylesSource, /box-shadow:\s*inset 3px 0 0 var\(--dsh-ri-accent\)/)
  assert.match(stylesSource, /\.dsh-ri-row-button\.is-selected \.dsh-ri-port/)
  assert.doesNotMatch(stylesSource, /\.dsh-ri-row-button\.is-selected\s*\{[^}]*border-color:\s*color-mix/su)
})

test('development surface groups environments and keeps other listeners searchable and expandable', () => {
  assert.match(source, /开发环境/)
  assert.match(source, /其他监听/)
  assert.match(source, /全部监听/)
  assert.match(source, /已收起/)
  assert.match(source, /data-runtime-inspector-scope/)
  assert.match(source, /data-runtime-inspector-other-toggle/)
  assert.match(source, /row\.development\.group === 'development-environment'/)
  assert.match(source, /row\.development\.group === 'other'/)
  assert.match(source, /search\.trim\(\)\.length > 0/)
})

test('toolchain logos are bundled locally for compact rows and details', () => {
  assert.match(source, /ToolchainLogo/)
  assert.match(source, /size: 'compact'/)
  assert.match(source, /size: 'detail'/)
  assert.match(logoSource, /vite/)
  assert.match(logoSource, /nextjs/)
  assert.match(logoSource, /nodejs/)
  assert.doesNotMatch(logoSource, /https?:\/\//)
  assert.match(stylesSource, /\.dsh-ri-toolchain-logo/)
})

test('other listeners can be pinned without changing Host authority or development counts', () => {
  assert.match(source, /固定显示/)
  assert.match(source, /data-runtime-inspector-pin/)
  assert.match(source, /row\.development\.stableKey/)
  assert.match(source, /loadPinnedListenerKeys/)
  assert.match(source, /savePinnedListenerKeys/)
  assert.match(source, /developmentCount = allRows\.filter\(row => row\.development\.group !== 'other'\)\.length/)
})
