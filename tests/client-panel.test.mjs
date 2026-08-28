import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(new URL('../src/client/panel.ts', import.meta.url), 'utf8')
const slotsSource = await readFile(new URL('../src/client/slots.ts', import.meta.url), 'utf8')
const stylesSource = await readFile(new URL('../src/client/styles.ts', import.meta.url), 'utf8')
const previewStylesSource = await readFile(new URL('../designs/dsh-runtime-inspector/runtime-inspector-production.css', import.meta.url), 'utf8')
const logoSource = await readFile(new URL('../src/client/toolchain-logos.ts', import.meta.url), 'utf8').catch(() => '')

function normalizedCss(value) {
  return value
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/\r/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()
}

function productionCssFromSource(value) {
  const marker = 'String.raw`'
  const start = value.indexOf(marker)
  const end = value.lastIndexOf('`')
  assert.ok(start >= 0, 'the production stylesheet should use the tagged CSS source')
  assert.ok(end > start + marker.length, 'the production stylesheet should have a complete CSS source')
  return value.slice(start + marker.length, end)
}

function productionCssFromPreview(value) {
  const startMarker = '.dsh-ri-entry,\n.dsh-ri-overlay,\n.dsh-ri-panel'
  const endMarker = '\n.dsh-ri-prototype-'
  const start = value.indexOf(startMarker)
  const end = value.indexOf(endMarker, start)
  assert.ok(start >= 0, 'the design preview should include the production stylesheet')
  assert.ok(end > start, 'the design preview should keep prototype scaffolding after production CSS')
  return value.slice(start, end)
}

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
  assert.match(source, /row\.development\.group === 'current-project'/)
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

