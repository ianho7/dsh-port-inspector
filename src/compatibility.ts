/** The first DSH release whose public runtime contracts this Bundle tested. */
export const SUPPORTED_DSH_VERSION = '0.1.0-rc.8' as const
/**
 * Releases certified for the private delayed-Terminal readiness repair.
 * Public capabilities are probed at runtime and are not gated by this list.
 */
export const SUPPORTED_DSH_VERSIONS: readonly string[] = Object.freeze([
  SUPPORTED_DSH_VERSION,
  '0.1.1-rc.1',
  '0.1.1-rc.2',
])

export type CompatibilityMode = 'observing' | 'read-only-degraded'
export type ExecutionWorld = 'windows-local' | 'unsupported'
export type CompatibilityReason =
  | 'windows-only'
  | 'execution-world-unsupported'
  | 'subprocess-contract-unavailable'
  | 'observer-contract-unavailable'

export interface CompatibilityProbe {
  readonly platform: string
  readonly detectedDshVersion: string | undefined
  readonly expectedDshVersion: string
  readonly compatibleDshVersions?: readonly string[]
  readonly subprocessProvider: string | undefined
  readonly hasSpawn: boolean
  readonly hasSpawnTerminal: boolean
  readonly hasObserverContract: boolean
}

export interface CompatibilitySnapshot {
  readonly mode: CompatibilityMode
  readonly executionWorld: ExecutionWorld
  readonly verifiedAttributionEnabled: boolean
  readonly terminationEnabled: boolean
  readonly observerContractAvailable: boolean
  readonly privateTerminalRepairEnabled: boolean
  readonly platform: string
  readonly detectedDshVersion: string | undefined
  readonly expectedDshVersion: string
  readonly subprocessProvider: string | undefined
  readonly reason: CompatibilityReason | undefined
}

/**
 * Decide which capabilities are available from the contracts observed now.
 * DSH version is diagnostic metadata, not a product or feature gate.
 */
export function evaluateCompatibility(probe: CompatibilityProbe): CompatibilitySnapshot {
  let reason: CompatibilityReason | undefined
  if (probe.platform !== 'win32') reason = 'windows-only'
  else if (probe.subprocessProvider !== 'LocalSubprocessRuntime') reason = 'execution-world-unsupported'
  else if (!probe.hasSpawn || !probe.hasSpawnTerminal) reason = 'subprocess-contract-unavailable'
  else if (!probe.hasObserverContract) reason = 'observer-contract-unavailable'

  const snapshot: CompatibilitySnapshot = {
    mode: reason === undefined ? 'observing' : 'read-only-degraded',
    executionWorld: probe.platform === 'win32'
      && probe.subprocessProvider === 'LocalSubprocessRuntime'
      && probe.hasSpawn
      && probe.hasSpawnTerminal
      ? 'windows-local'
      : 'unsupported',
    verifiedAttributionEnabled: reason === undefined,
    // External single-PID handling is independent of DSH attribution. The
    // native adapter still revalidates every safety fence at execution time.
    terminationEnabled: probe.platform === 'win32',
    observerContractAvailable: probe.hasObserverContract,
    privateTerminalRepairEnabled: (probe.compatibleDshVersions ?? [probe.expectedDshVersion])
      .includes(probe.detectedDshVersion ?? ''),
    platform: probe.platform,
    detectedDshVersion: probe.detectedDshVersion,
    expectedDshVersion: probe.expectedDshVersion,
    subprocessProvider: probe.subprocessProvider,
    reason,
  }
  return Object.freeze(snapshot)
}
