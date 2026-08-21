import { platform } from 'node:process'
import {
  evaluateCompatibility,
  SUPPORTED_DSH_VERSION,
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

export const name = 'dsh-runtime-inspector'

export interface RuntimeInspectorHealth extends CompatibilitySnapshot {
  readonly lifecycle: 'active' | 'disposed'
}

export interface RuntimeInspectorService {
  readonly health: RuntimeInspectorHealth
  readonly isActive: () => boolean
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
  get?(name: string): unknown
  on?(name: string, listener: (...args: unknown[]) => unknown): unknown
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
    origins: () => registry.list(),
    listeners: () => scanner.scan(registry.list()),
    shutdown: (originId, options) => lifecycle.shutdown(originId, options),
    terminateExternal: (target, request) => externalTerminator.terminate(target, request),
  }
  ctx.provide('runtimeInspector', service)
  refresh(0)
  ctx.effect(() => () => {
    active = false
    attributionEnabled = false
    if (retryTimer !== undefined) clearTimeout(retryTimer)
    attribution.dispose()
    lifecycle.dispose()
    observer.dispose?.()
  }, 'runtime inspector lifecycle')
}

export default { name, apply }
