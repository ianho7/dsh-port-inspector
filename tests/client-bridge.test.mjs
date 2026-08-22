import assert from 'node:assert/strict'
import test from 'node:test'
import { createRuntimeInspectorBrowserRpc } from '../lib/client/bridge.js'

test('Browser RPC uses same-origin POST endpoints and only serializable payloads', async () => {
  const calls = []
  const rpc = createRuntimeInspectorBrowserRpc(async (input, init) => {
    calls.push({ input, init })
    return {
      ok: true,
      status: 200,
      async json() {
        if (input.endsWith('/inventory')) return { mode: 'read-only-degraded', scanComplete: true, truncated: false, listeners: [] }
        if (input.endsWith('/copy')) return { ok: true, text: 'Port: 3000', copied: false }
        if (input.endsWith('/open-project-directory')) return { ok: true }
        return { ok: false, action: 'read-only', status: 'denied', listenerId: 'listener-1', scanComplete: true, freshScan: { mode: 'read-only-degraded', scanComplete: true, truncated: false, listeners: [] }, message: 'read only' }
      },
    }
  })

  await rpc.inventory({ search: '3000', sort: { key: 'port', direction: 'asc' } })
  await rpc.copyDetails({ listenerId: 'listener-1' })
  await rpc.openProjectDirectory({ listenerId: 'listener-1' })
  await rpc.performAction({ listenerId: 'listener-1', kind: 'read-only', confirmed: true })

  assert.deepEqual(calls.map(call => call.input), [
    '/api/dsh-runtime-inspector/inventory',
    '/api/dsh-runtime-inspector/copy',
    '/api/dsh-runtime-inspector/open-project-directory',
    '/api/dsh-runtime-inspector/action',
  ])
  assert.equal(calls.every(call => call.init.method === 'POST' && call.init.credentials === 'same-origin'), true)
  assert.deepEqual(JSON.parse(calls[0].init.body), { search: '3000', sort: { key: 'port', direction: 'asc' } })
  assert.deepEqual(JSON.parse(calls[3].init.body), { listenerId: 'listener-1', kind: 'read-only', confirmed: true })
})

test('Browser RPC turns a missing or failed Host bridge into a visible error', async () => {
  const rpc = createRuntimeInspectorBrowserRpc(async () => ({
    ok: false,
    status: 503,
    async json() { return { error: 'bridge unavailable' } },
  }))
  await assert.rejects(rpc.inventory(), /bridge unavailable/)
})
