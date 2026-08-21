import type { ProcessOrigin } from './attribution.js'
import {
  createWindowsExternalProcessAdapter,
  type ExternalProcessAdapter,
  type ExternalProcessSnapshot,
} from './process-actions.js'
import type { ListenerRecord, WindowsListenerScanner } from './windows-scanner.js'

export interface ExternalTerminationSelection {
  readonly owningPid: number
  readonly processCreatedAt?: string
  readonly executable?: string
  readonly localPort?: number
  readonly protocol?: 'tcp4' | 'tcp6'
  readonly localAddress?: string
  readonly confidence?: 'verified' | 'inferred' | 'unattributed'
  readonly jobId?: string
  readonly terminalSessionId?: string
}

export interface ExternalTerminationRequest {
  /** The UI confirmation boundary. `true` is required for every action. */
  readonly confirmed?: boolean
}

export type ExternalTerminationReason =
  | 'compatibility-disabled'
  | 'confirmation-required'
  | 'invalid-selection'
  | 'managed-owner'
  | 'identity-incomplete'
  | 'pid-mismatch'
  | 'creation-identity-mismatch'
  | 'executable-mismatch'
  | 'current-user-unavailable'
  | 'other-user'
  | 'system-process'
  | 'protected-process'
  | 'access-denied'
  | 'termination-failed'

export interface ExternalTerminationResult {
  readonly ok: boolean
  readonly action: 'external-single-pid'
  readonly status: 'completed' | 'denied' | 'failed'
  readonly pid: number | undefined
  readonly port: number | undefined
  readonly portReleased: boolean | undefined
  readonly rescan: readonly ListenerRecord[]
  readonly revalidated: boolean
  readonly reason?: ExternalTerminationReason
  readonly error?: string
}

export interface ExternalTerminationOptions {
  readonly scanner: WindowsListenerScanner
  readonly origins?: () => readonly ProcessOrigin[]
  readonly adapter?: ExternalProcessAdapter
  readonly enabled?: () => boolean
}

