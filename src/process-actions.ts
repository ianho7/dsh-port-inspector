import { createRequire } from 'node:module'
import { platform } from 'node:process'
import { formatWindowsFileTime } from './process-identity.js'

export interface ExternalProcessSnapshot {
  readonly pid: number
  readonly processCreatedAt: string
  readonly executable: string
  readonly userId: string
  readonly protectedProcess: boolean
  readonly systemProcess: boolean
  readonly canTerminate: boolean
}

export interface ExternalProcessLease {
  readonly snapshot: ExternalProcessSnapshot
  terminate(): boolean
  close(): void
}

/**
 * The only process primitive used by external termination.  A lease owns one
 * already-open process handle; callers must compare its snapshot before using
 * terminate(), so a PID reuse race cannot retarget a different process.
 */
export interface ExternalProcessAdapter {
  currentUserId(): string | undefined
  openForTermination(pid: number): ExternalProcessLease | undefined
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

interface NativeProcessActions {
  koffi: KoffiRuntime
  pointer: unknown
  fileTime: KoffiStruct
  tokenUser: KoffiStruct
  protectionInfo: KoffiStruct
  bindings: {
    openProcess: (...args: unknown[]) => unknown
    getProcessTimes: (...args: unknown[]) => unknown
    queryFullProcessImageNameW: (...args: unknown[]) => unknown
    getProcessInformation: (...args: unknown[]) => unknown
    openProcessToken: (...args: unknown[]) => unknown
    getTokenInformation: (...args: unknown[]) => unknown
    convertSidToStringSidW: (...args: unknown[]) => unknown
    localFree: (...args: unknown[]) => unknown
    getCurrentProcess: (...args: unknown[]) => unknown
    terminateProcess: (...args: unknown[]) => unknown
    closeHandle: (...args: unknown[]) => unknown
  }
}

const PROCESS_TERMINATE = 0x0001
const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
const SYNCHRONIZE = 0x00100000
const TOKEN_QUERY = 0x0008
const TOKEN_USER = 1
const PROCESS_PROTECTION_LEVEL_INFO = 12
const MAX_IMAGE_LENGTH = 32_768
const MAX_TOKEN_INFO_LENGTH = 64 * 1024
const SYSTEM_SID = 'S-1-5-18'

let koffiState: KoffiRuntime | false | undefined
let nativeState: NativeProcessActions | false | undefined

function loadKoffi(): KoffiRuntime | undefined {
  if (koffiState === false) return undefined
  if (koffiState !== undefined) return koffiState
  try {
    const require = createRequire(import.meta.url)
    const loaded = require('koffi') as KoffiRuntime & { default?: KoffiRuntime }
    koffiState = loaded.default ?? loaded
    return koffiState
  } catch {
    koffiState = false
    return undefined
  }
}

function validHandle(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'bigint') return value !== 0n && value !== -1n && value !== 0xFFFFFFFFFFFFFFFFn
  if (typeof value === 'number') return value !== 0 && value !== -1
  return true
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function decodeUint32(koffi: KoffiRuntime, pointer: unknown): number | undefined {
  try {
    const value = Number(koffi.decode(pointer, 'uint32'))
    return Number.isSafeInteger(value) && value >= 0 ? value : undefined
  } catch {
    return undefined
  }
}

function decodeText(value: unknown, maxLength: number): string | undefined {
  if (typeof value === 'string') {
    const text = value.replace(/\0.*$/u, '')
    return text.length > 0 && text.length <= maxLength ? text : text.length > maxLength ? text.slice(0, maxLength) : undefined
  }
  if (!Array.isArray(value)) return undefined
  const chars = value.map(item => Number(item)).filter(item => Number.isInteger(item) && item > 0)
  const text = String.fromCharCode(...chars).replace(/\0.*$/u, '')
  return text.length > 0 && text.length <= maxLength ? text : text.length > maxLength ? text.slice(0, maxLength) : undefined
}

function loadNativeState(): NativeProcessActions | undefined {
  if (platform !== 'win32') return undefined
  if (nativeState === false) return undefined
  if (nativeState !== undefined) return nativeState
  const koffi = loadKoffi()
  if (koffi === undefined) {
    nativeState = false
    return undefined
  }
  try {
    const pointer = koffi.pointer('void')
    const fileTime = koffi.struct('RuntimeInspectorActionFileTime', {
      dwLowDateTime: 'uint32',
      dwHighDateTime: 'uint32',
    })
    const sidAndAttributes = koffi.struct('RuntimeInspectorSidAndAttributes', {
      Sid: pointer,
      Attributes: 'uint32',
    })
    const tokenUser = koffi.struct('RuntimeInspectorTokenUser', {
      User: sidAndAttributes,
    })
    const protectionInfo = koffi.struct('RuntimeInspectorProtectionInfo', {
      ProtectionLevel: 'uint32',
    })
    const kernel32 = koffi.load('kernel32.dll')
    const advapi32 = koffi.load('advapi32.dll')
    const bind = (library: typeof kernel32, name: string, result: unknown, args: unknown[]) =>
      library.func('__stdcall', name, result, args)
    nativeState = {
      koffi,
      pointer,
      fileTime,
      tokenUser,
      protectionInfo,
      bindings: {
        openProcess: bind(kernel32, 'OpenProcess', pointer, ['uint32', 'int', 'uint32']),
        getProcessTimes: bind(kernel32, 'GetProcessTimes', 'int', [pointer, pointer, pointer, pointer, pointer]),
        queryFullProcessImageNameW: bind(kernel32, 'QueryFullProcessImageNameW', 'int', [pointer, 'uint32', pointer, pointer]),
        getProcessInformation: bind(kernel32, 'GetProcessInformation', 'int', [pointer, 'uint32', pointer, 'uint32']),
        openProcessToken: bind(advapi32, 'OpenProcessToken', 'int', [pointer, 'uint32', pointer]),
        getTokenInformation: bind(advapi32, 'GetTokenInformation', 'int', [pointer, 'uint32', pointer, 'uint32', pointer]),
        convertSidToStringSidW: bind(advapi32, 'ConvertSidToStringSidW', 'int', [pointer, pointer]),
        localFree: bind(kernel32, 'LocalFree', pointer, [pointer]),
        getCurrentProcess: bind(kernel32, 'GetCurrentProcess', pointer, []),
        terminateProcess: bind(kernel32, 'TerminateProcess', 'int', [pointer, 'uint32']),
        closeHandle: bind(kernel32, 'CloseHandle', 'int', [pointer]),
      },
    }
    return nativeState
  } catch {
    nativeState = false
    return undefined
  }
}

function readFileTime(state: NativeProcessActions, handle: unknown): string | undefined {
  const { koffi, fileTime, bindings } = state
  const creation = koffi.alloc(fileTime, 1)
  const exit = koffi.alloc(fileTime, 1)
  const kernel = koffi.alloc(fileTime, 1)
  const user = koffi.alloc(fileTime, 1)
  if (Number(bindings.getProcessTimes(handle, creation, exit, kernel, user)) !== 1) return undefined
  const value = recordValue(koffi.decode(creation, fileTime))
  const low = Number(value?.dwLowDateTime)
  const high = Number(value?.dwHighDateTime)
  return formatWindowsFileTime(high, low)
}

function readExecutable(state: NativeProcessActions, handle: unknown): string | undefined {
  const { koffi, bindings } = state
  const imageType = koffi.array('char16', MAX_IMAGE_LENGTH)
  const image = koffi.alloc(imageType, 1)
  const length = koffi.alloc('uint32', 1)
  koffi.encode(length, 'uint32', MAX_IMAGE_LENGTH)
  if (Number(bindings.queryFullProcessImageNameW(handle, 0, image, length)) !== 1) return undefined
  const actualLength = decodeUint32(koffi, length)
  if (actualLength === undefined || actualLength === 0 || actualLength > MAX_IMAGE_LENGTH) return undefined
  return decodeText(koffi.decode(image, imageType), MAX_IMAGE_LENGTH)
}

function readProtection(state: NativeProcessActions, handle: unknown): boolean | undefined {
  const { koffi, protectionInfo, bindings } = state
  const info = koffi.alloc(protectionInfo, 1)
  if (Number(bindings.getProcessInformation(handle, PROCESS_PROTECTION_LEVEL_INFO, info, protectionInfo.size)) !== 1) return undefined
  const value = recordValue(koffi.decode(info, protectionInfo))
  const level = Number(value?.ProtectionLevel)
  return Number.isSafeInteger(level) ? level !== 0 : undefined
}

function readSid(state: NativeProcessActions, token: unknown): string | undefined {
  const { koffi, tokenUser, pointer, bindings } = state
  const sizePointer = koffi.alloc('uint32', 1)
  bindings.getTokenInformation(token, TOKEN_USER, 0, 0, sizePointer)
  const size = decodeUint32(koffi, sizePointer)
  if (size === undefined || size < tokenUser.size || size > MAX_TOKEN_INFO_LENGTH) return undefined
  const bufferType = koffi.array('uint8', size)
  const buffer = koffi.alloc(bufferType, 1)
  if (Number(bindings.getTokenInformation(token, TOKEN_USER, buffer, size, sizePointer)) !== 1) return undefined
  const value = recordValue(koffi.decode(buffer, tokenUser))
  const user = recordValue(value?.User)
  const sid = user?.Sid
  if (!validHandle(sid)) return undefined
  const stringPointer = koffi.alloc(pointer, 1)
  if (Number(bindings.convertSidToStringSidW(sid, stringPointer)) !== 1) return undefined
  const allocated = koffi.decode(stringPointer, pointer)
  if (!validHandle(allocated)) return undefined
  try {
    const sidType = koffi.array('char16', 256)
    return decodeText(koffi.decode(allocated, sidType), 256)
  } finally {
    bindings.localFree(allocated)
  }
}

function readTokenSid(state: NativeProcessActions, processHandle: unknown): string | undefined {
  const tokenPointer = state.koffi.alloc(state.pointer, 1)
  if (Number(state.bindings.openProcessToken(processHandle, TOKEN_QUERY, tokenPointer)) !== 1) return undefined
  const token = state.koffi.decode(tokenPointer, state.pointer)
  if (!validHandle(token)) return undefined
  try {
    return readSid(state, token)
  } finally {
    state.bindings.closeHandle(token)
  }
}

function snapshotForHandle(state: NativeProcessActions, pid: number, handle: unknown): ExternalProcessSnapshot | undefined {
  const processCreatedAt = readFileTime(state, handle)
  const executable = readExecutable(state, handle)
  const userId = readTokenSid(state, handle)
  const protectedProcess = readProtection(state, handle)
  if (processCreatedAt === undefined || executable === undefined || userId === undefined || protectedProcess === undefined) return undefined
  const normalizedUser = userId.toUpperCase()
  return Object.freeze({
    pid,
    processCreatedAt,
    executable,
    userId,
    protectedProcess,
    systemProcess: pid === 4 || normalizedUser === SYSTEM_SID,
    canTerminate: true,
  })
}

class WindowsExternalProcessAdapter implements ExternalProcessAdapter {
  constructor(private readonly state: NativeProcessActions) {}

