import { platform } from 'node:process'
import {
  evaluateCompatibility,
  SUPPORTED_DSH_VERSION,
  SUPPORTED_DSH_VERSIONS,
  type CompatibilitySnapshot,
} from './compatibility.js'
import {
  installRuntimeObservers,
  ProcessOriginRegistry,
  RuntimeAttribution,
  type ProcessOrigin,
  type RuntimeObserverRegistration,
} from './attribution.js'
import { readInstalledDshVersion } from './version.js'
import { readWindowsProcessIdentity } from './process-identity.js'
import { createWindowsListenerScanner, type ListenerRecord } from './windows-scanner.js'
import {
  LifecycleOwnerRegistry,
  type LifecycleShutdownOptions,
  type ManagedShutdownResult,
} from './lifecycle.js'
import {
  ExternalProcessTerminator,
  type ExternalTerminationRequest,
  type ExternalTerminationResult,
  type ExternalTerminationSelection,
} from './external-termination.js'
import {
  projectPortList,
  registerPortListTool,
  type PortListToolExecution,
} from './port-list.js'
import {
  createRuntimeInspectorHost,
  type RuntimeInspectorHost,
} from './host-ui.js'

export { evaluateCompatibility, SUPPORTED_DSH_VERSION }
export type * from './compatibility.js'
export {
  ExternalProcessTerminator,
  type ExternalTerminationOptions,
  type ExternalTerminationRequest,
  type ExternalTerminationResult,
  type ExternalTerminationSelection,
} from './external-termination.js'
export {
  createWindowsExternalProcessAdapter,
  type ExternalProcessAdapter,
  type ExternalProcessLease,
  type ExternalProcessSnapshot,
} from './process-actions.js'
export {
  createPortListTool,
  projectPortList,
  registerPortListTool,
  type PortListListener,
  type PortListLifecycleOwner,
  type PortListMode,
  type PortListOrigin,
  type PortListOwnership,
  type PortListResult,
} from './port-list.js'
export {
  createRuntimeInspectorHost,
  type HostActionKind,
  type HostActionRequest,
  type HostActionResult,
  type HostActionState,
  type HostActionStatus,
  type HostCopyResult,
  type HostExternalOutcome,
  type HostInventoryMode,
  type HostInventoryQuery,
  type HostInventorySnapshot,
  type HostLifecycleOwner,
  type HostListenerAttribution,
  type HostListenerRow,
  type HostManagedOutcome,
  type HostOpenDirectoryResult,
  type HostSessionVisibility,
  type HostSortDirection,
  type HostSortKey,
  type RuntimeInspectorHost,
  type RuntimeInspectorHostOptions,
  type RuntimeInspectorHostRpc,
} from './host-ui.js'

export const name = 'dsh-runtime-inspector'
export const inject = ['tools'] as const

export interface RuntimeInspectorHealth extends CompatibilitySnapshot {
  readonly lifecycle: 'active' | 'disposed'
}

export interface RuntimeInspectorService {
  readonly health: RuntimeInspectorHealth
  readonly isActive: () => boolean
  /** Trusted Host/UI surface; the model-facing `port_list` remains read-only. */
  readonly host: RuntimeInspectorHost
  readonly origins: () => readonly ProcessOrigin[]
  readonly listeners: () => readonly ListenerRecord[]
  readonly shutdown: (originId: number, options?: LifecycleShutdownOptions) => Promise<ManagedShutdownResult>
  /** Direct external action; deliberately separate from managed shutdown. */
  readonly terminateExternal: (
    target: ExternalTerminationSelection,
    request?: ExternalTerminationRequest,
  ) => Promise<ExternalTerminationResult>
}

interface PluginContext {
  provide(name: string, value: unknown): void
  readonly tools?: {
    register(definition: unknown): () => void
  }
  get?(name: string): unknown
  on?(name: string, listener: (...args: unknown[]) => unknown, options?: { readonly global?: boolean }): unknown
  effect(factory: () => void | (() => void | Promise<void>), label?: string): void
}

interface SubprocessLike {
  readonly spawn?: unknown
  readonly spawnTerminal?: unknown
  readonly constructor?: { readonly name?: unknown }
}

function readSubprocessService(ctx: PluginContext): unknown {
  try {
    return ctx.get?.('subprocess')
  } catch {
    return undefined
  }
}

function readToolRegistry(ctx: PluginContext): PluginContext['tools'] {
  try {
    // Stock Bundle composition does not inject every service property even
    // when the service is available through the public lookup API. Accessing
    // an uninjected Cordis property throws, so probe it inside the same
    // containment boundary as the fallback lookup.
    if (ctx.tools !== undefined) return ctx.tools
  } catch {
    // Continue with the public service lookup below.
  }
  try {
    const tools = ctx.get?.('tools')
    if (tools !== null && typeof tools === 'object' && typeof (tools as { register?: unknown }).register === 'function') {
      return tools as PluginContext['tools']
    }
  } catch {
    // Tool injection may be unavailable during degraded composition.
  }
  return undefined
}

