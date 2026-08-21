import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { platform } from 'node:process'
import type { ProcessOrigin } from './attribution.js'
import { readWindowsProcessIdentity } from './process-identity.js'
import { redactPath } from './redaction.js'

export type AttributionConfidence = 'verified' | 'inferred' | 'unattributed'

export interface WindowsTcpListener {
  readonly protocol: 'tcp4' | 'tcp6'
  readonly localAddress: string
  readonly localPort: number
  readonly owningPid: number
}

export interface WindowsProcessRecord {
  readonly pid: number
  readonly parentPid: number
  readonly processCreatedAt?: string
  readonly executable?: string
}

export type AncestryReason =
  | 'creation-identity-match'
  | 'identity-unreadable'
  | 'creation-identity-mismatch'
  | 'ambiguous-root'
  | 'root-not-reached'
  | 'parent-cycle'
  | 'process-unreadable'

export interface AncestryMatch {
  readonly confidence: AttributionConfidence
  readonly ancestry: readonly number[]
  readonly rootPid?: number
  readonly originId?: number
  readonly reason: AncestryReason
}

export interface ListenerRecord extends WindowsTcpListener, AncestryMatch {
  readonly processCreatedAt?: string
  readonly executable?: string
  /** Best available project signal; for verified/inferred rows this is the origin workdir. */
  readonly project?: string
  readonly jobId?: string
  readonly terminalSessionId?: string
}

export interface WindowsScannerInternals {
  listListeners(): readonly WindowsTcpListener[]
  listProcesses(): readonly WindowsProcessRecord[]
}

export interface WindowsListenerScan {
  readonly rows: readonly ListenerRecord[]
  /** False means the listener command itself failed; an empty row set is not a release proof. */
  readonly complete: boolean
}

const DEFAULT_LISTENER_LIMIT = 4_096
const MAX_ADDRESS_LENGTH = 128
const MAX_EXECUTABLE_LENGTH = 512

function validPid(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function validPort(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= 65_535
}

function boundedString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value
}

function parseEndpoint(value: string): { address: string; port: number; protocol: 'tcp4' | 'tcp6' } | undefined {
  if (value.startsWith('[')) {
    const close = value.lastIndexOf(']')
    if (close <= 1 || value[close + 1] !== ':') return undefined
    const address = value.slice(1, close)
    const port = Number(value.slice(close + 2))
    if (!validPort(port)) return undefined
    return { address, port, protocol: 'tcp6' }
  }
  const separator = value.lastIndexOf(':')
  if (separator <= 0) return undefined
  const address = value.slice(0, separator)
  const port = Number(value.slice(separator + 1))
  if (!validPort(port)) return undefined
  return { address, port, protocol: address.includes(':') ? 'tcp6' : 'tcp4' }
}

/** Parse the stable data rows emitted by `netstat -ano -p tcp`. */
export function parseNetstatTcpListeners(output: string): WindowsTcpListener[] {
  if (typeof output !== 'string' || output.length === 0) return []
  const listeners: WindowsTcpListener[] = []
  for (const line of output.split(/\r?\n/)) {
    const fields = line.trim().split(/\s+/)
    if (fields.length < 5 || fields[0].toUpperCase() !== 'TCP' || fields[3].toUpperCase() !== 'LISTENING') continue
    const endpoint = parseEndpoint(fields[1])
    const owningPid = Number(fields[4])
    if (endpoint === undefined || !validPid(owningPid)) continue
    const localAddress = boundedString(endpoint.address, MAX_ADDRESS_LENGTH)
    if (localAddress === undefined) continue
    listeners.push({
      protocol: endpoint.protocol,
      localAddress,
      localPort: endpoint.port,
      owningPid,
    })
  }
  return listeners
}

function originCandidatesByRoot(origins: readonly ProcessOrigin[]): Map<number, ProcessOrigin[]> {
  const result = new Map<number, ProcessOrigin[]>()
  for (const origin of origins) {
    if (!validPid(origin.rootPid)) continue
    const candidates = result.get(origin.rootPid) ?? []
    candidates.push(origin)
    result.set(origin.rootPid, candidates)
  }
  return result
}

