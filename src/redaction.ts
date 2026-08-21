const MAX_COMMAND_LENGTH = 4_096

const SECRET_ARGUMENT = /((?:^|\s)(?:--?|\/)?(?:password|passwd|pass|token|secret|api[-_]?key|access[-_]?key)(?:\s+|=))("[^"]*"|'[^']*'|[^\s]+)/giu
const SECRET_ASSIGNMENT = /((?:^|\s)[A-Z][A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|KEY)[A-Z0-9_]*=)("[^"]*"|'[^']*'|[^\s]+)/giu

/** Redact common command-line secret values and bound the stored command. */
export function redactCommand(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const bounded = value.length > MAX_COMMAND_LENGTH ? `${value.slice(0, MAX_COMMAND_LENGTH)}…` : value
  return bounded
    .replace(SECRET_ARGUMENT, '$1[REDACTED]')
    .replace(SECRET_ASSIGNMENT, '$1[REDACTED]')
}

/** Return a bounded, non-secret command/workdir signal from tool arguments. */
export function commandAndWorkdir(argumentsValue: unknown, fallbackWorkdir?: unknown): {
  command?: string
  workdir?: string
} {
  if (argumentsValue === null || typeof argumentsValue !== 'object' || Array.isArray(argumentsValue)) {
    return { workdir: typeof fallbackWorkdir === 'string' ? fallbackWorkdir : undefined }
  }
  const record = argumentsValue as Record<string, unknown>
  return {
    command: redactCommand(record.command),
    workdir: typeof record.workdir === 'string' ? record.workdir : typeof fallbackWorkdir === 'string' ? fallbackWorkdir : undefined,
  }
}
