import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createRuntimeInspectorLocaleStore,
  createRuntimeInspectorTranslator,
} from '../lib/client/i18n.js'

function localeHarness(initial = 'zh') {
  let active = initial
  const listeners = new Set()
  return {
    context: {
      locale: {
        getSnapshot: () => ({ active }),
        subscribe(listener) {
          listeners.add(listener)
          return () => { listeners.delete(listener) }
        },
      },
    },
    setActive(next) {
      active = next
      for (const listener of [...listeners]) listener()
    },
  }
}

test('prefers the active DSH locale over a stale document language', () => {
  const harness = localeHarness('en')
  const store = createRuntimeInspectorLocaleStore(harness.context, () => 'zh-CN')

  assert.equal(store.getSnapshot(), 'en')
})

test('supports both public DSH locale snapshot accessors', () => {
  const context = { locale: { getSnapshot: () => ({}), getLocale: () => ({ active: 'zh' }) } }
  const store = createRuntimeInspectorLocaleStore(context, () => 'en-US')
  assert.equal(store.getSnapshot(), 'zh')
})

test('discovers the optional locale service through public context lookup and structural fallback', () => {
  const lookedUp = createRuntimeInspectorLocaleStore({
    get(name) {
      assert.equal(name, 'locale')
      return { getSnapshot: () => ({ active: 'zh' }) }
    },
  }, () => 'en-US')
  assert.equal(lookedUp.getSnapshot(), 'zh')

  const structural = createRuntimeInspectorLocaleStore({
    get() { throw new Error('temporarily unavailable') },
    locale: { getSnapshot: () => ({ active: 'zh' }) },
  }, () => 'en-US')
  assert.equal(structural.getSnapshot(), 'zh')
})

test('maps the document language for the DOM fallback and defaults unknown values to English', () => {
  assert.equal(createRuntimeInspectorLocaleStore({}, () => 'zh-Hant-TW').getSnapshot(), 'zh')
  assert.equal(createRuntimeInspectorLocaleStore({}, () => 'en-GB').getSnapshot(), 'en')
  assert.equal(createRuntimeInspectorLocaleStore({}, () => 'fr-FR').getSnapshot(), 'en')
  assert.equal(createRuntimeInspectorLocaleStore({}, () => undefined).getSnapshot(), 'en')
})

test('does not let a stale document language override an unknown active DSH locale', () => {
  const context = { locale: { getSnapshot: () => ({ active: 'fr' }) } }
  const store = createRuntimeInspectorLocaleStore(context, () => 'zh-CN')
  assert.equal(store.getSnapshot(), 'en')
})

test('tracks DSH locale changes through the public subscription and can unsubscribe', () => {
  const harness = localeHarness('zh')
  const store = createRuntimeInspectorLocaleStore(harness.context, () => 'en')
  const seen = []
  const unsubscribe = store.subscribe(() => { seen.push(store.getSnapshot()) })

  harness.setActive('en')
  assert.deepEqual(seen, ['en'])

  unsubscribe()
  harness.setActive('zh')
  assert.deepEqual(seen, ['en'])
})

test('provides the first bilingual Runtime Inspector messages', () => {
  const zh = createRuntimeInspectorTranslator('zh')
  const en = createRuntimeInspectorTranslator('en')

  assert.equal(zh.t('refresh'), '刷新')
  assert.equal(en.t('refresh'), 'Refresh')
  assert.equal(zh.t('searchPlaceholder'), '搜索端口、PID、应用或会话')
  assert.equal(en.t('searchPlaceholder'), 'Search ports, PIDs, apps, or sessions')
  assert.equal(zh.t('closePanel'), '关闭 Runtime Inspector')
  assert.equal(en.t('closePanel'), 'Close Runtime Inspector')
})

test('localizes interpolated accessibility, count, and action-result copy without changing data values', () => {
  const zh = createRuntimeInspectorTranslator('zh')
  const en = createRuntimeInspectorTranslator('en')
  assert.equal(zh.t('selectPortPid', { port: 4173, pid: 8124 }), '选择端口 4173，PID 8124')
  assert.equal(en.t('selectPortPid', { port: 4173, pid: 8124 }), 'Select port 4173, PID 8124')
  assert.equal(zh.t('displayCount', { count: 1 }), '显示 1 项')
  assert.equal(en.t('displayCount', { count: 1 }), 'Showing 1 listener')
  assert.equal(en.t('displayCount', { count: 2 }), 'Showing 2 listeners')
  assert.equal(zh.t('actionCompletedReleased', { action: '结束该进程', port: 4173 }), '结束该进程 已完成；端口 4173 已不再监听。')
  assert.equal(en.t('actionCompletedReleased', { action: 'End process', port: 4173 }), 'End process completed; port 4173 is no longer listening.')
})
