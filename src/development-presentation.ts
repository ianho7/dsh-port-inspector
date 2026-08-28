import type { ProcessOrigin } from './attribution.js'
import type { ListenerRecord } from './windows-scanner.js'

export type DevelopmentGroup = 'current-project' | 'development-environment' | 'other'
export type DevelopmentReason = 'current-session' | 'current-project' | 'compose-project' | 'project' | 'toolchain' | 'runtime'

export type ToolchainId =
  | 'vite'
  | 'nextjs'
  | 'nodejs'
  | 'bun'
  | 'deno'
  | 'python'
  | 'django'
  | 'flask'
  | 'fastapi'
  | 'java'
  | 'spring'
  | 'dotnet'
  | 'kestrel'
  | 'go'
  | 'rust'
  | 'php'
  | 'ruby'
  | 'postgresql'
  | 'mysql'
  | 'mariadb'
  | 'redis'
  | 'mongodb'
  | 'docker'
  | 'wsl'
  | 'metro'
  | 'adb'
  | 'firebase'
  | 'ollama'

export interface DevelopmentPresentation {
  readonly group: DevelopmentGroup
  readonly reasons: readonly DevelopmentReason[]
  readonly toolchain?: ToolchainId
  readonly stableKey: string
}

export interface DevelopmentPresentationContext {
  readonly currentSessionId?: string
  readonly currentProject?: string
}

function normalizedPath(value: string | undefined): string | undefined {
  if (value === undefined || value.trim().length === 0) return undefined
  return value.replaceAll('/', '\\').replace(/\\+$/u, '').toLocaleLowerCase()
}

function basename(value: string | undefined): string | undefined {
  const normalized = normalizedPath(value)
  if (normalized === undefined) return undefined
  const parts = normalized.split('\\')
  return parts[parts.length - 1] || undefined
}

