import { createRuntimeInspectorBrowserRpc } from './bridge.js'
import { createRuntimeInspectorLocaleStore } from './i18n.js'
import { createRuntimeInspectorPanel, createSidebarEntry, openRuntimeInspectorPanel } from './panel.js'
import { registerRuntimeInspectorSlots, type RuntimeInspectorClientContext } from './slots.js'
import { installRuntimeInspectorStyles } from './styles.js'

/** Client services required by this Browser half. */
export const inject = ['slots', 'sessions'] as const

/** Register the additive Sidebar action and shell overlay. */
export function apply(ctx: RuntimeInspectorClientContext): void {
  installRuntimeInspectorStyles()
  const rpc = createRuntimeInspectorBrowserRpc()
  const locale = createRuntimeInspectorLocaleStore(ctx)
  registerRuntimeInspectorSlots(ctx, {
    sidebarEntry: createSidebarEntry(rpc, openRuntimeInspectorPanel, ctx.sessions, locale),
    panel: createRuntimeInspectorPanel(rpc, ctx.sessions, locale),
  })
}
