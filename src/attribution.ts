import { AsyncLocalStorage } from 'node:async_hooks'
import { commandAndWorkdir, redactCommand } from './redaction.js'
import { readWindowsProcessIdentity, type ProcessCreationIdentity } from './process-identity.js'
import { LifecycleOwnerRegistry, type LifecycleCapture } from './lifecycle.js'

export interface ToolExecutionLike {
  readonly callId?: unknown
  readonly rootCallId?: unknown
  readonly name?: unknown
  readonly turn?: unknown
  readonly step?: unknown
  readonly arguments?: unknown
  readonly agent?: {
    readonly id?: unknown
    readonly ctx?: {
      readonly get?: (name: string) => unknown
      readonly subprocess?: unknown
      readonly jobs?: unknown
      readonly terminals?: unknown
    }
    readonly session?: {
      readonly id?: unknown
      readonly header?: { readonly cwd?: unknown }
    }
  }
}

export interface ProcessOrigin {
  readonly id: number
  readonly rootPid: number
  readonly processCreatedAt: string
  readonly sessionId: string
  readonly agentId: string
  readonly turn: number
  readonly step: number
  readonly callId: string
  readonly rootCallId: string
  readonly tool: string
  readonly command?: string
  readonly workdir?: string
  readonly kind: 'spawn' | 'spawnTerminal'
  readonly jobId?: string
  readonly terminalSessionId?: string
  readonly observedAt: number
}

export interface ProcessOriginRegistryApi {
  readonly origins: readonly ProcessOrigin[]
  list(): readonly ProcessOrigin[]
}

const DEFAULT_ORIGIN_LIMIT = 4_096
const DEFAULT_CALL_LIMIT = 4_096

interface ProcessOriginEntry extends ProcessOrigin {
  readonly handle: unknown
}

export class ProcessOriginRegistry implements ProcessOriginRegistryApi {
  private readonly entries: ProcessOriginEntry[] = []
  private nextId = 1

  constructor(private readonly maxEntries = DEFAULT_ORIGIN_LIMIT) {
    if (!Number.isSafeInteger(maxEntries) || maxEntries <= 0) {
      throw new RangeError('maxEntries must be a positive safe integer')
    }
  }

  get origins(): readonly ProcessOrigin[] {
    return this.list()
  }

  list(): readonly ProcessOrigin[] {
    return Object.freeze(this.entries.map(({ handle: _handle, ...origin }) => Object.freeze(origin)))
  }

  /** Return the exact handle retained for a registry entry, for later lifecycle work. */
  getHandle(id: number): unknown {
    return this.entries.find(entry => entry.id === id)?.handle
  }

  update(id: number, patch: { readonly jobId?: string; readonly terminalSessionId?: string }): ProcessOrigin | undefined {
    const index = this.entries.findIndex(entry => entry.id === id)
    if (index < 0) return undefined
    const current = this.entries[index]
    const updated: ProcessOriginEntry = Object.freeze({ ...current, ...patch })
    this.entries[index] = updated
    const { handle: _handle, ...origin } = updated
    return origin
  }

  record(input: Omit<ProcessOrigin, 'id' | 'observedAt'> & { handle: unknown }): ProcessOrigin | undefined {
    if (!Number.isSafeInteger(input.rootPid) || input.rootPid <= 0 || input.processCreatedAt.length === 0) return undefined
    const duplicate = this.entries.find(entry => entry.handle === input.handle)
    if (duplicate !== undefined) {
      const { handle: _handle, ...origin } = duplicate
      return origin
    }
    const origin: ProcessOriginEntry = Object.freeze({
      id: this.nextId++,
      ...input,
      observedAt: Date.now(),
    })
    if (this.entries.length >= this.maxEntries) this.entries.shift()
    this.entries.push(origin)
    return origin
  }
}

interface ToolCallContext {
  readonly sessionId?: string
  readonly agentId?: string
  readonly turn?: number
  readonly step?: number
  readonly callId: string
  readonly tool: string
  readonly command?: string
  readonly workdir?: string
}

