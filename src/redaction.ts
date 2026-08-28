const MAX_COMMAND_LENGTH = 4_096
const MAX_PATH_LENGTH = 1_024

const SECRET_ARGUMENT = /((?:^|\s)(?:--?|\/)?(?:password|passwd|pass|token|secret|api[-_]?key|access[-_]?key)(?:\s+|=))("[^"]*"|'[^']*'|[^\s]+)/giu
const SECRET_ASSIGNMENT = /((?:^|\s)[A-Z][A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|KEY)[A-Z0-9_]*=)("[^"]*"|'[^']*'|[^\s]+)/giu
const SECRET_ASSIGNMENT_ANYWHERE = /((?:password|passwd|pass|token|secret|api[-_]?key|access[-_]?key)\s*=\s*)("[^"]*"|'[^']*'|[^\\/;,\s]+)/giu

/** Redact common command-line secret values and bound the stored command. */
export function redactCommand(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const bounded = value.length > MAX_COMMAND_LENGTH ? `${value.slice(0, MAX_COMMAND_LENGTH)}…` : value
  return bounded
    .replace(SECRET_ARGUMENT, '$1[REDACTED]')
    .replace(SECRET_ASSIGNMENT, '$1[REDACTED]')
    .replace(SECRET_ASSIGNMENT_ANYWHERE, '$1[REDACTED]')
}

const URI_CREDENTIALS = /(\b[a-z][a-z0-9+.-]*:\/\/)([^@\s]+)@/giu
const QUOTED_PRIVATE_WINDOWS_PATH = /(["'])(?:(?:[a-z]:[\\/]|\\\\)[^"']*)\1/giu
const PRIVATE_WINDOWS_PATH = /(?:[a-z]:[\\/]|\\\\)(?:[^\\/\s"';&|]+[\\/])*[^\\/\s"';&|]+/giu

/** Redact process command secrets and absolute Windows paths before UI projection. */
export function redactProcessCommand(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  // Remove path and URI credentials before the general command bound so a
  // truncated secret/path cannot survive at the public boundary.
  const pathRedacted = value
    .replace(URI_CREDENTIALS, '$1[REDACTED]@')
    .replace(QUOTED_PRIVATE_WINDOWS_PATH, '$1[PATH]$1')
    .replace(PRIVATE_WINDOWS_PATH, '[PATH]')
  return redactCommand(pathRedacted)
}

/** Redact a process command and keep its public representation within a hard inclusive bound. */
export function redactAndBoundProcessCommand(value: unknown, maxLength: number): string | undefined {
  if (!Number.isSafeInteger(maxLength) || maxLength < 1) return undefined
  const command = redactProcessCommand(value)
  if (command === undefined) return undefined
  return command.length > maxLength
    ? `${command.slice(0, Math.max(1, maxLength - 1))}…`
    : command
}

/** Bound a path before it crosses a runtime-inspector output boundary. */
export function redactPath(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const withoutNulls = value.replace(/\0/gu, '')
  const redacted = withoutNulls.replace(SECRET_ASSIGNMENT_ANYWHERE, '$1[REDACTED]')
  return redacted.length > MAX_PATH_LENGTH
    ? `${redacted.slice(0, MAX_PATH_LENGTH)}…`
    : redacted
}

/** Return a bounded, non-secret command/workdir signal from tool arguments. */
export function commandAndWorkdir(argumentsValue: unknown, fallbackWorkdir?: unknown): {
  command?: string
  workdir?: string
} {
  if (argumentsValue === null || typeof argumentsValue !== 'object' || Array.isArray(argumentsValue)) {
    return { workdir: redactPath(fallbackWorkdir) }
  }
  const record = argumentsValue as Record<string, unknown>
  return {
    command: redactCommand(record.command),
    workdir: redactPath(record.workdir ?? fallbackWorkdir),
  }
}