function validPid(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function errorText(error: unknown): string {
  try {
    return error instanceof Error ? error.message : String(error)
  } catch {
    return '<unprintable external termination error>'
  }
}

function executableKey(value: string): string {
  return value.trim().replaceAll('/', '\\').toLowerCase()
}

function executableMatches(selected: string, fresh: string): boolean {
  const selectedKey = executableKey(selected)
  const freshKey = executableKey(fresh)
  if (selectedKey === freshKey) return true
  const selectedBase = selectedKey.slice(Math.max(selectedKey.lastIndexOf('\\'), selectedKey.lastIndexOf('/')) + 1)
  const freshBase = freshKey.slice(Math.max(freshKey.lastIndexOf('\\'), freshKey.lastIndexOf('/')) + 1)
  // The scanner deliberately exposes a bounded basename while the native
  // action adapter can read the full image path. Compare basenames only when
  // one side has no path, while retaining exact path fencing otherwise.
  return !selectedKey.includes('\\') && !selectedKey.includes('/')
    ? selectedBase === freshBase
    : !freshKey.includes('\\') && !freshKey.includes('/') && selectedBase === freshBase
}

function samePort(target: ExternalTerminationSelection, row: ListenerRecord): boolean {
  if (target.localPort === undefined) return false
  if (row.localPort !== target.localPort) return false
  if (target.protocol !== undefined && row.protocol !== target.protocol) return false
  return true
}

function freezeResult(result: ExternalTerminationResult): ExternalTerminationResult {
  return Object.freeze({ ...result, rescan: Object.freeze([...result.rescan]) })
}

/**
 * Performs one explicitly confirmed, identity-fenced external termination.
 * It has no process-tree operation and does not call the managed lifecycle
 * registry; those are intentionally separate actions.
 */
export class ExternalProcessTerminator {
  private readonly origins: () => readonly ProcessOrigin[]
  private readonly adapter: ExternalProcessAdapter
  private readonly enabled: () => boolean

  constructor(private readonly options: ExternalTerminationOptions) {
    this.origins = options.origins ?? (() => [])
    this.adapter = options.adapter ?? createWindowsExternalProcessAdapter()
    this.enabled = options.enabled ?? (() => true)
  }

  async terminate(
    target: ExternalTerminationSelection,
    request: ExternalTerminationRequest = {},
  ): Promise<ExternalTerminationResult> {
    const pid = validPid(target?.owningPid) ? target.owningPid : undefined
    const port = typeof target?.localPort === 'number' ? target.localPort : undefined
    const emptyRescan = (): readonly ListenerRecord[] => []
    const rescan = (): { readonly rows: readonly ListenerRecord[]; readonly complete: boolean } => {
      try {
        const origins = this.origins()
        const scan = this.options.scanner.scanWithStatus(Array.isArray(origins) ? origins : [])
        return { rows: scan.rows, complete: scan.complete }
      } catch {
        return { rows: emptyRescan(), complete: false }
      }
    }
    const denied = (reason: ExternalTerminationReason, revalidated = false): ExternalTerminationResult => freezeResult({
      ok: false,
      action: 'external-single-pid',
      status: 'denied',
      pid,
      port,
      portReleased: undefined,
      rescan: emptyRescan(),
      revalidated,
      reason,
    })

    let enabled = false
    try { enabled = this.enabled() } catch { enabled = false }
    if (!enabled) return denied('compatibility-disabled')
    if (request.confirmed !== true) return denied('confirmation-required')
    if (pid === undefined || !nonEmptyString(target?.processCreatedAt) || !nonEmptyString(target?.executable)) {
      return denied('invalid-selection')
    }
    // A managed owner is never downgraded to a direct PID action, even when
    // the caller presents a confirmation for the listener row.
    if (nonEmptyString(target?.jobId) || nonEmptyString(target?.terminalSessionId)) {
      return denied('managed-owner')
    }

    let lease: ReturnType<ExternalProcessAdapter['openForTermination']>
    try {
      lease = this.adapter.openForTermination(pid)
    } catch (error) {
      return freezeResult({ ...denied('access-denied'), status: 'failed', error: errorText(error) })
    }
    if (lease === undefined) return denied('access-denied')

    let snapshot: ExternalProcessSnapshot
    let terminated = false
    try {
      const candidate = objectValue(lease.snapshot)
      if (candidate === undefined) return denied('identity-incomplete', true)
      snapshot = candidate as unknown as ExternalProcessSnapshot
      if (snapshot.pid !== pid) return denied('pid-mismatch', true)
      if (snapshot.processCreatedAt !== target.processCreatedAt) return denied('creation-identity-mismatch', true)
      if (!executableMatches(target.executable, snapshot.executable)) return denied('executable-mismatch', true)
      if (!nonEmptyString(snapshot.userId) || typeof snapshot.protectedProcess !== 'boolean' || typeof snapshot.systemProcess !== 'boolean') {
        return denied('identity-incomplete', true)
      }
      if (snapshot.systemProcess || pid === 4) return denied('system-process', true)
      let currentUserId: string | undefined
      try {
        currentUserId = this.adapter.currentUserId()
      } catch {
        return denied('current-user-unavailable', true)
      }
      if (!nonEmptyString(currentUserId)) return denied('current-user-unavailable', true)
      if (snapshot.userId.toUpperCase() !== currentUserId.toUpperCase()) return denied('other-user', true)
      if (snapshot.protectedProcess) return denied('protected-process', true)
      if (snapshot.canTerminate !== true) return denied('access-denied', true)
      terminated = lease.terminate()
    } catch (error) {
      return freezeResult({ ...denied('termination-failed', true), status: 'failed', error: errorText(error) })
    } finally {
      try { lease.close() } catch { /* containment */ }
    }
    if (!terminated) {
      return freezeResult({ ...denied('termination-failed', true), status: 'failed' })
    }

    const after = rescan()
    const portReleased = port === undefined || !after.complete
      ? undefined
      : !after.rows.some(row => samePort(target, row))
    return freezeResult({
      ok: true,
      action: 'external-single-pid',
      status: 'completed',
      pid,
      port,
      portReleased,
      rescan: after.rows,
      revalidated: true,
    })
  }
}

export type { ExternalProcessAdapter, ExternalProcessSnapshot }