export interface RuntimeAttributionOptions {
  readonly enabled: () => boolean
  readonly readIdentity?: (pid: number) => ProcessCreationIdentity | undefined
  readonly registry?: ProcessOriginRegistry
  readonly lifecycle?: LifecycleOwnerRegistry
}

interface ToolExecutionFrame {
  readonly sessionId: string
  readonly agentId: string
  readonly turn: number
  readonly step: number
  readonly callId: string
  readonly tool: string
  readonly command?: string
  readonly workdir?: string
  readonly rootCallId: string
}

interface SubprocessHandleLike {
  readonly pid?: unknown
}

interface SubprocessSpawnSpecLike {
  readonly cwd?: unknown
  readonly env?: unknown
}

interface SubprocessServiceLike {
  readonly spawn?: (...args: unknown[]) => unknown
  readonly spawnTerminal?: (...args: unknown[]) => unknown
}

interface SessionEventLike {
  readonly type?: unknown
  readonly data?: unknown
}

interface ToolResultLike {
  readonly value?: unknown
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : undefined
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function extractJobId(value: unknown): string | undefined {
  const outer = recordValue(value)
  const candidate = recordValue(outer?.value) ?? outer
  return stringValue(candidate?.jobId)
}

function sessionKey(sessionId: string | undefined, callId: string): string {
  return `${sessionId ?? ''}\u0000${callId}`
}

function parseLoggedArguments(value: unknown): unknown {
  if (typeof value !== 'string' || value.length === 0) return {}
  try {
    return JSON.parse(value) as unknown
  } catch {
    return value
  }
}

function canPatch(target: object, descriptor: PropertyDescriptor | undefined): boolean {
  try {
    if (descriptor === undefined) return Object.isExtensible(target)
    if (!('value' in descriptor)) return false
    return descriptor.configurable === true || descriptor.writable === true
  } catch {
    return false
  }
}

function restoreDescriptor(target: object, property: string, descriptor: PropertyDescriptor | undefined): void {
  if (descriptor !== undefined) Object.defineProperty(target, property, descriptor)
  else delete (target as Record<string, unknown>)[property]
}

/** Correlates DSH Tool Execution frames with subprocess handles without owning them. */
export class RuntimeAttribution {
  readonly registry: ProcessOriginRegistry
  private readonly storage = new AsyncLocalStorage<ToolExecutionFrame>()
  private readonly calls = new Map<string, ToolCallContext>()
  private readonly proxies = new WeakMap<object, object>()
  private readonly enabled: () => boolean
  private readonly readIdentity: (pid: number) => ProcessCreationIdentity | undefined
  private readonly lifecycle?: LifecycleOwnerRegistry
  private readonly resultJobIds = new Map<string, string>()
  private readonly providerDisposers = new WeakMap<object, () => void>()
  private readonly providerDisposerSet = new Set<() => void>()
  private active = true

  constructor(options: RuntimeAttributionOptions) {
    this.registry = options.registry ?? new ProcessOriginRegistry()
    this.enabled = options.enabled
    this.readIdentity = options.readIdentity ?? readWindowsProcessIdentity
    this.lifecycle = options.lifecycle
  }

  /** Observe a synchronous Session `tool/call` publication before Tool Execution dispatch. */
  observeSessionEvent(session: unknown, event: SessionEventLike): void {
    if (event.type !== 'tool/call') return
    const sessionRecord = recordValue(session)
    const data = recordValue(event.data)
    const sessionId = stringValue(sessionRecord?.id)
    const callId = stringValue(data?.callId)
    const tool = stringValue(data?.name)
    if (callId === undefined || tool === undefined) return
    const signal = commandAndWorkdir(parseLoggedArguments(data?.arguments), sessionRecord?.header && recordValue(sessionRecord.header)?.cwd)
    const key = sessionKey(sessionId, callId)
    if (!this.calls.has(key) && this.calls.size >= DEFAULT_CALL_LIMIT) {
      const oldest = this.calls.keys().next().value
      if (typeof oldest === 'string') this.calls.delete(oldest)
    }
    this.calls.set(key, Object.freeze({
      sessionId,
      callId,
      tool,
      turn: numberValue(data?.turn),
      step: numberValue(data?.step),
      command: signal.command,
      workdir: signal.workdir,
    }))
  }