/** Match one listener process to a captured root using PID and creation identity. */
export function matchProcessAncestry(
  listenerPid: number,
  processes: readonly WindowsProcessRecord[],
  origins: readonly ProcessOrigin[],
): AncestryMatch {
  if (!validPid(listenerPid)) return { confidence: 'unattributed', ancestry: [], reason: 'process-unreadable' }
  const byPid = new Map<number, WindowsProcessRecord>()
  for (const process of processes) {
    if (validPid(process.pid) && Number.isSafeInteger(process.parentPid) && process.parentPid >= 0) byPid.set(process.pid, process)
  }
  let current = byPid.get(listenerPid)
  if (current === undefined) return { confidence: 'unattributed', ancestry: [], reason: 'process-unreadable' }

  const roots = originCandidatesByRoot(origins)
  const ancestry: number[] = []
  const visited = new Set<number>()
  let identitiesComplete = true
  let candidate: ProcessOrigin | undefined
  let candidatePidOnly = false
  let identityMismatch = false

  while (current !== undefined) {
    if (visited.has(current.pid)) {
      return { confidence: 'unattributed', ancestry, reason: 'parent-cycle' }
    }
    visited.add(current.pid)
    ancestry.push(current.pid)
    const creation = current.processCreatedAt
    if (creation === undefined) identitiesComplete = false

    const rootCandidates = roots.get(current.pid)
    if (rootCandidates !== undefined && rootCandidates.length > 0) {
      const exactCandidates = rootCandidates.filter(origin => origin.processCreatedAt === creation)
      if (exactCandidates.length === 1) {
        const exact = exactCandidates[0]
        if (identitiesComplete) {
          return {
            confidence: 'verified',
            rootPid: exact.rootPid,
            originId: exact.id,
            ancestry,
            reason: 'creation-identity-match',
          }
        }
        return {
          confidence: 'inferred',
          rootPid: exact.rootPid,
          originId: exact.id,
          ancestry,
          reason: 'identity-unreadable',
        }
      }
      if (exactCandidates.length > 1) {
        return { confidence: 'unattributed', ancestry, reason: 'ambiguous-root' }
      }
      if (creation === undefined && rootCandidates.length === 1) {
        candidate = rootCandidates[0]
        candidatePidOnly = true
      } else if (creation !== undefined) {
        identityMismatch = true
      }
    }

    if (!validPid(current.parentPid)) break
    current = byPid.get(current.parentPid)
  }

  if (candidate !== undefined && candidatePidOnly) {
    return {
      confidence: 'inferred',
      rootPid: candidate.rootPid,
      originId: candidate.id,
      ancestry,
      reason: 'identity-unreadable',
    }
  }
  return {
    confidence: 'unattributed',
    ancestry,
    reason: identityMismatch ? 'creation-identity-mismatch' : 'root-not-reached',
  }
}

export class WindowsListenerScanner {
  constructor(
    private readonly internals: WindowsScannerInternals = defaultWindowsScannerInternals(),
    private readonly maxListeners = DEFAULT_LISTENER_LIMIT,
  ) {
    if (!Number.isSafeInteger(maxListeners) || maxListeners <= 0) throw new RangeError('maxListeners must be a positive safe integer')
  }

  scan(origins: readonly ProcessOrigin[] = []): ListenerRecord[] {
    return [...this.scanWithStatus(origins).rows]
  }

  scanWithStatus(origins: readonly ProcessOrigin[] = []): WindowsListenerScan {
    let listeners: readonly WindowsTcpListener[] = []
    let processes: readonly WindowsProcessRecord[] = []
    try {
      const value = this.internals.listListeners()
      listeners = Array.isArray(value) ? value : []
    } catch {
      return Object.freeze({ rows: Object.freeze([]), complete: false })
    }
    try {
      const value = this.internals.listProcesses()
      processes = Array.isArray(value) ? value : []
    } catch {
      // Listener visibility remains useful when process metadata is denied;
      // every row will remain unattributed and therefore non-actionable.
    }
    const byPid = new Map<number, WindowsProcessRecord>()
    for (const process of processes) {
      if (validPid(process.pid)) byPid.set(process.pid, process)
    }
    const rows: ListenerRecord[] = []
    for (const listener of listeners.slice(0, this.maxListeners)) {
      if (!validPid(listener.owningPid) || !validPort(listener.localPort)) continue
      const process = byPid.get(listener.owningPid)
      const match = matchProcessAncestry(listener.owningPid, processes, origins)
      const origin = match.originId === undefined ? undefined : origins.find(candidate => candidate.id === match.originId)
      rows.push(Object.freeze({
        ...listener,
        processCreatedAt: process?.processCreatedAt,
        executable: redactPath(boundedString(process?.executable, MAX_EXECUTABLE_LENGTH)),
        project: redactPath(boundedString(origin?.workdir, MAX_ADDRESS_LENGTH)),
        ...origin?.jobId === undefined ? {} : { jobId: origin.jobId },
        ...origin?.terminalSessionId === undefined ? {} : { terminalSessionId: origin.terminalSessionId },
        ...match,
      }))
    }
    return Object.freeze({ rows: Object.freeze(rows), complete: true })
  }
}

interface KoffiStruct {
  readonly size: number
}

interface KoffiRuntime {
  pointer(type: unknown): unknown
  struct(name: string, fields: Record<string, unknown>): KoffiStruct
  array(type: unknown, length: number): unknown
  alloc(type: unknown, count: number): unknown
  encode(pointer: unknown, type: unknown, value: unknown): void
  decode(pointer: unknown, type: unknown): unknown
  load(name: string): {
    func(convention: string, name: string, result: unknown, args: unknown[]): (...args: unknown[]) => unknown
  }
}

