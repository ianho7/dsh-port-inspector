import { createRequire } from 'node:module'
import { platform } from 'node:process'

export interface ProcessCreationIdentity {
  readonly pid: number
  /** Windows FILETIME value represented as one canonical unsigned decimal string. */
  readonly createdAt: string
}

type KoffiStruct = object

interface KoffiLibrary {
  pointer(type: unknown): unknown
  struct(name: string, fields: Record<string, string>): KoffiStruct
  alloc(type: unknown, count: number): unknown
  decode(pointer: unknown, type: KoffiStruct): unknown
  load(name: string): {
    func(convention: string, name: string, result: unknown, args: unknown[]): (...args: unknown[]) => unknown
  }
}

interface FileTime {
  dwLowDateTime?: unknown
  dwHighDateTime?: unknown
}

const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
const SYNCHRONIZE = 0x00100000
const WAIT_OBJECT_0 = 0
const WAIT_TIMEOUT = 0x102

let koffiState: KoffiLibrary | false | undefined
let fileTimeState: { type: KoffiStruct } | undefined
let bindingsState: {
  openProcess: (...args: unknown[]) => unknown
  getProcessTimes: (...args: unknown[]) => unknown
  closeHandle: (...args: unknown[]) => unknown
  waitForSingleObject: (...args: unknown[]) => unknown
} | undefined

function loadKoffi(): KoffiLibrary | undefined {
  if (koffiState === false) return undefined
  if (koffiState !== undefined) return koffiState
  try {
    const require = createRequire(import.meta.url)
    const loaded = require('koffi') as KoffiLibrary & { default?: KoffiLibrary }
    koffiState = loaded.default ?? loaded
    return koffiState
  } catch {
    koffiState = false
    return undefined
  }
}

function loadBindings(): typeof bindingsState {
  if (bindingsState !== undefined) return bindingsState
  const koffi = loadKoffi()
  if (koffi === undefined) return undefined
  try {
    const pointer = koffi.pointer('void')
    const kernel32 = koffi.load('kernel32.dll')
    const bind = (name: string, result: unknown, args: unknown[]) => kernel32.func('__stdcall', name, result, args)
    bindingsState = {
      openProcess: bind('OpenProcess', pointer, ['uint32', 'int', 'uint32']),
      getProcessTimes: bind('GetProcessTimes', 'int', [pointer, pointer, pointer, pointer, pointer]),
      closeHandle: bind('CloseHandle', 'int', [pointer]),
      waitForSingleObject: bind('WaitForSingleObject', 'uint32', [pointer, 'uint32']),
    }
    return bindingsState
  } catch {
    bindingsState = undefined
    return undefined
  }
}

function loadFileTime(): typeof fileTimeState {
  if (fileTimeState !== undefined) return fileTimeState
  const koffi = loadKoffi()
  if (koffi === undefined) return undefined
  try {
    const type = koffi.struct('RuntimeInspectorFileTime', {
      dwLowDateTime: 'uint32',
      dwHighDateTime: 'uint32',
    })
    fileTimeState = { type }
    return fileTimeState
  } catch {
    fileTimeState = undefined
    return undefined
  }
}

function validHandle(handle: unknown): boolean {
  if (handle === null || handle === undefined) return false
  if (typeof handle === 'bigint') return handle !== 0n && handle !== -1n && handle !== 0xFFFFFFFFFFFFFFFFn
  if (typeof handle === 'number') return handle !== 0 && handle !== -1
  return true
}

/** Convert the two DWORDs returned by GetProcessTimes to the registry format. */
export function formatWindowsFileTime(high: number, low: number): string | undefined {
  if (!Number.isSafeInteger(high) || !Number.isSafeInteger(low)) return undefined
  if (high < 0 || high > 0xFFFFFFFF || low < 0 || low > 0xFFFFFFFF) return undefined
  return ((BigInt(high) << 32n) | BigInt(low)).toString(10)
}

/** Read the current Windows process creation identity, failing closed on races or missing native support. */
export function readWindowsProcessIdentity(pid: number): ProcessCreationIdentity | undefined {
  if (platform !== 'win32' || !Number.isSafeInteger(pid) || pid <= 0) return undefined
  try {
    const koffi = loadKoffi()
    const bindings = loadBindings()
    const fileTime = loadFileTime()
    if (koffi === undefined || bindings === undefined || fileTime === undefined) return undefined
    const handle = bindings.openProcess(PROCESS_QUERY_LIMITED_INFORMATION | SYNCHRONIZE, 0, pid)
    if (!validHandle(handle)) return undefined
    try {
      const creation = koffi.alloc(fileTime.type, 1)
      const exit = koffi.alloc(fileTime.type, 1)
      const kernel = koffi.alloc(fileTime.type, 1)
      const user = koffi.alloc(fileTime.type, 1)
      if (bindings.getProcessTimes(handle, creation, exit, kernel, user) !== 1) return undefined
      const decoded = koffi.decode(creation, fileTime.type) as FileTime
      const low = Number(decoded.dwLowDateTime)
      const high = Number(decoded.dwHighDateTime)
      const createdAt = formatWindowsFileTime(high, low)
      if (createdAt === undefined) return undefined
      const wait = Number(bindings.waitForSingleObject(handle, 0))
      if (wait !== WAIT_OBJECT_0 && wait !== WAIT_TIMEOUT) return undefined
      return { pid, createdAt }
    } finally {
      bindings.closeHandle(handle)
    }
  } catch {
    return undefined
  }
}