  /** Enter one exact Tool Execution frame around the DSH tools/execute waterfall. */
  runToolExecution<T>(execution: ToolExecutionLike, next: () => T): T {
    try {
      const consumerContext = execution.agent?.ctx
      const service = consumerContext?.subprocess ?? consumerContext?.get?.('subprocess')
      this.patchSubprocessProvider(service)
    } catch {
      // A consumer context may not expose the service during teardown; the
      // attribution frame still runs and the provider remains untouched.
    }
    let frame: ToolExecutionFrame | undefined
    try {
      frame = this.frameFor(execution)
    } catch {
      return next()
    }
    if (frame === undefined) return next()
    const lifecycle = this.beginLifecycleCapture(execution, frame)
    let result: T
    try {
      result = this.storage.run(frame, () => lifecycle === undefined ? next() : lifecycle.run(next))
    } catch (error) {
      lifecycle?.abort()
      throw error
    }
    if (result !== null && typeof result === 'object' && typeof (result as { then?: unknown }).then === 'function') {
      return Promise.resolve(result).then(
        value => {
          const key = sessionKey(frame.sessionId, frame.callId)
          const structuredJobId = this.resultJobIds.get(key) ?? extractJobId(value)
          this.resultJobIds.delete(key)
          try {
            lifecycle?.finish(structuredJobId)
          } catch {
            lifecycle?.abort()
          }
          return value
        },
        error => {
          this.resultJobIds.delete(sessionKey(frame.sessionId, frame.callId))
          lifecycle?.abort()
          throw error
        },
      ) as T
    }
    const key = sessionKey(frame.sessionId, frame.callId)
    const structuredJobId = this.resultJobIds.get(key) ?? extractJobId(result)
    this.resultJobIds.delete(key)
    try {
      lifecycle?.finish(structuredJobId)
    } catch {
      lifecycle?.abort()
    }
    return result
  }

  /** Read the current frame for tests and future managed-lifecycle joins. */
  currentFrame(): Readonly<ToolExecutionFrame> | undefined {
    return this.storage.getStore()
  }

  /** Observe the immutable tools/result outcome for the Job cross-check. */
  observeToolResult(execution: unknown, result: unknown): void {
    try {
      const value = recordValue(execution)
      const callId = stringValue(value?.callId)
      const agent = recordValue(value?.agent)
      const session = recordValue(agent?.session)
      const sessionId = stringValue(session?.id) ?? stringValue(agent?.id)
      const jobId = extractJobId(result)
      if (callId === undefined || sessionId === undefined || jobId === undefined) return
      if (this.resultJobIds.size >= DEFAULT_CALL_LIMIT) {
        const oldest = this.resultJobIds.keys().next().value
        if (typeof oldest === 'string') this.resultJobIds.delete(oldest)
      }
      this.resultJobIds.set(sessionKey(sessionId, callId), jobId)
    } catch {
      // Final-result observation is best-effort and never changes the tool result.
    }
  }

  /** Wrap only subprocess spawn methods; every other property and identity passes through unchanged. */
  decorateSubprocessService(service: unknown): unknown {
    if (service === null || typeof service !== 'object') return service
    const target = service as SubprocessServiceLike & object
    const cached = this.proxies.get(target)
    if (cached !== undefined) return cached
    const originalSpawn = typeof target.spawn === 'function' ? target.spawn.bind(target) : undefined
    const originalSpawnTerminal = typeof target.spawnTerminal === 'function' ? target.spawnTerminal.bind(target) : undefined
    const runtime = this
    const proxy = new Proxy(target, {
      get(current, property, receiver) {
        if (property === 'spawn' && originalSpawn !== undefined) {
          return (...args: unknown[]) => {
            const handle = originalSpawn(...args)
            runtime.observeHandle(handle, 'spawn', args)
            return handle
          }
        }
        if (property === 'spawnTerminal' && originalSpawnTerminal !== undefined) {
          return (...args: unknown[]) => {
            const result = originalSpawnTerminal(...args)
            return Promise.resolve(result).then(handle => {
              runtime.observeHandle(handle, 'spawnTerminal', args)
              return handle
            })
          }
        }
        return Reflect.get(current, property, receiver)
      },
    })
    this.proxies.set(target, proxy)
    return proxy
  }

