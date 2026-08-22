import assert from 'node:assert/strict'
import test from 'node:test'
import {
  registerRuntimeInspectorSlots,
  RUNTIME_INSPECTOR_SLOT_OPTIONS,
} from '../lib/client/slots.js'

test('Browser registers additive sidebar and overlay slots and can unload both', () => {
  const registrations = []
  const disposers = []
  let currentRegistration
  const context = {
    slots: {
      inject(name, setup) {
        currentRegistration = { name }
        registrations.push(currentRegistration)
        const disposer = setup()
        currentRegistration.disposer = disposer
        if (typeof disposer === 'function') disposers.push(disposer)
        return disposer
      },
      register(options, component) {
        const record = { options, component, disposed: false }
        currentRegistration.registration = record
        return () => { record.disposed = true }
      },
    },
  }

  registerRuntimeInspectorSlots(context, {
    sidebarEntry: () => 'entry',
    panel: () => 'panel',
  })

  assert.deepEqual(registrations.map(item => item.name), ['sidebar.footer.action', 'shell.overlay'])
  assert.deepEqual(registrations.map(item => item.registration?.options), [
    RUNTIME_INSPECTOR_SLOT_OPTIONS.entry,
    RUNTIME_INSPECTOR_SLOT_OPTIONS.panel,
  ])
  for (const disposer of disposers) disposer()
  assert.equal(registrations.every(item => item.registration?.disposed === true), true)
})

test('Browser source has no Host process primitive import', async () => {
  const source = await (await import('node:fs/promises')).readFile(new URL('../src/client/index.ts', import.meta.url), 'utf8')
  assert.equal(/node:|koffi|child_process|spawnTerminal|terminateExternal/.test(source), false)
})
