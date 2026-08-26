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
  assert.match(source, /Runtime Inspector/)
  assert.doesNotMatch(source, /观察模式/)
  assert.match(source, /data-runtime-inspector-source-filter/)
  assert.match(source, /data-runtime-inspector-actionable-only/)
  assert.match(source, /attributionValue\(row, 'agentId'\)/)
  assert.match(source, /attributionValue\(row, 'rootCallId'\)/)
  assert.match(source, /attributionValue\(row, 'command'\)/)
  assert.match(source, /attributionValue\(row, 'workdir'\)/)
  assert.match(source, /dsh-ri-source-facts/)
  assert.match(source, /currentSessionId: sessionContext\.sessionId/)
  assert.match(source, /row\.confidence === 'verified' && row\.sessionVisibility === 'current-session'/)
  assert.match(source, /result\.ok && result\.copied/)
})

test('development surface prioritizes current-project listeners with a calm selected state', () => {
  assert.match(source, /t\('scopeDevelopment'\)/)
  assert.match(source, /t\('groupCurrentProject'\)/)
  assert.match(source, /row\.development\.group === 'current-project'/)
  assert.match(source, /data-runtime-inspector-group/)
  assert.match(stylesSource, /\.dsh-ri-row-button\.is-selected\s*\{[^}]*background:\s*var\(--dsh-ri-accent-soft\)/su)
  assert.doesNotMatch(stylesSource, /box-shadow:\s*inset 3px 0 0 var\(--dsh-ri-accent\)/)
  assert.match(stylesSource, /\.dsh-ri-row-button\.is-selected \.dsh-ri-port/)
  assert.doesNotMatch(stylesSource, /\.dsh-ri-row-button\.is-selected\s*\{[^}]*border-color:\s*color-mix/su)
})

