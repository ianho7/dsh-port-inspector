import type { RuntimeInspectorClientSessionsLike } from './session-context.js'
import type { RuntimeInspectorLocaleSource } from './i18n.js'

/** Small structural Client context used to keep Host-only types out of the Browser build. */
export interface RuntimeInspectorClientContext {
  readonly get?: (name: string) => unknown
  readonly slots: {
    inject(name: string, setup: () => unknown): unknown
    register(options: RuntimeInspectorSlotOptions, component: (props: unknown) => unknown): unknown
  }
  readonly sessions: RuntimeInspectorClientSessionsLike
  /** Optional DSH Browser locale service; the Client has a document-language fallback. */
  readonly locale?: RuntimeInspectorLocaleSource
}

export interface RuntimeInspectorSlotOptions {
  readonly name: 'sidebar.footer.action' | 'shell.overlay'
  readonly id: string
  readonly order: number
  readonly label: string
}

export interface RuntimeInspectorSlotComponents {
  readonly sidebarEntry: (props: unknown) => unknown
  readonly panel: (props: unknown) => unknown
}

export const RUNTIME_INSPECTOR_SLOT_OPTIONS: Readonly<{
  readonly entry: RuntimeInspectorSlotOptions
  readonly panel: RuntimeInspectorSlotOptions
}> = Object.freeze({
  entry: {
    name: 'sidebar.footer.action',
    id: 'dsh-port-inspector',
    order: 120,
    label: 'Port Inspector',
  },
  panel: {
    name: 'shell.overlay',
    id: 'dsh-port-inspector-panel',
    order: 120,
    label: 'Port Inspector panel',
  },
})

/** Register only additive Client slots; the host layout and sidebar remain owners. */
export function registerRuntimeInspectorSlots(
  ctx: RuntimeInspectorClientContext,
  components: RuntimeInspectorSlotComponents,
): void {
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register(
    RUNTIME_INSPECTOR_SLOT_OPTIONS.entry,
    components.sidebarEntry,
  ))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register(
    RUNTIME_INSPECTOR_SLOT_OPTIONS.panel,
    components.panel,
  ))
}