function sessionIdForTool(execution: PortListToolExecution): string | undefined {
  const value = execution.agent?.session?.id
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function sessionIdForHost(ctx: PluginContext): string | undefined {
  try {
    const session = ctx.get?.('session')
    if (session !== null && typeof session === 'object') {
      const id = (session as { readonly id?: unknown }).id
      return typeof id === 'string' && id.length > 0 ? id : undefined
    }
  } catch {
    // Host inventory remains available without a current Session scope.
  }
  return undefined
}

function readSubprocessProbe(ctx: PluginContext): {
  subprocessProvider: string | undefined
  hasSpawn: boolean
  hasSpawnTerminal: boolean
} {
  const service = readSubprocessService(ctx) as SubprocessLike | undefined
  const providerName = service?.constructor?.name
  return {
    subprocessProvider: typeof providerName === 'string' ? providerName : undefined,
    hasSpawn: typeof service?.spawn === 'function',
    hasSpawnTerminal: typeof service?.spawnTerminal === 'function',
  }
}

/** Mount the Bundle's health service and no process-owning resources. */
export function apply(ctx: PluginContext): void {
  let attributionEnabled = false
  const registry = new ProcessOriginRegistry()
  const lifecycle = new LifecycleOwnerRegistry(registry)
  const scanner = createWindowsListenerScanner()
  const attribution = new RuntimeAttribution({
    registry,
    lifecycle,
    enabled: () => attributionEnabled,
    readIdentity: readWindowsProcessIdentity,
  })
  const observer: RuntimeObserverRegistration = typeof ctx.on === 'function'
    ? installRuntimeObservers({ on: ctx.on.bind(ctx) }, attribution)
    : { available: false, dispose: () => {} }
  const subprocess = readSubprocessProbe(ctx)
  let snapshot = evaluateCompatibility({
    platform,
    detectedDshVersion: readInstalledDshVersion(),
    expectedDshVersion: SUPPORTED_DSH_VERSION,
    compatibleDshVersions: SUPPORTED_DSH_VERSIONS,
    hasObserverContract: observer.available,
    ...subprocess,
  })
  attributionEnabled = snapshot.verifiedAttributionEnabled
  let active = true
  const externalTerminator = new ExternalProcessTerminator({
    scanner,
    origins: () => registry.list(),
    enabled: () => active && attributionEnabled && snapshot.terminationEnabled,
  })
  const visibleOrigins = (): readonly ProcessOrigin[] => attributionEnabled ? registry.list() : []
  const host = createRuntimeInspectorHost({
    scanner,
    origins: visibleOrigins,
    mode: () => active && attributionEnabled && snapshot.mode === 'observing'
      ? 'observing'
      : 'read-only-degraded',
    currentSessionId: () => sessionIdForHost(ctx),
    shutdown: (originId, options) => lifecycle.shutdown(originId, options),
    terminateExternal: (target, request) => externalTerminator.terminate(target, request),
  })
  const readPortList = (execution: PortListToolExecution) => {
    const origins = visibleOrigins()
    return projectPortList(
      scanner.scanWithStatus(origins),
      origins,
      sessionIdForTool(execution),
      active && attributionEnabled ? snapshot.mode : 'read-only-degraded',
    )
  }
  let unregisterPortListTool: (() => void) | undefined
  const registerPortListWhenAvailable = (registry: PluginContext['tools']): void => {
    if (unregisterPortListTool !== undefined) return
    unregisterPortListTool = registerPortListTool(registry, readPortList)
  }
  registerPortListWhenAvailable(readToolRegistry(ctx))
  let unregisterToolServiceObserver: (() => void) | undefined
  if (typeof ctx.on === 'function') {
    try {
      const disposer = ctx.on('internal/service', (serviceName, value) => {
        if (serviceName !== 'tools' || value === null || typeof value !== 'object') return
        if (typeof (value as { readonly register?: unknown }).register !== 'function') return
        registerPortListWhenAvailable(value as PluginContext['tools'])
      }, { global: true })
      if (typeof disposer === 'function') unregisterToolServiceObserver = disposer as () => void
    } catch {
      // Initial lookup remains authoritative when the publication observer is unavailable.
    }
  }
  const syncProviderFallback = (): void => {
    if (snapshot.verifiedAttributionEnabled) attribution.patchSubprocessProvider(readSubprocessService(ctx))
    else attribution.disableProviderPatches()
  }
  syncProviderFallback()
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  const refresh = (attempt: number): void => {
    if (!active) return
    const probe = readSubprocessProbe(ctx)
    snapshot = evaluateCompatibility({
      platform,
      detectedDshVersion: readInstalledDshVersion(),
      expectedDshVersion: SUPPORTED_DSH_VERSION,
      compatibleDshVersions: SUPPORTED_DSH_VERSIONS,
      hasObserverContract: observer.available,
      ...probe,
    })
    attributionEnabled = snapshot.verifiedAttributionEnabled
    syncProviderFallback()
    const retryable = snapshot.reason === 'execution-world-unsupported'
      || snapshot.reason === 'subprocess-contract-unavailable'
    if (retryable && attempt < 20) {
      retryTimer = setTimeout(() => { refresh(attempt + 1) }, 10)
    }
  }
  const service: RuntimeInspectorService = {
    get health(): RuntimeInspectorHealth {
      return Object.freeze({ ...snapshot, lifecycle: active ? 'active' : 'disposed' })
    },
    isActive: () => active,
    host,
    origins: visibleOrigins,
    listeners: () => scanner.scan(visibleOrigins()),
    shutdown: (originId, options) => lifecycle.shutdown(originId, options),
    terminateExternal: (target, request) => externalTerminator.terminate(target, request),
  }
  ctx.provide('runtimeInspector', service)
  refresh(0)
  ctx.effect(() => () => {
    active = false
    attributionEnabled = false
    unregisterToolServiceObserver?.()
    unregisterPortListTool?.()
    if (retryTimer !== undefined) clearTimeout(retryTimer)
    attribution.dispose()
    lifecycle.dispose()
    observer.dispose?.()
  }, 'runtime inspector lifecycle')
}

export default { name, apply }