test('development surface groups environments and keeps other listeners searchable and expandable', () => {
  assert.match(source, /t\('groupDevelopmentEnvironment'\)/)
  assert.match(source, /t\('groupOther'\)/)
  assert.match(source, /t\('scopeAll'\)/)
  assert.match(source, /t\('collapsedOther'/)
  assert.match(source, /data-runtime-inspector-scope/)
  assert.match(source, /data-runtime-inspector-other-toggle/)
  assert.match(source, /row\.development\.group === 'development-environment'/)
  assert.match(source, /row\.development\.group === 'other'/)
  assert.match(source, /search\.trim\(\)\.length > 0/)
})

test('row metadata keeps action pills free of separator pseudo-elements and centers handling actions', () => {
  assert.match(stylesSource, /\.dsh-ri-row-meta > span:not\(\.dsh-ri-action-pill\) \+ span:not\(\.dsh-ri-action-pill\)::before/)
  assert.doesNotMatch(stylesSource, /\.dsh-ri-row-meta > span \+ span::before/)
  assert.match(stylesSource, /\.dsh-ri-handling-card\s*\{[^}]*align-items:\s*center/su)
})

test('approved semantic refinement keeps unknown and read-only states neutral while emphasizing external termination', () => {
  assert.match(source, /case 'unattributed': return IconQuestion/)
  assert.doesNotMatch(source, /IconEmptyLink/)
  assert.match(stylesSource, /\.dsh-ri-action-pill\.is-disabled\s*\{[^}]*color:\s*var\(--dsh-ri-label-tertiary\)[^}]*background:\s*var\(--dsh-ri-bg-muted\)/su)
  assert.match(stylesSource, /\.dsh-ri-action-pill\.is-external\s*\{[^}]*color:\s*var\(--dsh-ri-danger\)/su)
  assert.match(source, /row\.action\.kind === 'external-single-pid' \? 'dsh-ri-danger-action' : 'dsh-ri-primary-action'/)
  assert.match(source, /className: external \? 'dsh-ri-danger-action' : 'dsh-ri-primary-action'/)
  assert.doesNotMatch(stylesSource, /\.dsh-ri-handling-card\.is-disabled\s*\{/)
  assert.doesNotMatch(source, /data-runtime-inspector-action': 'unavailable'/)
})

test('approved detail refinement collapses identical listeners and uses compact truthful fallbacks', () => {
  assert.match(source, /function collapseDuplicateRows/)
  assert.match(source, /occurrenceCounts\.get\(row\.listenerId\)/)
  assert.match(source, /`×\$\{String\(occurrenceCount\)\}`/)
  assert.match(source, /label: t\('sameListener'\)/)
  assert.match(source, /wide: occurrenceCount <= 1/)
  assert.match(source, /`\$\{row\.address\}:\$\{String\(row\.port\)\}`/)
  assert.doesNotMatch(source, /function sessionLabel/)
  assert.match(source, /case 'unattributed': return '—'/)
  assert.match(source, /\?\? '—'/)
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

test('pin controls stay dormant without removing the saved pin model', () => {
  assert.match(source, /data-runtime-inspector-pin/)
  assert.match(source, /row\.development\.stableKey/)
  assert.match(source, /loadPinnedListenerKeys/)
  assert.match(source, /savePinnedListenerKeys/)
  assert.match(source, /visibleRows\.length/)
  assert.match(stylesSource, /\.dsh-ri-pin-button\s*\{[^}]*display:\s*none/su)
  assert.match(stylesSource, /\.dsh-ri-row-button\.has-pin\s*\{[^}]*padding-right:\s*10px/su)
})

test('Runtime Inspector modal follows the native DSH centered dialog chrome without a single-item nav', () => {
  for (const locator of [
    'dsh-ri-mask',
    'dsh-ri-header-title',
    'dsh-ri-content',
    'dsh-ri-options',
    'data-runtime-inspector-state',
    'panelRef',
    'closeButtonRef',
    "document.addEventListener('keydown'",
    'event.key !== \'Tab\'',
  ]) {
    assert.match(source, new RegExp(locator.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')))
  }
  assert.match(stylesSource, /\.dsh-ri-overlay\s*\{[\s\S]*?display:\s*flex[\s\S]*?align-items:\s*center[\s\S]*?justify-content:\s*center/su)
  assert.match(stylesSource, /\.dsh-ri-mask\s*\{[\s\S]*?backdrop-filter:\s*var\(--dsh-ri-mask-blur\)/su)
  assert.match(stylesSource, /\.dsh-ri-entry,\s*\.dsh-ri-overlay,\s*\.dsh-ri-panel\s*\{/su)
  assert.match(stylesSource, /\.dsh-ri-panel\s*\{[\s\S]*?width:\s*1040px[\s\S]*?height:\s*min\(800px,\s*calc\(100vh - 48px\)\)[\s\S]*?border-radius:\s*24px/su)
  assert.match(stylesSource, /\.dsh-ri-toolbar\s*\{[\s\S]*?display:\s*grid[\s\S]*?grid-template-columns:\s*minmax\(160px,\s*1fr\) repeat\(6,\s*auto\)/su)
  assert.match(stylesSource, /@media\s*\(max-width:\s*960px\)[\s\S]*?\.dsh-ri-toolbar\s*\{[\s\S]*?display:\s*flex[\s\S]*?flex-wrap:\s*wrap/su)
  assert.match(stylesSource, /--dsh-ri-shadow:\s*var\(--dsw-shadow-lv3/su)
  assert.match(stylesSource, /\.dsh-ri-header\s*\{[\s\S]*?height:\s*54px/su)
  assert.match(stylesSource, /\.dsh-ri-header-title\s*\{[\s\S]*?font-size:\s*16px/su)
  assert.doesNotMatch(source, /dsh-ri-nav/)
  assert.doesNotMatch(stylesSource, /dsh-ri-nav/)
  assert.doesNotMatch(source, /dsh-ri-summary/)
  assert.doesNotMatch(stylesSource, /dsh-ri-summary/)
  assert.doesNotMatch(source, /dsh-ri-filter-row/)
  assert.doesNotMatch(stylesSource, /dsh-ri-filter-row/)
  assert.match(stylesSource, /\.dsh-ri-options\s*\{[\s\S]*?overflow:\s*hidden/su)
  assert.match(stylesSource, /\.dsh-ri-body\s*\{[\s\S]*?flex:\s*1 1 auto[\s\S]*?min-height:\s*0[\s\S]*?overflow:\s*hidden/su)
  assert.match(stylesSource, /\.dsh-ri-list-column\s*\{[\s\S]*?overflow-y:\s*auto/su)
  assert.match(stylesSource, /\.dsh-ri-detail-column\s*\{[\s\S]*?overflow-y:\s*auto/su)
  assert.doesNotMatch(stylesSource, /\.dsh-ri-panel\s*\{[^}]*top:/su)
  assert.doesNotMatch(stylesSource, /\.dsh-ri-panel\s*\{[^}]*right:/su)
})

test('Runtime Inspector confirmation keeps native dialog semantics and safe focus targets', () => {
  assert.match(source, /role: 'alertdialog'/)
  assert.match(source, /aria-describedby': 'dsh-runtime-inspector-confirm-copy'/)
  assert.match(source, /cancelButton = React\.useRef/)
  assert.match(source, /cancelButton\.current\?\.focus\(\)/)
  assert.match(stylesSource, /\.dsh-ri-confirm-backdrop\s*\{[\s\S]*?background:\s*var\(--dsh-ri-mask\)/su)
  assert.match(stylesSource, /\.dsh-ri-confirm\s*\{[\s\S]*?border-radius:\s*24px[\s\S]*?box-shadow:\s*var\(--dsh-ri-shadow\)/su)
})

test('installed panel keeps the approved hi-fi density and semantic palette under DSH host styles', () => {
  assert.match(stylesSource, /--dsh-ri-accent:\s*#3066c7/)
  assert.match(stylesSource, /--dsh-ri-success:\s*#2f704f/)
  assert.match(stylesSource, /--dsh-ri-border:\s*#e2e5e9/)
  assert.match(stylesSource, /\.dsh-ri-row-button\s*\{[^}]*padding:\s*9px 10px 8px/su)
  assert.match(stylesSource, /\.dsh-ri-port,[\s\S]*?font-size:\s*13px/su)
  assert.match(stylesSource, /\.dsh-ri-protocol\s*\{[^}]*height:\s*18px[^}]*font-size:\s*9px/su)
  assert.match(stylesSource, /\.dsh-ri-toolchain-line\s*\{[^}]*margin-top:\s*5px/su)
  assert.match(stylesSource, /\.dsh-ri-executable\s*\{[^}]*font-size:\s*10\.5px/su)
  assert.match(stylesSource, /\.dsh-ri-row-meta\s*\{[^}]*margin-top:\s*6px[^}]*font-size:\s*10px/su)
  assert.match(stylesSource, /\.dsh-ri-source-pill,[\s\S]*?padding:\s*2px 7px[\s\S]*?font-size:\s*9\.5px/su)
  assert.match(stylesSource, /\.dsh-ri-detail-section\s*\{[^}]*margin-top:\s*14px/su)
  assert.match(stylesSource, /\.dsh-ri-detail-subline\s*\{[^}]*margin-top:\s*2px[^}]*font-size:\s*10\.5px/su)
  assert.match(stylesSource, /\.dsh-ri-fact\s*\{[^}]*padding:\s*8px 10px 9px/su)
  assert.match(stylesSource, /\.dsh-ri-fact dd\s*\{[^}]*font-size:\s*10\.5px/su)
  assert.match(stylesSource, /\.dsh-ri-source-card,[\s\S]*?padding:\s*10px 11px/su)
  assert.match(stylesSource, /\.dsh-ri-source-facts\s*\{[\s\S]*?border:\s*0[\s\S]*?background:\s*transparent/su)
  assert.match(stylesSource, /\.dsh-ri-source-copy,[\s\S]*?margin:\s*7px 0 0[\s\S]*?font-size:\s*10\.5px/su)
  assert.doesNotMatch(stylesSource, /\.dsh-ri-row-button:focus-visible\s*\{[^}]*border-color:\s*var\(--dsh-ri-accent\)/su)
})

test('sidebar badge refreshes current-session verified listeners without overlapping scans', () => {
  assert.match(source, /const ENTRY_BADGE_REFRESH_MS = 5_000/)
  assert.match(source, /window\.setInterval\([^,]+, ENTRY_BADGE_REFRESH_MS\)/su)
  assert.match(source, /document\.visibilityState === 'visible'/)
  assert.match(source, /document\.addEventListener\('visibilitychange'/)
  assert.match(source, /window\.addEventListener\('focus'/)
  assert.match(source, /if \(badgeRefreshInFlight\.current\) return/)
  assert.match(source, /publishEntryBadgeSnapshot\(snapshot/)
  assert.match(source, /window\.clearInterval/)
  assert.match(source, /document\.removeEventListener\('visibilitychange'/)
  assert.match(source, /window\.removeEventListener\('focus'/)
  assert.match(source, /const indicator = countLabel/)
  assert.doesNotMatch(source, /const indicator = `（\$\{countLabel\}）`/)
})
