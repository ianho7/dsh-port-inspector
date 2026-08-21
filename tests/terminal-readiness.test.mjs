import assert from 'node:assert/strict'
import test from 'node:test'
import { repairDelayedTerminalHandle } from '../lib/terminal-readiness.js'

function deferred() {
  let resolve
  const promise = new Promise(settle => { resolve = settle })
  return { promise, resolve }
}

class LocalTerminalHandle {
  constructor() {
    this.pid = 0
    this.rootIdentity = undefined
    this.doneState = deferred()
    this.done = this.doneState.promise
    this.dataListeners = new Set()
    this.terminal = {
      pid: 0,
      onData: listener => {
        this.dataListeners.add(listener)
        return { dispose: () => this.dataListeners.delete(listener) }
      },
    }
    this.inspector = {
      processTree: pid => pid === 701 ? [{ pid: 701, started: '7:1' }] : [],
    }
  }

  emitData(data) {
    for (const listener of [...this.dataListeners]) listener(data)
  }
}

test('repairs a delayed Windows Terminal PID before returning the original handle', async () => {
  const handle = new LocalTerminalHandle()
  const observedData = []
  const consumer = handle.terminal.onData(data => observedData.push(data))

  const repairing = repairDelayedTerminalHandle(handle, {
    enabled: () => true,
    timeoutMs: 100,
    pollIntervalMs: 5,
  })
  handle.terminal.pid = 701
  handle.emitData('READY')

  const result = await repairing
  assert.equal(result.handle, handle)
  assert.equal(result.mode, 'compatibility-repair')
  assert.equal(result.pid, 701)
  assert.equal(handle.pid, 701)
  assert.deepEqual(handle.rootIdentity, { pid: 701, started: '7:1' })
  assert.deepEqual(observedData, ['READY'])
  assert.equal(handle.dataListeners.size, 1, 'the compatibility listener must dispose without touching the consumer')
  consumer.dispose()
})

test('passes through an already-ready handle without inspecting private shape', async () => {
  const handle = { pid: 702 }
  const result = await repairDelayedTerminalHandle(handle, { enabled: () => true })

  assert.deepEqual(result, { handle, mode: 'native', pid: 702 })
})

test('fails closed without mutating an unsupported zero-PID handle', async () => {
  const handle = { pid: 0, rootIdentity: undefined }
  const result = await repairDelayedTerminalHandle(handle, { enabled: () => true })

  assert.equal(result.handle, handle)
  assert.equal(result.mode, 'unavailable')
  assert.equal(result.reason, 'unsupported-handle')
  assert.deepEqual(handle, { pid: 0, rootIdentity: undefined })
})

test('fails closed and removes only its listener when readiness times out', async () => {
  const handle = new LocalTerminalHandle()
  const consumer = handle.terminal.onData(() => {})
  const result = await repairDelayedTerminalHandle(handle, {
    enabled: () => true,
    timeoutMs: 10,
    pollIntervalMs: 2,
  })

  assert.equal(result.mode, 'unavailable')
  assert.equal(result.reason, 'timeout')
  assert.equal(handle.pid, 0)
  assert.equal(handle.rootIdentity, undefined)
  assert.equal(handle.dataListeners.size, 1)
  consumer.dispose()
})

test('fails closed when the Terminal exits before publishing a real PID', async () => {
  const handle = new LocalTerminalHandle()
  const repairing = repairDelayedTerminalHandle(handle, {
    enabled: () => true,
    timeoutMs: 100,
    pollIntervalMs: 5,
  })
  handle.doneState.resolve()
  const result = await repairing

  assert.equal(result.mode, 'unavailable')
  assert.equal(result.reason, 'exited')
  assert.equal(handle.dataListeners.size, 0)
})

test('rolls back to unavailable when the known fields stop accepting repair', async () => {
  const handle = new LocalTerminalHandle()
  const repairing = repairDelayedTerminalHandle(handle, {
    enabled: () => true,
    timeoutMs: 100,
    pollIntervalMs: 5,
  })
  handle.terminal.pid = 701
  Object.freeze(handle)
  handle.emitData('READY')
  const result = await repairing

  assert.equal(result.mode, 'unavailable')
  assert.equal(result.reason, 'repair-failed')
  assert.equal(handle.pid, 0)
  assert.equal(handle.rootIdentity, undefined)
})