  /**
   * Install a reversible method-level fallback for providers whose context
   * service read is satisfied before Cordis emits `internal/get`. This keeps
   * the provider and its ownership semantics intact: only the two spawn
   * methods are wrapped, and disposal restores the exact prior descriptors
   * when no later decorator has replaced them.
   */
  patchSubprocessProvider(service: unknown): (() => void) | undefined {
    if (!this.observationAllowed() || service === null || typeof service !== 'object') return undefined
    // Cordis returns a traceable service proxy from context reads.  Patch the
    // underlying provider object so every context proxy observes the same
    // wrapper; patching only the traceable facade can leave a sibling facade
    // with the original method.
    const originalSymbol = Symbol.for('cordis.original')
    let target = service as SubprocessServiceLike & object
    try {
      for (let depth = 0; depth < 4; depth += 1) {
        const original = (target as Record<PropertyKey, unknown>)[originalSymbol]
        if (original === null || typeof original !== 'object' || original === target) break
        target = original as SubprocessServiceLike & object
      }
    } catch {
      return undefined
    }
    let providerName: unknown
    let existing: (() => void) | undefined
    let originalSpawn: SubprocessServiceLike['spawn']
    let originalSpawnTerminal: SubprocessServiceLike['spawnTerminal']
    let spawnDescriptor: PropertyDescriptor | undefined
    let terminalDescriptor: PropertyDescriptor | undefined
    try {
      providerName = (target as { readonly constructor?: { readonly name?: unknown } }).constructor?.name
      existing = this.providerDisposers.get(target)
      originalSpawn = typeof target.spawn === 'function' ? target.spawn : undefined
      originalSpawnTerminal = typeof target.spawnTerminal === 'function' ? target.spawnTerminal : undefined
      spawnDescriptor = Object.getOwnPropertyDescriptor(target, 'spawn')
      terminalDescriptor = Object.getOwnPropertyDescriptor(target, 'spawnTerminal')
    } catch {
      return undefined
    }
    if (providerName !== 'LocalSubprocessRuntime' || existing !== undefined) return existing
    if (originalSpawn === undefined && originalSpawnTerminal === undefined) return undefined
    if ((originalSpawn !== undefined && !canPatch(target, spawnDescriptor))
      || (originalSpawnTerminal !== undefined && !canPatch(target, terminalDescriptor))) return undefined

    const runtime = this
    const wrappedSpawn = originalSpawn === undefined ? undefined : function (this: unknown, ...args: unknown[]) {
      const handle = Reflect.apply(originalSpawn, this, args)
      runtime.observeHandle(handle, 'spawn', args)
      return handle
    }
    const wrappedSpawnTerminal = originalSpawnTerminal === undefined ? undefined : function (this: unknown, ...args: unknown[]) {
      const result = Reflect.apply(originalSpawnTerminal, this, args)
      return Promise.resolve(result).then(handle => {
        runtime.observeHandle(handle, 'spawnTerminal', args)
        return handle
      })
    }

    let spawnPatched = false
    let terminalPatched = false
    try {
      if (wrappedSpawn !== undefined) Object.defineProperty(target, 'spawn', {
        configurable: spawnDescriptor?.configurable ?? true,
        enumerable: spawnDescriptor?.enumerable ?? false,
        writable: spawnDescriptor && 'writable' in spawnDescriptor ? spawnDescriptor.writable : true,
        value: wrappedSpawn,
      })
      spawnPatched = wrappedSpawn !== undefined
      if (wrappedSpawnTerminal !== undefined) Object.defineProperty(target, 'spawnTerminal', {
        configurable: terminalDescriptor?.configurable ?? true,
        enumerable: terminalDescriptor?.enumerable ?? false,
        writable: terminalDescriptor && 'writable' in terminalDescriptor ? terminalDescriptor.writable : true,
        value: wrappedSpawnTerminal,
      })
      terminalPatched = wrappedSpawnTerminal !== undefined
    } catch {
      try {
        if (spawnPatched && target.spawn === wrappedSpawn) restoreDescriptor(target, 'spawn', spawnDescriptor)
        if (terminalPatched && target.spawnTerminal === wrappedSpawnTerminal) restoreDescriptor(target, 'spawnTerminal', terminalDescriptor)
      } catch {
        // A provider that rejects restoration is left untouched whenever the
        // preflight allowed it; any unexpected native/proxy failure is fenced.
      }
      return undefined
    }

    const dispose = (): void => {
      if (this.providerDisposers.get(target) !== dispose) return
      try {
        if (wrappedSpawn !== undefined && target.spawn === wrappedSpawn) {
          if (spawnDescriptor !== undefined) Object.defineProperty(target, 'spawn', spawnDescriptor)
          else delete (target as Record<string, unknown>).spawn
        }
        if (wrappedSpawnTerminal !== undefined && target.spawnTerminal === wrappedSpawnTerminal) {
          if (terminalDescriptor !== undefined) Object.defineProperty(target, 'spawnTerminal', terminalDescriptor)
          else delete (target as Record<string, unknown>).spawnTerminal
        }
      } finally {
        this.providerDisposers.delete(target)
        this.providerDisposerSet.delete(dispose)
      }
    }
    this.providerDisposers.set(target, dispose)
    this.providerDisposerSet.add(dispose)
    return dispose
  }

