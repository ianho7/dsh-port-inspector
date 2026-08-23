import { createRuntimeInspectorBrowserRpc } from './bridge.js'
import { createRuntimeInspectorPanel, createSidebarEntry, openRuntimeInspectorPanel } from './panel.js'
import { registerRuntimeInspectorSlots, type RuntimeInspectorClientContext } from './slots.js'
import { installRuntimeInspectorStyles } from './styles.js'

/** Client services required by this Browser half. */
export const inject = ['slots', 'sessions'] as const

/** Register the additive Sidebar action and shell overlay. */
export function apply(ctx: RuntimeInspectorClientContext): void {
  installRuntimeInspectorStyles()
  const rpc = createRuntimeInspectorBrowserRpc()
  registerRuntimeInspectorSlots(ctx, {
    sidebarEntry: createSidebarEntry(rpc, openRuntimeInspectorPanel, ctx.sessions),
    panel: createRuntimeInspectorPanel(rpc, ctx.sessions),
  })
}
