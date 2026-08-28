import { spawnSync } from 'node:child_process'
import { platform } from 'node:process'
import { redactAndBoundProcessCommand, redactPath } from './redaction.js'

export const MAX_COMMAND_QUERY_PIDS = 64
export const MAX_COMMAND_QUERY_TIMEOUT_MS = 2_000
export const MAX_COMMAND_QUERY_OUTPUT_BYTES = 256 * 1024
export const MAX_PUBLIC_PROCESS_COMMAND_LENGTH = 1_024

export interface WindowsProcessCommandLine {
  readonly pid: number
  readonly parentPid: number
  readonly executable?: string
  /** Already redacted and bounded before it leaves this Host-only reader. */
  readonly commandLine?: string
}

export interface WindowsProcessCommandLineReader {
  (pids: readonly number[]): readonly WindowsProcessCommandLine[]
}

interface PowerShellProcessRecord {
  readonly pid?: unknown
  readonly parentPid?: unknown
  readonly executable?: unknown
  readonly commandLine?: unknown
}

function validPid(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function bounded(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined
  return value.length > maxLength ? `${value.slice(0, Math.max(1, maxLength - 1))}…` : value
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value
  if (typeof value === 'string' && /^\d+$/u.test(value)) {
    const parsed = Number(value)
    return Number.isSafeInteger(parsed) ? parsed : undefined
  }
  return undefined
}

function readField(record: PowerShellProcessRecord, ...names: readonly string[]): unknown {
  for (const name of names) {
    const value = record[name as keyof PowerShellProcessRecord]
    if (value !== undefined) return value
  }
  return undefined
}

/** Parse only the fixed, projected fields emitted by the CIM query. */
export function parseWindowsProcessCommandLines(output: string): WindowsProcessCommandLine[] {
  if (typeof output !== 'string' || output.length === 0 || output.length > MAX_COMMAND_QUERY_OUTPUT_BYTES) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(output)
  } catch {
    return []
  }
  const values = Array.isArray(parsed) ? parsed : [parsed]
  const records: WindowsProcessCommandLine[] = []
  const seen = new Set<number>()
  for (const value of values) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) continue
    const record = value as PowerShellProcessRecord
    const pid = readNumber(readField(record, 'pid', 'ProcessId'))
    const parentPid = readNumber(readField(record, 'parentPid', 'ParentProcessId'))
    if (!validPid(pid) || parentPid === undefined || parentPid < 0 || seen.has(pid)) continue
    seen.add(pid)
    const executable = bounded(redactPath(readField(record, 'executable', 'Name')), 512)
    const commandLine = redactAndBoundProcessCommand(readField(record, 'commandLine', 'CommandLine'), MAX_PUBLIC_PROCESS_COMMAND_LENGTH)
    records.push({
      pid,
      parentPid,
      ...executable === undefined ? {} : { executable },
      ...commandLine === undefined ? {} : { commandLine },
    })
  }
  return records
}

// This is deliberately fixed code. PIDs arrive through stdin as JSON after
// numeric validation; no project command, path, or Browser input is interpolated.
const POWERSHELL_QUERY = [
  '$ErrorActionPreference = "Stop"',
  '$ids = @(([Console]::In.ReadToEnd() | ConvertFrom-Json) | ForEach-Object { [int]$_ })',
  '$filter = ($ids | ForEach-Object { "ProcessId = $_" }) -join " OR "',
  '$items = if ($filter.Length -eq 0) { @() } else { Get-CimInstance -ClassName Win32_Process -Filter $filter -ErrorAction SilentlyContinue | Select-Object @{Name="pid";Expression={$_.ProcessId}}, @{Name="parentPid";Expression={$_.ParentProcessId}}, @{Name="executable";Expression={$_.Name}}, @{Name="commandLine";Expression={$_.CommandLine}} }',
  '@($items) | ConvertTo-Json -Compress -Depth 3',
].join('\n')

function validatedPids(pids: readonly number[]): number[] {
  const result: number[] = []
  const seen = new Set<number>()
  for (const pid of pids) {
    if (!validPid(pid) || seen.has(pid)) continue
    seen.add(pid)
    result.push(pid)
    if (result.length >= MAX_COMMAND_QUERY_PIDS) break
  }
  return result
}

/**
 * Read process command lines through a fixed Windows PowerShell/CIM query.
 * Failures return an empty list so listener inventory remains available.
 */
export const readWindowsProcessCommandLines: WindowsProcessCommandLineReader = (pids) => {
  if (platform !== 'win32') return []
  const ids = validatedPids(pids)
  if (ids.length === 0) return []
  try {
    const result = spawnSync(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', POWERSHELL_QUERY],
      {
        input: JSON.stringify(ids),
        encoding: 'utf8',
        windowsHide: true,
        timeout: MAX_COMMAND_QUERY_TIMEOUT_MS,
        maxBuffer: MAX_COMMAND_QUERY_OUTPUT_BYTES,
      },
    ) as { stdout?: unknown; error?: unknown; status?: unknown }
    if (result.error !== undefined || result.status !== 0 || typeof result.stdout !== 'string') return []
    return parseWindowsProcessCommandLines(result.stdout)
  } catch {
    return []
  }
}