  /** Remove only this runtime's fallback wrappers when compatibility drops. */
  disableProviderPatches(): void {
    for (const dispose of [...this.providerDisposerSet]) dispose()
  }

  /** Stop recording while leaving every cached Proxy as a pass-through wrapper. */
  dispose(): void {
    this.active = false
    this.resultJobIds.clear()
    this.disableProviderPatches()
  }

  private observationAllowed(): boolean {
    try {
      return this.active && this.enabled()
    } catch {
      return false
    }
  }

  private frameFor(execution: ToolExecutionLike): ToolExecutionFrame | undefined {
    const callId = stringValue(execution.callId)
    const agentId = stringValue(execution.agent?.id)
    const sessionId = stringValue(execution.agent?.session?.id) ?? agentId
    const remembered = callId === undefined ? undefined : this.calls.get(sessionKey(sessionId, callId))
    const parent = this.storage.getStore()
    const args = commandAndWorkdir(execution.arguments, execution.agent?.session?.header?.cwd)
    const tool = stringValue(execution.name) ?? remembered?.tool
    if (callId === undefined || tool === undefined) return undefined
    const turn = remembered?.turn ?? numberValue(execution.turn) ?? parent?.turn
    const step = remembered?.step ?? numberValue(execution.step) ?? parent?.step
    if (sessionId === undefined || agentId === undefined || turn === undefined || step === undefined) return undefined
    const command = args.command ?? remembered?.command
    const workdir = args.workdir ?? remembered?.workdir
    return Object.freeze({
      sessionId: remembered?.sessionId ?? sessionId,
      agentId: remembered?.agentId ?? agentId,
      turn,
      step,
      callId,
      rootCallId: stringValue(execution.rootCallId) ?? callId,
      tool,
      command: command === undefined ? undefined : redactCommand(command),
      workdir,
    })
  }