  currentUserId(): string | undefined {
    try {
      const process = this.state.bindings.getCurrentProcess()
      if (!validHandle(process)) return undefined
      return readTokenSid(this.state, process)
    } catch {
      return undefined
    }
  }

  openForTermination(pid: number): ExternalProcessLease | undefined {
    if (!Number.isSafeInteger(pid) || pid <= 0) return undefined
    let handle: unknown
    try {
      handle = this.state.bindings.openProcess(
        PROCESS_TERMINATE | PROCESS_QUERY_LIMITED_INFORMATION | SYNCHRONIZE,
        0,
        pid,
      )
      if (!validHandle(handle)) return undefined
      const snapshot = snapshotForHandle(this.state, pid, handle)
      if (snapshot === undefined) {
        this.state.bindings.closeHandle(handle)
        return undefined
      }
      let closed = false
      return {
        snapshot,
        terminate: () => {
          if (closed) return false
          try {
            return Number(this.state.bindings.terminateProcess(handle, 1)) === 1
          } catch {
            return false
          }
        },
        close: () => {
          if (closed) return
          closed = true
          try { this.state.bindings.closeHandle(handle) } catch { /* containment */ }
        },
      }
    } catch {
      if (validHandle(handle)) {
        try { this.state.bindings.closeHandle(handle) } catch { /* containment */ }
      }
      return undefined
    }
  }
}

/** Create the native Windows adapter; unsupported hosts fail closed. */
export function createWindowsExternalProcessAdapter(): ExternalProcessAdapter {
  const state = loadNativeState()
  if (state === undefined) return {
    currentUserId: () => undefined,
    openForTermination: () => undefined,
  }
  return new WindowsExternalProcessAdapter(state)
}
