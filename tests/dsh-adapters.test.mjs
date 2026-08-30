import assert from 'node:assert/strict'
import test from 'node:test'
import { createRuntimeInspectorDshAdapters } from '../lib/dsh-adapters.js'

test('DSH directory adapter forwards the trusted path to host.openPath', async () => {
  const calls = []
  const adapters = createRuntimeInspectorDshAdapters(() => ({
    host: {
      async openPath(request, signal) {
        calls.push({ request, signal })
        return { rpcId: request.rpcId, result: { ok: true, value: { opened: true } } }
      },
    },
  }))

  assert.equal(adapters.openDirectoryAvailable(), true)
  await adapters.openDirectory('C:\\projects\\port-inspector')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].request.payload.path, 'C:\\projects\\port-inspector')
  assert.equal(calls[0].signal instanceof AbortSignal, true)
})

test('DSH directory adapter reports unavailable host capability', async () => {
  const adapters = createRuntimeInspectorDshAdapters(() => undefined)

  assert.equal(adapters.openDirectoryAvailable(), false)
  await assert.rejects(
    adapters.openDirectory('C:\\projects\\port-inspector'),
    /Host path opener unavailable/,
  )
})
