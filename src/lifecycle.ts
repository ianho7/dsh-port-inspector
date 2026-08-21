import { AsyncLocalStorage } from 'node:async_hooks'
import type { ProcessOrigin, ProcessOriginRegistry } from './attribution.js'

export interface JobSnapshotLike {
  readonly id?: unknown
  readonly status?: unknown
}

export interface JobRegistryLike {
  list(owner?: unknown): readonly JobSnapshotLike[]
  onJobsChanged(listener: (owner?: unknown) => void): unknown
  kill(id: unknown, owner?: unknown, reason?: string): unknown
  wait(id: unknown, timeoutMs: number, owner?: unknown, signal?: AbortSignal): Promise<JobSnapshotLike>
}

export interface TerminalSessionSnapshotLike {
  readonly sessionId?: unknown
  readonly pid?: unknown
}

export interface TerminalServiceLike {
  list(owner: unknown): readonly TerminalSessionSnapshotLike[]
  kill(owner: unknown, sessionId: unknown, reason?: string): Promise<unknown>
}

export interface LifecycleExecutionOptions {
  readonly callId: string
  readonly owner?: unknown
  readonly jobs?: unknown
  readonly terminals?: unknown
}

export interface LifecycleShutdownOptions {
  readonly reason?: string
  readonly jobWaitMs?: number
}

export interface ManagedShutdownResult {
  readonly ok: boolean
  readonly originId: number
  readonly ownerKind?: 'job' | 'terminal'
  readonly ownerId?: string
  readonly status: 'completed' | 'failed' | 'unmanaged'
  readonly escalated: false
  readonly stage?: 'kill' | 'wait' | 'quiescence'
  readonly reason?: string
  readonly error?: string
}

export interface LifecycleBinding {
  readonly originId: number
  readonly ownerKind: 'job' | 'terminal'
  readonly ownerId: string
}

interface OriginRegistryLike {
  list(): readonly ProcessOrigin[]
  update?(id: number, patch: { readonly jobId?: string; readonly terminalSessionId?: string }): ProcessOrigin | undefined
}

interface BindingState extends LifecycleBinding {
  readonly owner: unknown
  readonly jobs?: JobRegistryLike
  readonly terminals?: TerminalServiceLike
}

interface CaptureState {
  readonly options: LifecycleExecutionOptions
  readonly originIdsBefore: ReadonlySet<number>
  readonly jobIdsBefore: ReadonlySet<string>
  readonly jobs?: JobRegistryLike
  readonly terminals?: TerminalServiceLike
  knownJobIds: Set<string>
  readonly observedJobIds: Set<string>
  readonly jobOriginIds: Map<string, ReadonlySet<number>>
  observerRegistered: boolean
  disposer?: () => void
  closed: boolean
}

const DEFAULT_JOB_WAIT_MS = 5_000

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function pidValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : undefined
}

function listJobs(jobs: JobRegistryLike | undefined, owner: unknown): readonly JobSnapshotLike[] {
  if (jobs === undefined) return []
  try {
    const listed = jobs.list(owner)
    return Array.isArray(listed) ? listed : []
  } catch {
    return []
  }
}

function jobIds(jobs: readonly JobSnapshotLike[]): Set<string> {
  const result = new Set<string>()
  for (const job of jobs) {
    const id = stringValue(job?.id)
    if (id !== undefined) result.add(id)
  }
  return result
}

function terminalService(value: unknown): TerminalServiceLike | undefined {
  const record = objectValue(value)
  return record !== undefined
    && typeof record.list === 'function'
    && typeof record.kill === 'function'
    ? value as TerminalServiceLike
    : undefined
}

function jobService(value: unknown): JobRegistryLike | undefined {
  const record = objectValue(value)
  return record !== undefined
    && typeof record.list === 'function'
    && typeof record.onJobsChanged === 'function'
    && typeof record.kill === 'function'
    && typeof record.wait === 'function'
    ? value as JobRegistryLike
    : undefined
}

function terminalSnapshot(
  terminals: TerminalServiceLike | undefined,
  owner: unknown,
): readonly TerminalSessionSnapshotLike[] {
  if (terminals === undefined) return []
  try {
    const listed = terminals.list(owner)
    return Array.isArray(listed) ? listed : []
  } catch {
    return []
  }
}

function terminalIdFor(
  origin: ProcessOrigin,
  terminals: TerminalServiceLike | undefined,
  owner: unknown,
): string | undefined {
  const sessionId = stringValue(origin.terminalSessionId)
  if (sessionId === undefined || terminals === undefined) return undefined
  const exact = terminalSnapshot(terminals, owner).find(session =>
    stringValue(session.sessionId) === sessionId && pidValue(session.pid) === origin.rootPid,
  )
  return exact === undefined ? undefined : sessionId
}

