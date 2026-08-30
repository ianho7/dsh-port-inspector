import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createRuntimeInspectorWebRoute,
  dispatchRuntimeInspectorRequest,
  RUNTIME_INSPECTOR_ROUTE,
} from '../lib/web-bridge.js'

function host() {
  return {
    inventory(query) {
      return { mode: 'read-only-degraded', scanComplete: true, truncated: false, listeners: [], query }
    },
    async copyDetails(request) { return { ok: true, text: `listener=${request.listenerId}`, copied: false } },
    async openProjectDirectory() { return { ok: false, reason: 'project-unavailable' } },
    async performAction(request) {
      return {
        ok: false,
        action: request.kind,
        status: 'denied',
        listenerId: request.listenerId,
        scanComplete: true,
        freshScan: { mode: 'read-only-degraded', scanComplete: true, truncated: false, listeners: [] },
        message: 'read only',
      }
    },
  }
}

test('Host bridge dispatches only the serializable Port Inspector RPC surface', async () => {
  const result = await dispatchRuntimeInspectorRequest(host(), 'POST', `${RUNTIME_INSPECTOR_ROUTE}/inventory`, { search: 'node', currentSessionId: 'session-a' })
  assert.equal(result.status, 200)
  assert.deepEqual(result.body.query, { search: 'node', currentSessionId: 'session-a' })

  const action = await dispatchRuntimeInspectorRequest(host(), 'POST', `${RUNTIME_INSPECTOR_ROUTE}/action`, {
    listenerId: 'listener-1', kind: 'external-single-pid', confirmed: true, currentSessionId: 'session-a',
  })
  assert.equal(action.body.action, 'external-single-pid')
  assert.equal(Object.hasOwn(action.body, 'scanner'), false)
  assert.equal(Object.hasOwn(action.body, 'terminateExternal'), false)
  assert.equal((await dispatchRuntimeInspectorRequest(host(), 'POST', `${RUNTIME_INSPECTOR_ROUTE}/unknown`, {})).status, 404)
  assert.equal((await dispatchRuntimeInspectorRequest(host(), 'GET', `${RUNTIME_INSPECTOR_ROUTE}/inventory`, {})).status, 405)
})

test('Host bridge rejects malformed action requests before reaching Host actions', async () => {
  let called = false
  const unsafeHost = { ...host(), async performAction() { called = true; throw new Error('must not call') } }
  const result = await dispatchRuntimeInspectorRequest(unsafeHost, 'POST', `${RUNTIME_INSPECTOR_ROUTE}/action`, {
    listenerId: 'listener-1', kind: 'terminate-process-tree', confirmed: true,
  })
  assert.equal(result.status, 400)
  assert.equal(called, false)
})

test('Web route serializes Host responses and is removable', async () => {
  const route = createRuntimeInspectorWebRoute(host())
  assert.equal(route.path, RUNTIME_INSPECTOR_ROUTE)
  let response
  const request = {
    method: 'POST',
    url: `${RUNTIME_INSPECTOR_ROUTE}/copy`,
    on(event, listener) {
      if (event === 'end') listener()
      if (event === 'data') listener(JSON.stringify({ listenerId: 'listener-1' }))
    },
  }
  const reply = {
    writeHead(status, headers) { response = { status, headers } },
    end(body) { response.body = JSON.parse(body) },
  }
  await route.handler(request, reply)
  assert.equal(response.status, 200)
  assert.deepEqual(response.body, { ok: true, text: 'listener=listener-1', copied: false })
})
