/** The exact DSH release whose Cordis and subprocess contracts this MVP tests. */
export const SUPPORTED_DSH_VERSION = '0.1.0-rc.8' as const
/** Additional releases admitted only after their full Stock DSH gate passes. */
export const SUPPORTED_DSH_VERSIONS: readonly string[] = Object.freeze([
  SUPPORTED_DSH_VERSION,
  '0.1.1-rc.1',
])

export type CompatibilityMode = 'observing' | 'read-only-degraded'
export type ExecutionWorld = 'windows-local' | 'unsupported'
export type CompatibilityReason =
  | 'windows-only'
  | 'dsh-version-unsupported'
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
  readonly platform: string
  readonly detectedDshVersion: string | undefined
  readonly expectedDshVersion: string
  readonly subprocessProvider: string | undefined
  readonly reason: CompatibilityReason | undefined
}

/**
 * Decide whether this plugin may make verified runtime claims. This is a pure
 * gate so the same decision is exercised by both the boot probe and tests.
 */
export function evaluateCompatibility(probe: CompatibilityProbe): CompatibilitySnapshot {
  let reason: CompatibilityReason | undefined
  const versions = probe.compatibleDshVersions ?? [probe.expectedDshVersion]
  if (probe.platform !== 'win32') reason = 'windows-only'
  else if (probe.detectedDshVersion === undefined || !versions.includes(probe.detectedDshVersion)) reason = 'dsh-version-unsupported'
  else if (probe.subprocessProvider !== 'LocalSubprocessRuntime') reason = 'execution-world-unsupported'
  else if (!probe.hasSpawn || !probe.hasSpawnTerminal) reason = 'subprocess-contract-unavailable'
  else if (!probe.hasObserverContract) reason = 'observer-contract-unavailable'

  const snapshot: CompatibilitySnapshot = {
    mode: reason === undefined ? 'observing' : 'read-only-degraded',
    executionWorld: reason === undefined ? 'windows-local' : 'unsupported',
    verifiedAttributionEnabled: reason === undefined,
    terminationEnabled: reason === undefined,
    observerContractAvailable: probe.hasObserverContract,
    platform: probe.platform,
    detectedDshVersion: probe.detectedDshVersion,
    expectedDshVersion: probe.expectedDshVersion,
    subprocessProvider: probe.subprocessProvider,
    reason,
  }
  return Object.freeze(snapshot)
}
