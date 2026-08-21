/** Exact-version compatibility repair for node-pty's delayed Windows PID. */

export type TerminalPidMode = 'native' | 'compatibility-repair' | 'unavailable'

export interface TerminalReadinessResult {
  readonly handle: unknown
  readonly mode: TerminalPidMode
  readonly pid?: number
  readonly reason?: 'inactive' | 'unsupported-handle' | 'exited' | 'timeout' | 'repair-failed'
}

export interface TerminalReadinessOptions {
  readonly enabled: () => boolean
  readonly timeoutMs?: number
  readonly pollIntervalMs?: number
}

interface DisposableLike {
  dispose(): void
}

interface PtyLike {
  readonly pid?: unknown
  readonly onData?: (listener: (data: string) => void) => DisposableLike
}

interface ProcessIdentityLike {
  readonly pid?: unknown
  readonly started?: unknown
}

interface ProcessInspectorLike {
  readonly processTree?: (pid: number) => readonly ProcessIdentityLike[]
}

interface DelayedTerminalHandleLike {
  pid?: unknown
  rootIdentity?: unknown
  readonly terminal?: PtyLike
  readonly inspector?: ProcessInspectorLike
  readonly done?: Promise<unknown>
  readonly constructor?: { readonly name?: unknown }
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function positivePid(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : undefined
}

function writableOwnDataProperty(target: object, name: string): boolean {
  const descriptor = Object.getOwnPropertyDescriptor(target, name)
  return descriptor !== undefined && 'value' in descriptor && descriptor.writable === true
}

function delayedHandle(value: unknown): DelayedTerminalHandleLike | undefined {
  const handle = recordValue(value) as DelayedTerminalHandleLike | undefined
  if (handle?.constructor?.name !== 'LocalTerminalHandle') return undefined
  if (!writableOwnDataProperty(handle, 'pid') || !writableOwnDataProperty(handle, 'rootIdentity')) return undefined
  if (recordValue(handle.terminal) === undefined || typeof handle.terminal?.onData !== 'function') return undefined
  if (recordValue(handle.inspector) === undefined || typeof handle.inspector?.processTree !== 'function') return undefined
  if (handle.done === undefined || typeof handle.done.then !== 'function') return undefined
  return handle
}

function exactRoot(inspector: ProcessInspectorLike, pid: number): ProcessIdentityLike | undefined {
  try {
    const members = inspector.processTree?.(pid)
    if (!Array.isArray(members)) return undefined
    return members.find(member => member.pid === pid && typeof member.started === 'string' && member.started.length > 0)
  } catch {
    return undefined
  }
}

/**
 * Wait for a known Stock DSH LocalTerminalHandle's private node-pty PID and
 * restore the two fields DSH captured before ConPTY finished connecting.
 * Unsupported shapes remain untouched and never produce a verified PID.
 */
export async function repairDelayedTerminalHandle(
  value: unknown,
  options: TerminalReadinessOptions,
): Promise<TerminalReadinessResult> {
  const publicPid = positivePid(recordValue(value)?.pid)
  if (publicPid !== undefined) return { handle: value, mode: 'native', pid: publicPid }
  let enabled: boolean
  try {
    enabled = options.enabled()
  } catch {
    enabled = false
  }
  if (!enabled) return { handle: value, mode: 'unavailable', reason: 'inactive' }
  const handle = delayedHandle(value)
  if (handle === undefined) return { handle: value, mode: 'unavailable', reason: 'unsupported-handle' }

  const timeoutMs = options.timeoutMs ?? 2_000
  const pollIntervalMs = options.pollIntervalMs ?? 10
  return await new Promise<TerminalReadinessResult>((resolve) => {
    let settled = false
    let dataDisposable: DisposableLike | undefined
    let pollTimer: ReturnType<typeof setTimeout> | undefined
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined

    const finish = (result: TerminalReadinessResult): void => {
      if (settled) return
      settled = true
      if (pollTimer !== undefined) clearTimeout(pollTimer)
      if (timeoutTimer !== undefined) clearTimeout(timeoutTimer)
      try { dataDisposable?.dispose() } catch {}
      resolve(result)
    }

    const attempt = (): void => {
      if (settled) return
      let active: boolean
      try {
        active = options.enabled()
      } catch {
        active = false
      }
      if (!active) {
        finish({ handle: value, mode: 'unavailable', reason: 'inactive' })
        return
      }
      const pid = positivePid(handle.terminal?.pid)
      if (pid === undefined) return
      const identity = handle.inspector === undefined ? undefined : exactRoot(handle.inspector, pid)
      if (identity === undefined) return
      const previousPid = handle.pid
      const previousRootIdentity = handle.rootIdentity
      try {
        handle.rootIdentity = identity
        handle.pid = pid
        if (handle.pid !== pid || handle.rootIdentity !== identity) throw new Error('terminal identity repair was not retained')
      } catch {
        try {
          handle.pid = previousPid
          handle.rootIdentity = previousRootIdentity
        } catch {}
        finish({ handle: value, mode: 'unavailable', reason: 'repair-failed' })
        return
      }
      finish({ handle: value, mode: 'compatibility-repair', pid })
    }

    try {
      dataDisposable = handle.terminal?.onData?.(() => { attempt() })
    } catch {
      finish({ handle: value, mode: 'unavailable', reason: 'unsupported-handle' })
      return
    }
    void handle.done?.then(
      () => { finish({ handle: value, mode: 'unavailable', reason: 'exited' }) },
      () => { finish({ handle: value, mode: 'unavailable', reason: 'exited' }) },
    )
    const poll = (): void => {
      attempt()
      if (!settled) pollTimer = setTimeout(poll, pollIntervalMs)
    }
    timeoutTimer = setTimeout(() => {
      finish({ handle: value, mode: 'unavailable', reason: 'timeout' })
    }, timeoutMs)
    poll()
  })
}