function commandToolchain(command: string | undefined): ToolchainId | undefined {
  if (command === undefined) return undefined
  if (/(?:^|[\s"'])vite(?:[\s"']|$)/iu.test(command)) return 'vite'
  if (/(?:^|[\s"'])next(?:[\s"']|$)/iu.test(command)) return 'nextjs'
  if (/\b(?:django-admin|django)\b|\bmanage\.py\s+runserver\b/iu.test(command)) return 'django'
  if (/\b(?:python(?:3|\.exe)?\s+-m\s+)?flask\s+run\b/iu.test(command)) return 'flask'
  if (/\b(?:uvicorn|fastapi)\b/iu.test(command)) return 'fastapi'
  if (/\b(?:spring-boot|org\.springframework)\b/iu.test(command)) return 'spring'
  if (/\b(?:kestrel|microsoft\.aspnetcore)\b/iu.test(command)) return 'kestrel'
  if (/\b(?:react-native\s+start|metro(?:-config)?\b)/iu.test(command)) return 'metro'
  if (/\bfirebase\s+(?:emulators:start|serve)\b/iu.test(command)) return 'firebase'
  if (/\bollama\s+serve\b/iu.test(command)) return 'ollama'
  return undefined
}

function executableToolchain(executable: string | undefined): ToolchainId | undefined {
  const name = basename(executable)
  if (name === undefined) return undefined
  if (/^node(?:\.exe)?$/iu.test(name)) return 'nodejs'
  if (/^bun(?:\.exe)?$/iu.test(name)) return 'bun'
  if (/^deno(?:\.exe)?$/iu.test(name)) return 'deno'
  if (/^(?:python|python3|python\d+(?:\.\d+)?|py)(?:\.exe)?$/iu.test(name)) return 'python'
  if (/^javaw?(?:\.exe)?$/iu.test(name)) return 'java'
  if (/^dotnet(?:\.exe)?$/iu.test(name)) return 'dotnet'
  if (/^go(?:\.exe)?$/iu.test(name)) return 'go'
  if (/^(?:cargo|rustc)(?:\.exe)?$/iu.test(name)) return 'rust'
  if (/^php(?:-cgi)?(?:\.exe)?$/iu.test(name)) return 'php'
  if (/^ruby(?:\.exe)?$/iu.test(name)) return 'ruby'
  if (/^(?:postgres|postmaster)(?:\.exe)?$/iu.test(name)) return 'postgresql'
  if (/^mysqld(?:\.exe)?$/iu.test(name)) return 'mysql'
  if (/^mariadbd(?:\.exe)?$/iu.test(name)) return 'mariadb'
  if (/^redis-server(?:\.exe)?$/iu.test(name)) return 'redis'
  if (/^mongod(?:\.exe)?$/iu.test(name)) return 'mongodb'
  if (/^(?:docker-proxy|dockerd|com\.docker\.backend)(?:\.exe)?$/iu.test(name)) return 'docker'
  if (/^(?:wsl|wslhost)(?:\.exe)?$/iu.test(name)) return 'wsl'
  if (/^adb(?:\.exe)?$/iu.test(name)) return 'adb'
  if (/^ollama(?:\.exe)?$/iu.test(name)) return 'ollama'
  return undefined
}

function imageToolchain(image: string | undefined): ToolchainId | undefined {
  if (image === undefined) return undefined
  const withoutDigest = image.split('@', 1)[0]
  const lastPathSegment = withoutDigest?.slice((withoutDigest.lastIndexOf('/') + 1))
  const repository = lastPathSegment?.replace(/:[^:]+$/u, '').toLocaleLowerCase()
  if (repository === undefined) return undefined
  if (/^(?:postgres|postgresql)$/u.test(repository)) return 'postgresql'
  if (/^redis$/u.test(repository)) return 'redis'
  if (/^mysql$/u.test(repository)) return 'mysql'
  if (/^mariadb$/u.test(repository)) return 'mariadb'
  if (/^mongo(?:db)?$/u.test(repository)) return 'mongodb'
  return undefined
}

const runtimeToolchains = new Set<ToolchainId>([
  'nodejs', 'bun', 'deno', 'python', 'java', 'dotnet', 'go', 'rust', 'php', 'ruby',
])

function stablePart(value: string | undefined): string {
  const part = basename(value)?.replace(/[^a-z0-9._-]+/giu, '-')
  return part === undefined || part.length === 0 ? 'unknown' : part.slice(0, 96)
}

function stableComposePart(value: string | undefined): string {
  if (value === undefined || value.length === 0) return 'unknown'
  const normalized = value.replaceAll('\\', '/').replace(/^\.\//u, '')
  const part = normalized.replace(/[^a-z0-9._/-]+/giu, '-').replaceAll('/', '-')
  return part.length === 0 ? 'unknown' : part.slice(0, 96)
}

function stableProjectPart(value: string): string {
  const normalized = normalizedPath(value) ?? value.toLocaleLowerCase()
  let hash = 2_166_136_261
  for (const character of normalized) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16_777_619)
  }
  return `${stablePart(value)}-${(hash >>> 0).toString(36)}`
}

export function projectDevelopmentPresentation(
  row: ListenerRecord,
  origin: ProcessOrigin | undefined,
  context: DevelopmentPresentationContext,
  compose?: { readonly image?: string; readonly relativeComposeFile?: string; readonly service?: string },
): DevelopmentPresentation {
  const project = origin?.workdir ?? row.project
  const currentSession = origin !== undefined
    && context.currentSessionId !== undefined
    && origin.sessionId === context.currentSessionId
  const currentProject = normalizedPath(project) !== undefined
    && normalizedPath(project) === normalizedPath(context.currentProject)
  const toolchain = imageToolchain(compose?.image)
    ?? (compose === undefined ? commandToolchain(origin?.command) ?? executableToolchain(row.executable) : 'docker')
  const reasons: DevelopmentReason[] = []
  if (currentSession) reasons.push('current-session')
  if (currentProject) reasons.push('current-project')
  if (compose !== undefined) reasons.push('compose-project')
  if (!currentSession && !currentProject && compose === undefined && normalizedPath(project) !== undefined) reasons.push('project')
  if (!currentSession && !currentProject && compose === undefined && toolchain !== undefined) {
    reasons.push(runtimeToolchains.has(toolchain) ? 'runtime' : 'toolchain')
  }

  const group: DevelopmentGroup = currentSession || currentProject || compose !== undefined
    ? 'current-project'
    : toolchain !== undefined || normalizedPath(project) !== undefined ? 'development-environment' : 'other'
  const identity = toolchain ?? stablePart(row.executable)
  const stableKey = compose !== undefined
    ? `project:compose-${stableComposePart(compose.relativeComposeFile)}-${stablePart(compose.service)}:${identity}`
    : normalizedPath(project) === undefined
      ? `application:${identity}`
      : `project:${stableProjectPart(project as string)}:${identity}`

  return Object.freeze({
    group,
    reasons: Object.freeze(reasons),
    ...toolchain === undefined ? {} : { toolchain },
    stableKey,
  })
}