interface NativeProcessBindings {
  createToolhelp32Snapshot: (...args: unknown[]) => unknown
  process32FirstW: (...args: unknown[]) => unknown
  process32NextW: (...args: unknown[]) => unknown
  closeHandle: (...args: unknown[]) => unknown
}

interface NativeProcessState {
  koffi: KoffiRuntime
  processEntry: KoffiStruct
  bindings: NativeProcessBindings
}

let nativeState: NativeProcessState | false | undefined

function loadNativeProcessState(): NativeProcessState | undefined {
  if (platform !== 'win32') return undefined
  if (nativeState === false) return undefined
  if (nativeState !== undefined) return nativeState
  try {
    const require = createRequire(import.meta.url)
    const loaded = require('koffi') as KoffiRuntime & { default?: KoffiRuntime }
    const koffi = loaded.default ?? loaded
    const pointer = koffi.pointer('void')
    const processEntry = koffi.struct('RuntimeInspectorProcessEntry', {
      dwSize: 'uint32',
      cntUsage: 'uint32',
      th32ProcessID: 'uint32',
      th32DefaultHeapID: pointer,
      th32ModuleID: 'uint32',
      cntThreads: 'uint32',
      th32ParentProcessID: 'uint32',
      pcPriClassBase: 'int32',
      dwFlags: 'uint32',
      szExeFile: koffi.array('char16', 260),
    })
    if (processEntry.size !== 568) throw new Error(`PROCESSENTRY32W layout mismatch: ${processEntry.size}`)
    const kernel32 = koffi.load('kernel32.dll')
    const bind = (name: string, result: unknown, args: unknown[]) => kernel32.func('__stdcall', name, result, args)
    nativeState = {
      koffi,
      processEntry,
      bindings: {
        createToolhelp32Snapshot: bind('CreateToolhelp32Snapshot', pointer, ['uint32', 'uint32']),
        process32FirstW: bind('Process32FirstW', 'int', [pointer, koffi.pointer(processEntry)]),
        process32NextW: bind('Process32NextW', 'int', [pointer, koffi.pointer(processEntry)]),
        closeHandle: bind('CloseHandle', 'int', [pointer]),
      },
    }
    return nativeState
  } catch {
    nativeState = false
    return undefined
  }
}

function invalidHandle(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'bigint') return value === 0n || value === -1n || value === 0xFFFFFFFFFFFFFFFFn
  if (typeof value === 'number') return value === 0 || value === -1
  return false
}

function executableValue(value: unknown): string | undefined {
  if (typeof value === 'string') return boundedString(value.replace(/\0.*$/u, ''), MAX_EXECUTABLE_LENGTH)
  if (Array.isArray(value)) {
    const chars = value.map(item => Number(item)).filter(item => Number.isInteger(item) && item > 0)
    return boundedString(String.fromCharCode(...chars).replace(/\0.*$/u, ''), MAX_EXECUTABLE_LENGTH)
  }
  return undefined
}

function defaultWindowsProcesses(): WindowsProcessRecord[] {
  const state = loadNativeProcessState()
  if (state === undefined) return []
  const snapshot = state.bindings.createToolhelp32Snapshot(0x2, 0)
  if (invalidHandle(snapshot)) return []
  const processes: WindowsProcessRecord[] = []
  try {
    const entry = state.koffi.alloc(state.processEntry, 1)
    state.koffi.encode(entry, 'uint32', state.processEntry.size)
    let result = Number(state.bindings.process32FirstW(snapshot, entry))
    while (result !== 0) {
      const value = state.koffi.decode(entry, state.processEntry) as {
        th32ProcessID?: unknown
        th32ParentProcessID?: unknown
        szExeFile?: unknown
      }
      const pid = Number(value.th32ProcessID)
      const parentPid = Number(value.th32ParentProcessID)
      if (validPid(pid) && Number.isSafeInteger(parentPid) && parentPid >= 0) {
        processes.push({
          pid,
          parentPid,
          processCreatedAt: readWindowsProcessIdentity(pid)?.createdAt,
          executable: executableValue(value.szExeFile),
        })
      }
      result = Number(state.bindings.process32NextW(snapshot, entry))
    }
  } finally {
    state.bindings.closeHandle(snapshot)
  }
  return processes
}

function defaultWindowsListeners(): WindowsTcpListener[] {
  if (platform !== 'win32') return []
  try {
    const result = spawnSync('netstat.exe', ['-ano', '-p', 'tcp'], { encoding: 'utf8', windowsHide: true }) as { stdout?: unknown }
    return parseNetstatTcpListeners(typeof result.stdout === 'string' ? result.stdout : '')
  } catch {
    return []
  }
}

function defaultWindowsScannerInternals(): WindowsScannerInternals {
  return {
    listListeners: defaultWindowsListeners,
    listProcesses: defaultWindowsProcesses,
  }
}

export function createWindowsListenerScanner(
  internals?: WindowsScannerInternals,
  maxListeners = DEFAULT_LISTENER_LIMIT,
): WindowsListenerScanner {
  return new WindowsListenerScanner(internals, maxListeners)
}