  private observeHandle(handle: unknown, kind: ProcessOrigin['kind'], spawnArgs: readonly unknown[]): void {
    try {
      if (!this.active || !this.enabled()) {
        return
      }
      const frame = this.storage.getStore()
      if (frame === undefined) {
        return
      }
      const pid = numberValue((recordValue(handle) as SubprocessHandleLike | undefined)?.pid)
      if (pid === undefined || pid <= 0) {
        return
      }
      const identity = this.readIdentity(pid)
      if (identity === undefined || identity.pid !== pid || identity.createdAt.length === 0) {
        return
      }
      const spec = recordValue(spawnArgs[0]) as SubprocessSpawnSpecLike | undefined
      const terminalSessionId = kind === 'spawnTerminal' ? stringValue(recordValue(spec?.env)?.DSH_PTY_SESSION_ID) : undefined
      this.registry.record({
        handle,
        rootPid: pid,
        processCreatedAt: identity.createdAt,
        sessionId: frame.sessionId,
        agentId: frame.agentId,
        turn: frame.turn,
        step: frame.step,
        callId: frame.callId,
        rootCallId: frame.rootCallId,
        tool: frame.tool,
        command: frame.command,
        workdir: stringValue(spec?.cwd) ?? frame.workdir,
        kind,
        ...terminalSessionId === undefined ? {} : { terminalSessionId },
      })
    } catch {
      // Observation must never change provider behavior, including when a
      // native identity reader or registry implementation fails unexpectedly.
      return
    }
  }

  private beginLifecycleCapture(execution: ToolExecutionLike, frame: ToolExecutionFrame): LifecycleCapture | undefined {
    if (this.lifecycle === undefined) return undefined
    try {
      const context = execution.agent?.ctx
      const jobs = context?.jobs ?? context?.get?.('jobs')
      const terminals = context?.terminals ?? context?.get?.('terminals')
      return this.lifecycle.beginExecution({
        callId: frame.callId,
        owner: execution.agent,
        jobs,
        terminals,
      })
    } catch {
      return undefined
    }
  }
}

export interface RuntimeObserverContext {
  on(name: string, listener: (...args: unknown[]) => unknown, options?: { readonly global?: boolean }): unknown
}

export interface RuntimeObserverRegistration {
  readonly available: boolean
  readonly dispose: () => void
}

/** Register the observer seams used by the MVP. Registration failures fail closed. */
export function installRuntimeObservers(
  ctx: RuntimeObserverContext,
  runtime: RuntimeAttribution,
): RuntimeObserverRegistration {
  const disposers: (() => void)[] = []
  try {
    const internal = ctx.on('internal/get', (_caller, name, _error, next) => {
      const service = typeof next === 'function' ? next() : undefined
      if (name !== 'subprocess') return service
      try {
        return runtime.decorateSubprocessService(service)
      } catch {
        return service
      }
    }, { global: true })
    if (typeof internal !== 'function') throw new Error('internal/get observer did not return a disposer')
    disposers.push(internal as () => void)
    const tool = ctx.on('tools/execute', (execution, next) => {
      if (typeof next !== 'function') return undefined
      return runtime.runToolExecution(execution as ToolExecutionLike, next as () => unknown)
    }, { global: true })
    if (typeof tool !== 'function') throw new Error('tools/execute observer did not return a disposer')
    disposers.push(tool as () => void)
    const result = ctx.on('tools/result', (execution, value) => {
      try {
        runtime.observeToolResult(execution, value)
      } catch {
        // Result correlation is diagnostic-only and must not affect dispatch.
      }
      return undefined
    }, { global: true })
    if (typeof result !== 'function') throw new Error('tools/result observer did not return a disposer')
    disposers.push(result as () => void)
    // Session events are published by agent/session-owned child contexts. The
    // observer must be global so a root-level plugin sees every session while
    // still retaining the session object as the attribution key.
    const session = ctx.on('session/event', (subject, event) => {
      try {
        runtime.observeSessionEvent(subject, event as SessionEventLike)
      } catch {
        // A malformed event must not affect Session publication.
      }
      return undefined
    }, { global: true })
    if (typeof session !== 'function') throw new Error('session/event observer did not return a disposer')
    disposers.push(session as () => void)
    const service = ctx.on('internal/service', (name, value) => {
      if (name === 'subprocess') {
        try {
          runtime.patchSubprocessProvider(value)
        } catch {
          // Fallback installation is best-effort and never changes service publication.
        }
      }
    }, { global: true })
    if (typeof service !== 'function') throw new Error('internal/service observer did not return a disposer')
    disposers.push(service as () => void)
    return {
      available: true,
      dispose: () => { for (const dispose of disposers.splice(0)) dispose() },
    }
  } catch {
    for (const dispose of disposers.splice(0)) dispose()
    return { available: false, dispose: () => {} }
  }
}
