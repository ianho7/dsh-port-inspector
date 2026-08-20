import { platform } from 'node:process'
import {
  evaluateCompatibility,
  SUPPORTED_DSH_VERSION,
  type CompatibilitySnapshot,
} from './compatibility.js'
import { readInstalledDshVersion } from './version.js'

export { evaluateCompatibility, SUPPORTED_DSH_VERSION }
export type * from './compatibility.js'

export const name = 'dsh-runtime-inspector'

export interface RuntimeInspectorHealth extends CompatibilitySnapshot {
  readonly lifecycle: 'active' | 'disposed'
}

export interface RuntimeInspectorService {
  readonly health: RuntimeInspectorHealth
  readonly isActive: () => boolean
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

function readSubprocessProbe(ctx: PluginContext): {
  subprocessProvider: string | undefined
  hasSpawn: boolean
  hasSpawnTerminal: boolean
} {
  let service: SubprocessLike | undefined
  try {
    service = ctx.get?.('subprocess') as SubprocessLike | undefined
  } catch {
    // A missing or inaccessible service is a contract failure, not a reason
    // to prevent the rest of the read-only Bundle from loading.
  }
  const providerName = service?.constructor?.name
  return {
    subprocessProvider: typeof providerName === 'string' ? providerName : undefined,
    hasSpawn: typeof service?.spawn === 'function',
    hasSpawnTerminal: typeof service?.spawnTerminal === 'function',
  }
}

interface ObserverRegistration {
  readonly available: boolean
  readonly dispose?: () => void
}

/**
 * Verify that the Cordis waterfall seam can be registered before claiming
 * verified attribution. The listener is deliberately a pass-through; Ticket
 * 02 layers the PID observer into this same seam.
 */
function installObserverContract(ctx: PluginContext): ObserverRegistration {
  if (typeof ctx.on !== 'function') return { available: false }
  try {
    const dispose = ctx.on('internal/get', (_caller, _name, _error, next) => {
      if (typeof next === 'function') return next()
      return undefined
    })
    return {
      available: true,
      dispose: typeof dispose === 'function' ? dispose as () => void : undefined,
    }
  } catch {
    return { available: false }
  }
}

/** Mount the Bundle's health service and no process-owning resources. */
export function apply(ctx: PluginContext): void {
  const observer = installObserverContract(ctx)
  const subprocess = readSubprocessProbe(ctx)
  let snapshot = evaluateCompatibility({
    platform,
    detectedDshVersion: readInstalledDshVersion(),
    expectedDshVersion: SUPPORTED_DSH_VERSION,
    hasObserverContract: observer.available,
    ...subprocess,
  })
  let active = true
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
  }
  ctx.provide('runtimeInspector', service)
  refresh(0)
  ctx.effect(() => () => {
    active = false
    if (retryTimer !== undefined) clearTimeout(retryTimer)
    observer.dispose?.()
  }, 'runtime inspector lifecycle')
}

export default { name, apply }