function terminalStillPublished(
  terminals: TerminalServiceLike,
  owner: unknown,
  sessionId: string,
): boolean {
  return terminalSnapshot(terminals, owner).some(session => stringValue(session.sessionId) === sessionId)
}

function terminalJobStatus(value: unknown): boolean {
  return value === 'completed' || value === 'killed' || value === 'failed'
}

function errorText(error: unknown): string {
  try {
    return error instanceof Error ? error.message : String(error)
  } catch {
    return '<unprintable lifecycle error>'
  }
}

/**
 * Associates captured roots with DSH-owned Job/Terminal resources and exposes
 * only the owner APIs for managed shutdown. It never calls a PID primitive or
 * owns a subprocess provider.
 */
export class LifecycleOwnerRegistry {
  private readonly bindings = new Map<number, BindingState>()
  private readonly captures = new Set<CaptureState>()
  private readonly storage = new AsyncLocalStorage<CaptureState>()

  constructor(private readonly registry: OriginRegistryLike | ProcessOriginRegistry) {}

  beginExecution(options: LifecycleExecutionOptions): LifecycleCapture {
    const jobs = jobService(options.jobs)
    const terminals = terminalService(options.terminals)
    const jobIdsBefore = jobIds(listJobs(jobs, options.owner))
    const capture: CaptureState = {
      options,
      originIdsBefore: new Set(this.registry.list().map(origin => origin.id)),
      jobIdsBefore,
      jobs,
      terminals,
      knownJobIds: new Set(jobIdsBefore),
      observedJobIds: new Set<string>(),
      jobOriginIds: new Map<string, ReadonlySet<number>>(),
      observerRegistered: false,
      closed: false,
    }
    this.captures.add(capture)
    if (jobs !== undefined) {
      try {
        const disposer = jobs.onJobsChanged(() => {
          // DSH delivers this synchronously after committing the visible set.
          // Only the capture active in this ALS stack may claim the change;
          // concurrent calls for the same owner therefore cannot cross-link.
          const currentJobIds = jobIds(listJobs(capture.jobs, capture.options.owner))
          const changedJobIds = [...currentJobIds].filter(id => !capture.knownJobIds.has(id))
          capture.knownJobIds = currentJobIds
          if (this.storage.getStore() !== capture || capture.closed) return
          const originsAtPublication = new Set(this.registry.list()
            .filter(origin => !capture.originIdsBefore.has(origin.id) && origin.callId === capture.options.callId)
            .map(origin => origin.id))
          for (const id of changedJobIds) {
            capture.observedJobIds.add(id)
            capture.jobOriginIds.set(id, originsAtPublication)
          }
        })
        if (typeof disposer === 'function') {
          capture.disposer = disposer as () => void
          capture.observerRegistered = true
        }
      } catch {
        // Missing observer support is a safe no-link condition.
      }
    }
    return new LifecycleCapture(this, capture)
  }

  /** Return a public, service-free view of one managed owner binding. */
  bindingFor(originId: number): LifecycleBinding | undefined {
    const binding = this.bindings.get(originId)
    if (binding === undefined) return undefined
    return Object.freeze({
      originId: binding.originId,
      ownerKind: binding.ownerKind,
      ownerId: binding.ownerId,
    })
  }

