import { createRuntimeInspectorBrowserRpc } from './bridge.js'
import { createRuntimeInspectorPanel, createSidebarEntry, openRuntimeInspectorPanel } from './panel.js'
import { registerRuntimeInspectorSlots, type RuntimeInspectorClientContext } from './slots.js'

/** Client services required by this Browser half. */
export const inject = ['slots'] as const

/** Register the additive Sidebar action and shell overlay. */
export function apply(ctx: RuntimeInspectorClientContext): void {
  const rpc = createRuntimeInspectorBrowserRpc()
  registerRuntimeInspectorSlots(ctx, {
    sidebarEntry: createSidebarEntry(rpc, openRuntimeInspectorPanel),
    panel: createRuntimeInspectorPanel(rpc),
  })
}
