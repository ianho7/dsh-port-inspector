import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ExternalProcessTerminator,
} from '../lib/external-termination.js'
import { WindowsListenerScanner } from '../lib/windows-scanner.js'

function listener(pid, port, executable = 'node.exe', processCreatedAt = '1000') {
  return {
    protocol: 'tcp4',
    localAddress: '127.0.0.1',
    localPort: port,
    owningPid: pid,
    processCreatedAt,
    executable,
  }
}

function harness({
  listeners = [listener(200, 3200)],
  snapshot = {
    pid: 200,
    processCreatedAt: '1000',
    executable: 'C:\\Program Files\\nodejs\\node.exe',
    userId: 'S-1-5-21-42',
    protectedProcess: false,
    systemProcess: false,
    canTerminate: true,
  },
  open = true,
  failScan = false,
  enabled = true,
} = {}) {
  const state = { listeners: [...listeners] }
  const calls = { open: [], terminate: [], close: [], currentUser: 0 }
  const adapter = {
    currentUserId() {
      calls.currentUser += 1
      return 'S-1-5-21-42'
    },
    openForTermination(pid) {
      calls.open.push(pid)
      if (!open) return undefined
      return {
        snapshot: { ...snapshot },
        terminate() {
          calls.terminate.push(pid)
          return true
        },
        close() {
          calls.close.push(pid)
        },
      }
    },
  }
  const scanner = new WindowsListenerScanner({
    listListeners: () => {
      if (failScan) throw new Error('netstat unavailable')
      return state.listeners
    },
    listProcesses: () => state.listeners.map(row => ({
      pid: row.owningPid,
      parentPid: 1,
      processCreatedAt: row.processCreatedAt,
      executable: row.executable,
    })),
  })
  const terminator = new ExternalProcessTerminator({
    scanner,
    adapter,
    enabled: () => enabled,
  })
  return { state, calls, terminator }
}

test('requires explicit confirmation and a complete external selection', async () => {
  const { calls, terminator } = harness()
  const target = listener(200, 3200)

  const unconfirmed = await terminator.terminate(target)
  assert.equal(unconfirmed.reason, 'confirmation-required')
  assert.deepEqual(calls.open, [])

  const incomplete = await terminator.terminate({ owningPid: 200, executable: 'node.exe' }, { confirmed: true })
  assert.equal(incomplete.reason, 'invalid-selection')
  assert.deepEqual(calls.open, [])
})

test('revalidates one external PID, terminates only that PID, and reports a fresh release scan', async () => {
  const other = listener(201, 3201)
  const { state, calls, terminator } = harness({ listeners: [listener(200, 3200), other] })
  const target = listener(200, 3200)
  const lease = await terminator.terminate(target, { confirmed: true })

  assert.equal(lease.ok, true)
  assert.equal(lease.action, 'external-single-pid')
  assert.equal(lease.status, 'completed')
  assert.equal(lease.revalidated, true)
  assert.equal(lease.portReleased, false)
  assert.deepEqual(calls.open, [200])
  assert.deepEqual(calls.terminate, [200])
  assert.deepEqual(calls.close, [200])
  assert.deepEqual(lease.rescan.map(row => row.owningPid), [200, 201])

  // The action is deliberately a lease operation, never a process-tree walk.
  assert.equal(state.listeners.length, 2)
  assert.deepEqual(calls, { open: [200], terminate: [200], close: [200], currentUser: 1 })
})

test('fresh process identity mismatch aborts before termination', async () => {
  for (const [field, expectedReason] of [
    ['pid', 'pid-mismatch'],
    ['processCreatedAt', 'creation-identity-mismatch'],
    ['executable', 'executable-mismatch'],
  ]) {
    const { calls, terminator } = harness({
      snapshot: {
        pid: field === 'pid' ? 999 : 200,
        processCreatedAt: field === 'processCreatedAt' ? '9999' : '1000',
        executable: field === 'executable' ? 'other.exe' : 'C:\\Program Files\\nodejs\\node.exe',
        userId: 'S-1-5-21-42',
        protectedProcess: false,
        systemProcess: false,
        canTerminate: true,
      },
    })
    const result = await terminator.terminate(listener(200, 3200), { confirmed: true })
    assert.equal(result.reason, expectedReason)
    assert.equal(result.revalidated, true)
    assert.deepEqual(calls.terminate, [])
    assert.deepEqual(calls.close, [200])
  }
})

test('managed, other-user, protected, system, and inaccessible targets stay read-only', async () => {
  const managed = harness()
  const managedResult = await managed.terminator.terminate({ ...listener(200, 3200), jobId: 'job-1' }, { confirmed: true })
  assert.equal(managedResult.reason, 'managed-owner')
  assert.deepEqual(managed.calls.open, [])

  for (const [snapshot, reason] of [
    [{ userId: 'S-1-5-21-other', protectedProcess: false, systemProcess: false, canTerminate: true }, 'other-user'],
    [{ userId: 'S-1-5-21-42', protectedProcess: true, systemProcess: false, canTerminate: true }, 'protected-process'],
    [{ userId: 'S-1-5-18', protectedProcess: false, systemProcess: true, canTerminate: true }, 'system-process'],
    [{ userId: 'S-1-5-21-42', protectedProcess: false, systemProcess: false, canTerminate: false }, 'access-denied'],
  ]) {
    const fixture = harness({ snapshot: {
      pid: 200,
      processCreatedAt: '1000',
      executable: 'node.exe',
      ...snapshot,
    } })
    const result = await fixture.terminator.terminate(listener(200, 3200), { confirmed: true })
    assert.equal(result.reason, reason)
    assert.deepEqual(fixture.calls.terminate, [])
  }

  const inaccessible = harness({ open: false })
  const denied = await inaccessible.terminator.terminate(listener(200, 3200), { confirmed: true })
  assert.equal(denied.reason, 'access-denied')
  assert.deepEqual(inaccessible.calls.terminate, [])
})

test('successful termination reports the selected port released after the fresh scan', async () => {
  const fixture = harness()
  fixture.state.listeners = []
  const result = await fixture.terminator.terminate(listener(200, 3200), { confirmed: true })
  assert.equal(result.ok, true)
  assert.equal(result.portReleased, true)
  assert.deepEqual(result.rescan, [])
})

test('an incomplete post-action listener scan never claims that the port was released', async () => {
  const fixture = harness({ failScan: true })
  const result = await fixture.terminator.terminate(listener(200, 3200), { confirmed: true })
  assert.equal(result.ok, true)
  assert.equal(result.portReleased, undefined)
  assert.deepEqual(result.rescan, [])
})

test('compatibility-disabled mode exposes no external action', async () => {
  const fixture = harness({ enabled: false })
  const result = await fixture.terminator.terminate(listener(200, 3200), { confirmed: true })
  assert.equal(result.reason, 'compatibility-disabled')
  assert.deepEqual(fixture.calls.open, [])
})
