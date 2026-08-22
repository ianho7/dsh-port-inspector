import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(new URL('../src/client/panel.ts', import.meta.url), 'utf8')
const slotsSource = await readFile(new URL('../src/client/slots.ts', import.meta.url), 'utf8')

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
  assert.match(source, /snapshot\.scanComplete \? 'ready' : 'incomplete'/)
  assert.match(source, /state\.postAction === true \? 'post-action' : 'result'/)
  assert.match(source, /data-runtime-inspector-confirmation/)
  assert.match(slotsSource, /sidebar\.footer\.action/)
  assert.match(slotsSource, /shell\.overlay/)
  assert.match(source, /观察模式：支持安全操作/)
  assert.match(source, /只读降级模式：操作已禁用/)
})
