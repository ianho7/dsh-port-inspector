import assert from 'node:assert/strict'
import test from 'node:test'
import {
  loadPinnedListenerKeys,
  savePinnedListenerKeys,
  togglePinnedListenerKey,
} from '../lib/client/pinned-listeners.js'

function memoryStorage(initial) {
  const values = new Map(initial === undefined ? [] : [['dsh-port-inspector:pins:v1', initial]])
  return {
    getItem(key) { return values.get(key) ?? null },
    setItem(key, value) { values.set(key, value) },
    value(key) { return values.get(key) },
  }
}

test('versioned pin preferences survive reload and reject malformed state', () => {
  const storage = memoryStorage()
  assert.equal(savePinnedListenerKeys(storage, new Set(['application:spotify.exe'])), true)
  assert.deepEqual([...loadPinnedListenerKeys(storage)], ['application:spotify.exe'])
  assert.match(storage.value('dsh-port-inspector:pins:v1'), /"version":1/)
  assert.deepEqual([...loadPinnedListenerKeys(memoryStorage('{broken'))], [])
  assert.deepEqual([...loadPinnedListenerKeys(memoryStorage('{"version":2,"keys":["application:x"]}'))], [])
})

test('pin toggling is immutable and storage failures remain usable in-page', () => {
  const original = new Set(['application:a'])
  const added = togglePinnedListenerKey(original, 'application:b')
  const removed = togglePinnedListenerKey(added, 'application:a')
  assert.deepEqual([...original], ['application:a'])
  assert.deepEqual([...added], ['application:a', 'application:b'])
  assert.deepEqual([...removed], ['application:b'])
  assert.equal(savePinnedListenerKeys({ getItem() { return null }, setItem() { throw new Error('denied') } }, added), false)
})