  /** Close a managed owner through DSH and never fall back to PID termination. */
  async shutdown(originId: number, options: LifecycleShutdownOptions = {}): Promise<ManagedShutdownResult> {
    const binding = this.bindings.get(originId)
    if (binding === undefined) {
      return Object.freeze({
        ok: false,
        originId,
        status: 'unmanaged',
        escalated: false,
        reason: 'no-managed-owner',
      })
    }
    const reason = options.reason ?? 'runtime inspector request'
    if (binding.ownerKind === 'job' && binding.jobs !== undefined) {
      try {
        binding.jobs.kill(binding.ownerId, binding.owner, reason)
      } catch (error) {
        return Object.freeze({
          ok: false,
          originId,
          ownerKind: binding.ownerKind,
          ownerId: binding.ownerId,
          status: 'failed',
          escalated: false,
          stage: 'kill',
          error: errorText(error),
        })
      }
      const timeoutMs = options.jobWaitMs ?? DEFAULT_JOB_WAIT_MS
      if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
        return Object.freeze({
          ok: false,
          originId,
          ownerKind: binding.ownerKind,
          ownerId: binding.ownerId,
          status: 'failed',
          escalated: false,
          stage: 'wait',
          reason: 'invalid-job-wait-bound',
        })
      }
      let snapshot: JobSnapshotLike
      try {
        snapshot = await binding.jobs.wait(binding.ownerId, timeoutMs, binding.owner)
      } catch (error) {
        return Object.freeze({
          ok: false,
          originId,
          ownerKind: binding.ownerKind,
          ownerId: binding.ownerId,
          status: 'failed',
          escalated: false,
          stage: 'wait',
          error: errorText(error),
        })
      }
      if (!terminalJobStatus(snapshot?.status)) {
        return Object.freeze({
          ok: false,
          originId,
          ownerKind: binding.ownerKind,
          ownerId: binding.ownerId,
          status: 'failed',
          escalated: false,
          stage: 'wait',
          reason: 'job-not-settled',
        })
      }
      return Object.freeze({
        ok: true,
        originId,
        ownerKind: binding.ownerKind,
        ownerId: binding.ownerId,
        status: 'completed',
        escalated: false,
      })
    }
    if (binding.ownerKind === 'terminal' && binding.terminals !== undefined) {
      try {
        await binding.terminals.kill(binding.owner, binding.ownerId, reason)
      } catch (error) {
        return Object.freeze({
          ok: false,
          originId,
          ownerKind: binding.ownerKind,
          ownerId: binding.ownerId,
          status: 'failed',
          escalated: false,
          stage: 'kill',
          error: errorText(error),
        })
      }
      if (terminalStillPublished(binding.terminals, binding.owner, binding.ownerId)) {
        return Object.freeze({
          ok: false,
          originId,
          ownerKind: binding.ownerKind,
          ownerId: binding.ownerId,
          status: 'failed',
          escalated: false,
          stage: 'quiescence',
          reason: 'terminal-still-published',
        })
      }
      return Object.freeze({
        ok: true,
        originId,
        ownerKind: binding.ownerKind,
        ownerId: binding.ownerId,
        status: 'completed',
        escalated: false,
      })
    }
    return Object.freeze({
      ok: false,
      originId,
      ownerKind: binding.ownerKind,
      ownerId: binding.ownerId,
      status: 'failed',
      escalated: false,
      reason: 'owner-service-unavailable',
    })
  }

  /** Unload only observer-side state; no owner API or process is touched. */
  dispose(): void {
    for (const capture of [...this.captures]) this.closeCapture(capture)
    this.bindings.clear()
  }

  finishCapture(capture: CaptureState, structuredJobId?: string): void {
    if (capture.closed) return
    this.closeCapture(capture)
    const origins = this.registry.list().filter(origin =>
      !capture.originIdsBefore.has(origin.id) && origin.callId === capture.options.callId,
    )
    const afterJobs = jobIds(listJobs(capture.jobs, capture.options.owner))
    const observedNewJobs = [...capture.observedJobIds].filter(id => afterJobs.has(id))
    if (capture.observerRegistered && observedNewJobs.length === 1 && structuredJobId !== undefined && observedNewJobs[0] === structuredJobId) {
      const originsAtPublication = capture.jobOriginIds.get(structuredJobId)
      for (const origin of origins.filter(candidate => originsAtPublication?.has(candidate.id))) {
        if (this.registry.update?.(origin.id, { jobId: structuredJobId }) === undefined) continue
        this.bindings.set(origin.id, {
          originId: origin.id,
          ownerKind: 'job',
          ownerId: structuredJobId,
          owner: capture.options.owner,
          jobs: capture.jobs,
        })
      }
    }
    for (const origin of origins) {
      const sessionId = terminalIdFor(origin, capture.terminals, capture.options.owner)
      if (sessionId === undefined) continue
      if (this.registry.update?.(origin.id, { terminalSessionId: sessionId }) === undefined) continue
      this.bindings.set(origin.id, {
        originId: origin.id,
        ownerKind: 'terminal',
        ownerId: sessionId,
        owner: capture.options.owner,
        terminals: capture.terminals,
      })
    }
  }

  abortCapture(capture: CaptureState): void {
    if (capture.closed) return
    this.closeCapture(capture)
  }

  run<T>(capture: CaptureState, next: () => T): T {
    return this.storage.run(capture, next)
  }

  private closeCapture(capture: CaptureState): void {
    if (capture.closed) return
    capture.closed = true
    try {
      capture.disposer?.()
    } catch {
      // Observer disposal is containment-only and must not change Tool results.
    }
    capture.disposer = undefined
    this.captures.delete(capture)
  }
}

export class LifecycleCapture {
  constructor(
    private readonly owner: LifecycleOwnerRegistry,
    private readonly state: CaptureState,
  ) {}

  finish(structuredJobId?: string): void {
    this.owner.finishCapture(this.state, structuredJobId)
  }

  abort(): void {
    this.owner.abortCapture(this.state)
  }

  run<T>(next: () => T): T {
    return this.owner.run(this.state, next)
  }
}