test('Compose associations show independent evidence and product/context logos', () => {
  assert.match(source, /row\.compose === undefined \? null : React\.createElement\(ComposePill/)
  assert.match(source, /data-runtime-inspector-compose-details/)
  assert.match(source, /row\.compose\.relativeComposeFile/)
  assert.match(source, /row\.compose\.containerId/)
  assert.match(source, /handlingComposeReadOnly/)
  assert.match(source, /snapshot\.composeStatus === 'unavailable'/)
  assert.match(source, /ComposeContextLogo/)
  assert.match(logoSource, /ComposeContextLogo/)
  assert.match(stylesSource, /\.dsh-ri-compose-pill/)
})

test('verified launch chain stays detail-only and marks missing command lines neutrally', () => {
  assert.match(source, /data-runtime-inspector-launch-chain': 'verified'/)
  assert.match(source, /row\.confidence !== 'verified'/)
  assert.match(source, /launchChainCommandUnavailable/)
  assert.match(source, /data-runtime-inspector-launch-chain-role/)
  assert.match(stylesSource, /\.dsh-ri-launch-chain-node/)
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
  assert.match(stylesSource, /\.dsh-ri-panel\s*\{[\s\S]*?width:\s*1120px[\s\S]*?height:\s*min\(840px,\s*calc\(100vh - 48px\)\)[\s\S]*?border-radius:\s*24px/su)
  assert.match(stylesSource, /\.dsh-ri-toolbar\s*\{[\s\S]*?display:\s*flex[\s\S]*?flex-wrap:\s*wrap[\s\S]*?gap:\s*8px/su)
  assert.match(stylesSource, /@media\s*\(max-width:\s*1040px\)[\s\S]*?\.dsh-ri-search\s*\{[\s\S]*?flex:\s*1 1 100%/su)
  assert.match(stylesSource, /--dsh-ri-shadow:\s*var\(--dsw-shadow-lv3/su)
  assert.match(stylesSource, /\.dsh-ri-header\s*\{[\s\S]*?flex-wrap:\s*wrap[\s\S]*?min-height:\s*64px[\s\S]*?height:\s*auto/su)
  assert.match(stylesSource, /\.dsh-ri-header-status\s*\{[^}]*flex:\s*1 1 auto/su)
  assert.match(stylesSource, /\.dsh-ri-header-title\s*\{[\s\S]*?font-size:\s*var\(--dsh-ri-type-title\)/su)
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

test('readable typography gives the centered panel a responsive space budget', () => {
  assert.match(stylesSource, /--dsh-ri-type-body:\s*14px/)
  assert.match(stylesSource, /--dsh-ri-type-title:\s*22px/)
  assert.match(stylesSource, /--dsh-ri-type-port:\s*16px/)
  assert.match(stylesSource, /--dsh-ri-type-detail-port:\s*32px/)
  assert.match(stylesSource, /--dsh-ri-font-sans:/)
  assert.match(stylesSource, /--dsh-ri-font-mono:/)
  assert.match(stylesSource, /font-family:\s*var\(--dsh-ri-font-sans\)/)
  assert.match(source, /lang: translator\.locale/)
  assert.match(stylesSource, /@media\s*\(max-width:\s*720px\)[\s\S]*?\.dsh-ri-panel\s*\{[\s\S]*?width:\s*calc\(100vw - 32px\)[\s\S]*?max-width:\s*calc\(100vw - 32px\)[\s\S]*?height:\s*calc\(100vh - 32px\)/su)
  assert.match(stylesSource, /@media\s*\(max-width:\s*480px\)[\s\S]*?\.dsh-ri-panel\s*\{[\s\S]*?width:\s*calc\(100vw - 16px\)[\s\S]*?max-width:\s*calc\(100vw - 16px\)[\s\S]*?height:\s*calc\(100vh - 16px\)/su)
})

test('readable list and detail content reflows before it can overflow', () => {
  assert.match(stylesSource, /\.dsh-ri-row-top,\s*\.dsh-ri-row-meta\s*\{[\s\S]*?flex-wrap:\s*wrap[\s\S]*?row-gap:\s*4px/su)
  assert.match(stylesSource, /\.dsh-ri-source-pill,[\s\S]*?\.dsh-ri-action-pill\s*\{[\s\S]*?overflow:\s*hidden[\s\S]*?text-overflow:\s*ellipsis/su)
  assert.match(stylesSource, /\.dsh-ri-pill-label\s*\{[\s\S]*?min-width:\s*0[\s\S]*?overflow:\s*hidden[\s\S]*?text-overflow:\s*ellipsis/su)
  assert.match(stylesSource, /\.dsh-ri-technical-value\s*\{[\s\S]*?font-family:\s*var\(--dsh-ri-font-mono\)/su)
  assert.match(stylesSource, /\.dsh-ri-row-address\s*\{[\s\S]*?display:\s*inline-block[\s\S]*?min-width:\s*0[\s\S]*?overflow:\s*hidden[\s\S]*?text-overflow:\s*ellipsis/su)
  assert.match(stylesSource, /\.dsh-ri-fact\.is-technical\s+dd\s*\{[\s\S]*?font-family:\s*var\(--dsh-ri-font-mono\)/su)
  assert.match(source, /className: 'dsh-ri-pill-label'/)
  assert.match(source, /className: 'dsh-ri-row-address dsh-ri-technical-value'/)
  assert.match(source, /dsh-ri-detail-subline'[\s\S]*?dsh-ri-technical-value/su)
  assert.match(source, /identityItem\(t\('listenPort'\)[\s\S]*?true\)/su)
  assert.match(source, /title: `\$\{row\.address\}:\$\{String\(row\.port\)\}`/)
  assert.match(source, /technical: true/)
  assert.match(stylesSource, /\.dsh-ri-detail-head\s*\{[\s\S]*?flex-wrap:\s*wrap/su)
  assert.match(stylesSource, /\.dsh-ri-handling-card\s*\{[\s\S]*?flex-wrap:\s*wrap/su)
  assert.match(stylesSource, /\.dsh-ri-fact dd\.is-multiline\s*\{[\s\S]*?line-height:\s*var\(--dsh-ri-leading-prose\)/su)
  assert.match(stylesSource, /\.dsh-ri-confirm\s*\{[\s\S]*?width:\s*min\(480px,/su)
})

test('code-faithful design preview stays aligned with the production typography budget', () => {
  assert.equal(
    normalizedCss(productionCssFromPreview(previewStylesSource)),
    normalizedCss(productionCssFromSource(stylesSource)),
    'the design preview production segment should remain aligned with the Browser source',
  )
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
  assert.match(stylesSource, /--dsh-ri-bg:\s*var\(--dsw-alias-bg-layer-2\)/)
  assert.match(stylesSource, /--dsh-ri-border:\s*var\(--dsw-alias-border-l2\)/)
  assert.match(stylesSource, /--dsh-ri-border-soft:\s*var\(--dsw-alias-border-l1\)/)
  assert.match(stylesSource, /--dsh-ri-accent:\s*var\(--dsw-alias-state-business-primary\)/)
  assert.match(stylesSource, /--dsh-ri-accent-soft:\s*var\(--dsw-alias-state-business-tertiary\)/)
  assert.match(stylesSource, /--dsh-ri-success:\s*var\(--dsw-alias-state-success-primary\)/)
  assert.match(stylesSource, /--dsh-ri-success-border:\s*var\(--dsw-alias-state-success-secondary\)/)
  assert.match(stylesSource, /--dsh-ri-success-bg:\s*var\(--dsw-alias-state-success-tertiary\)/)
  assert.match(stylesSource, /--dsh-ri-warning:\s*var\(--dsw-alias-state-warn-label\)/)
  assert.match(stylesSource, /--dsh-ri-warning-border:\s*var\(--dsw-alias-state-warn-secondary\)/)
  assert.match(stylesSource, /--dsh-ri-warning-bg:\s*var\(--dsw-alias-state-warn-tertiary\)/)
  assert.match(stylesSource, /--dsh-ri-danger:\s*var\(--dsw-alias-state-error-primary\)/)
  assert.match(stylesSource, /--dsh-ri-danger-hover:\s*var\(--dsw-alias-state-error-secondary\)/)
  assert.match(stylesSource, /--dsh-ri-danger-bg:\s*var\(--dsw-alias-interactive-bg-hover-danger\)/)
  assert.match(stylesSource, /--dsh-ri-border-subtle:\s*var\(--dsw-alias-border-l1\)/)
  assert.match(stylesSource, /--dsh-ri-border-strong:\s*var\(--dsw-alias-border-l3\)/)
  assert.match(stylesSource, /--dsh-ri-shadow:\s*var\(--dsw-shadow-lv3\)/)
  assert.match(stylesSource, /--dsh-ri-mask:\s*var\(--dsw-alias-bg-mask-1\)/)
  assert.match(stylesSource, /--dsh-ri-mask-blur:\s*var\(--dsw-mask-blur\)/)
  assert.match(stylesSource, /--dsh-scrollbar-thumb:\s*var\(--dsw-alias-scrollbar-bg-l2\)/)
  assert.match(stylesSource, /--dsh-scrollbar-thumb-hover:\s*var\(--dsw-alias-scrollbar-hover-l2\)/)
  assert.doesNotMatch(stylesSource, /--dsh-ri-(border|accent|success|warning|danger):\s*#[0-9a-f]+/i)
  assert.match(stylesSource, /\.dsh-ri-error\s*\{[\s\S]*?background:\s*var\(--dsh-ri-danger-bg\)/su)
  assert.match(stylesSource, /\.dsh-ri-result\s*\{[\s\S]*?background:\s*var\(--dsh-ri-success-bg\)/su)
  assert.match(stylesSource, /\.dsh-ri-primary-action:hover\s*\{[\s\S]*?background:\s*var\(--dsh-ri-accent-hover\)/su)
  assert.match(stylesSource, /\.dsh-ri-danger-action:hover\s*\{[\s\S]*?background:\s*var\(--dsh-ri-danger-hover\)/su)
  assert.doesNotMatch(stylesSource, /filter:\s*brightness\(/)
  assert.match(stylesSource, /\.dsh-ri-row-button\s*\{[^}]*padding:\s*10px 11px 9px/su)
  assert.match(stylesSource, /\.dsh-ri-port,[\s\S]*?font-size:\s*var\(--dsh-ri-type-port\)/su)
  assert.match(stylesSource, /\.dsh-ri-protocol\s*\{[^}]*height:\s*20px[^}]*font-size:\s*var\(--dsh-ri-type-caption\)/su)
  assert.match(stylesSource, /\.dsh-ri-toolchain-line\s*\{[^}]*margin-top:\s*5px/su)
  assert.match(stylesSource, /\.dsh-ri-executable\s*\{[^}]*font-size:\s*var\(--dsh-ri-type-meta\)/su)
  assert.match(stylesSource, /\.dsh-ri-row-meta\s*\{[^}]*margin-top:\s*6px[^}]*font-size:\s*var\(--dsh-ri-type-meta\)/su)
  assert.match(stylesSource, /\.dsh-ri-source-pill,[\s\S]*?padding:\s*2px 7px[\s\S]*?font-size:\s*var\(--dsh-ri-type-caption\)/su)
  assert.match(stylesSource, /\.dsh-ri-detail-section\s*\{[^}]*margin-top:\s*16px/su)
  assert.match(stylesSource, /\.dsh-ri-detail-subline\s*\{[^}]*margin-top:\s*2px[^}]*font-size:\s*var\(--dsh-ri-type-meta\)/su)
  assert.match(stylesSource, /\.dsh-ri-fact\s*\{[^}]*padding:\s*9px 11px 10px/su)
  assert.match(stylesSource, /\.dsh-ri-fact dd\s*\{[^}]*font-size:\s*var\(--dsh-ri-type-label\)/su)
  assert.match(stylesSource, /\.dsh-ri-source-card,[\s\S]*?padding:\s*10px 11px/su)
  assert.match(stylesSource, /\.dsh-ri-source-facts\s*\{[\s\S]*?border:\s*0[\s\S]*?background:\s*transparent/su)
  assert.match(stylesSource, /\.dsh-ri-source-copy,[\s\S]*?margin:\s*7px 0 0[\s\S]*?font-size:\s*var\(--dsh-ri-type-label\)/su)
  assert.doesNotMatch(stylesSource, /\.dsh-ri-row-button:focus-visible\s*\{[^}]*border-color:\s*var\(--dsh-ri-accent\)/su)
})

test('sidebar badge refreshes current-project listeners, including Compose infrastructure, without overlapping scans', () => {
  assert.match(source, /const ENTRY_BADGE_REFRESH_MS = 5_000/)
  assert.match(source, /window\.setInterval\([^,]+, ENTRY_BADGE_REFRESH_MS\)/su)
  assert.match(source, /document\.visibilityState === 'visible'/)
  assert.match(source, /document\.addEventListener\('visibilitychange'/)
  assert.match(source, /window\.addEventListener\('focus'/)
  assert.match(source, /if \(badgeRefreshInFlight\.current\) return/)
  assert.match(source, /publishEntryBadgeSnapshot\(snapshot/)
  assert.match(source, /snapshot\.listeners\.filter\(isCurrentProjectListener\)/)
  assert.match(source, /window\.clearInterval/)
  assert.match(source, /document\.removeEventListener\('visibilitychange'/)
  assert.match(source, /window\.removeEventListener\('focus'/)
  assert.match(source, /const indicator = countLabel/)
  assert.doesNotMatch(source, /const indicator = `（\$\{countLabel\}）`/)
})
