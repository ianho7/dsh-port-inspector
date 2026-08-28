import { readdirSync, realpathSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, relative, resolve } from 'node:path'

export type ComposeProtocol = 'tcp'
export type ComposeRuntimeStatus = 'available' | 'unavailable' | 'not-detected'

/** A redaction-ready association between a listener and a Compose service. */
export interface ComposeAssociation {
  readonly composeFile: string
  readonly relativeComposeFile: string
  readonly service: string
  readonly image: string
  readonly containerId: string
  readonly projectName?: string
  readonly hostPort: number
  readonly containerPort?: number
  readonly protocol: ComposeProtocol
}

export interface ComposeRuntimeAssociationReader {
  readonly read: (workspace: string | undefined) => readonly ComposeAssociation[]
  readonly readWithStatus?: (workspace: string | undefined) => ComposeRuntimeRead
}

export interface ComposeRuntimeRead {
  readonly associations: readonly ComposeAssociation[]
  readonly status: ComposeRuntimeStatus
}

export interface ComposeCommandResult {
  readonly status: number | null
  readonly stdout: string
}

export type ComposeDockerRunner = (args: readonly string[], cwd: string, maxOutputBytes: number) => ComposeCommandResult

export interface ComposeRuntimeAssociationOptions {
  readonly command?: (file: string, projectName?: string) => ComposeCommandResult
  /** Optional Host-only seam for verified Compose project-name labels. */
  readonly projectNames?: (file: string, workspace: string) => readonly string[]
  /** Optional Host-only seam for the local Docker context capability probe. */
  readonly contextProbe?: (workspace: string) => { readonly name: string; readonly endpoint: string } | undefined
  /** Optional Host-only seam for observing the bounded Docker argv in tests. */
  readonly dockerRunner?: ComposeDockerRunner
  readonly maxCandidates?: number
  readonly maxDepth?: number
  readonly maxOutputBytes?: number
}

const COMPOSE_FILE_NAMES = new Set([
  'compose.yaml',
  'compose.yml',
  'docker-compose.yaml',
  'docker-compose.yml',
])
const IGNORED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  '.next',
  'target',
  'coverage',
])
const DEFAULT_MAX_CANDIDATES = 64
const DEFAULT_MAX_DEPTH = 12
const DEFAULT_MAX_OUTPUT_BYTES = 256 * 1024
const MAX_PROJECT_NAMES = 16
const COMMAND_TIMEOUT_MS = 2_000

function boundedLimit(value: number | undefined, fallback: number, maximum: number, minimum = 1): number {
  if (!Number.isSafeInteger(value)) return fallback
  return Math.max(minimum, Math.min(value as number, maximum))
}

function validPort(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= 65_535
}

function bounded(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.length > max) return undefined
  return value
}

function boundedIdentifier(value: unknown): string | undefined {
  return bounded(value, 256)
}

function normalizedName(value: string): string {
  return value.replaceAll('\\', '/').replace(/^\.\//u, '').toLocaleLowerCase()
}

function safeWorkspace(value: string | undefined): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) return undefined
  try {
    const path = realpathSync(resolve(value))
    return statSync(path).isDirectory() ? path : undefined
  } catch {
    return undefined
  }
}

function discoverComposeFiles(workspace: string, maxCandidates: number, maxDepth: number): string[] {
  const found: string[] = []
  const visited = new Set<string>()
  const visit = (directory: string, depth: number): void => {
    if (found.length >= maxCandidates || depth > maxDepth) return
    let realDirectory: string
    try {
      realDirectory = realpathSync(directory)
    } catch {
      return
    }
    if (visited.has(realDirectory)) return
    visited.add(realDirectory)
    let entries: ReturnType<typeof readdirSync>
    try {
      entries = readdirSync(realDirectory, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (found.length >= maxCandidates) return
      const name = entry.name
      const candidate = join(realDirectory, name)
      if (entry.isFile() && COMPOSE_FILE_NAMES.has(name.toLocaleLowerCase())) {
        found.push(candidate)
        continue
      }
      if (!entry.isDirectory() || IGNORED_DIRECTORIES.has(name.toLocaleLowerCase())) continue
      visit(candidate, depth + 1)
    }
  }
  visit(workspace, 0)
  return found
}

function normalizeDockerResult(value: unknown, maxOutputBytes: number): ComposeCommandResult {
  if (value === null || typeof value !== 'object') return { status: null, stdout: '' }
  const result = value as Record<string, unknown>
  return {
    status: typeof result.status === 'number' ? result.status : null,
    stdout: typeof result.stdout === 'string' && result.stdout.length <= maxOutputBytes ? result.stdout : '',
  }
}

function runDocker(args: readonly string[], cwd: string, maxOutputBytes: number, contextName?: string, runner?: ComposeDockerRunner): ComposeCommandResult {
  const dockerArgs = contextName === undefined ? args : ['--context', contextName, ...args]
  if (runner !== undefined) {
    try { return normalizeDockerResult(runner(dockerArgs, cwd, maxOutputBytes), maxOutputBytes) }
    catch { return { status: null, stdout: '' } }
  }
  try {
    const result = spawnSync('docker', dockerArgs, {
      cwd,
      encoding: 'utf8',
      timeout: COMMAND_TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: maxOutputBytes,
      shell: false,
    }) as { readonly status?: number | null; readonly stdout?: unknown }
    return {
      status: typeof result.status === 'number' ? result.status : null,
      stdout: typeof result.stdout === 'string' && result.stdout.length <= maxOutputBytes ? result.stdout : '',
    }
  } catch {
    return { status: null, stdout: '' }
  }
}

function defaultComposeCommand(file: string, maxOutputBytes: number, projectName: string | undefined, contextName: string, runner?: ComposeDockerRunner): ComposeCommandResult {
  return runDocker([
    'compose',
    ...projectName === undefined ? [] : ['-p', projectName],
    '-f', file,
    'ps',
    '--format',
    'json',
  ], dirname(file), maxOutputBytes, contextName, runner)
}

function isLocalDockerEndpoint(value: unknown): value is string {
  return typeof value === 'string' && /^npipe:\/\//iu.test(value)
}

function localDockerContext(workspace: string, maxOutputBytes: number, runner?: ComposeDockerRunner): { readonly name: string; readonly endpoint: string } | undefined {
  const shown = runDocker(['context', 'show'], workspace, maxOutputBytes, undefined, runner)
  const contextName = shown.status === 0 && shown.stdout.trim().length > 0
    ? shown.stdout.trim()
    : undefined
  if (contextName === undefined || !/^[a-z0-9][a-z0-9_.-]{0,127}$/iu.test(contextName)) return undefined
  const result = runDocker([
    'context',
    'inspect',
    '--format',
    '{{json .Endpoints.docker.Host}}',
    contextName,
  ], workspace, maxOutputBytes, contextName, runner)
  if (result.status !== 0 || result.stdout.length > maxOutputBytes) return undefined
  try {
    const endpoint: unknown = JSON.parse(result.stdout.trim())
    // On Windows, Docker Desktop and the local Docker Engine are addressed by
    // a named pipe. Reject ssh/tcp/unix contexts so remote containers cannot
    // be joined to unrelated local listeners by port coincidence.
    return isLocalDockerEndpoint(endpoint) ? { name: contextName, endpoint } : undefined
  } catch {
    return undefined
  }
}

function defaultProjectNames(file: string, workspace: string, maxOutputBytes: number, contextName?: string, runner?: ComposeDockerRunner): readonly string[] {
  const values = new Set<string>()
  let overflow = false
  const readLabel = (key: string, value: string): void => {
    const result = runDocker([
      'ps',
      '--filter',
      `label=${key}=${value}`,
      '--format',
      '{{.Label "com.docker.compose.project"}}',
    ], workspace, maxOutputBytes, contextName, runner)
    if (result.status !== 0 || result.stdout.length > maxOutputBytes) return
    const candidates: string[] = []
    for (const line of result.stdout.split(/\r?\n/u)) {
      const projectName = boundedIdentifier(line.trim())
      if (projectName !== undefined) candidates.push(projectName)
      if (candidates.length > MAX_PROJECT_NAMES) {
        overflow = true
        return
      }
    }
    for (const projectName of candidates) values.add(projectName)
  }
  // Compose records both the directory it ran from and its config file path.
  // Either label is accepted only when Docker itself returns the project name
  // for this exact candidate value; port/image coincidence is never used.
  readLabel('com.docker.compose.project.working_dir', dirname(file))
  readLabel('com.docker.compose.project.config_files', file)
  return overflow || values.size > MAX_PROJECT_NAMES ? [] : [...values]
}

function recordsFromJson(stdout: string): readonly Record<string, unknown>[] | undefined {
  if (stdout.trim().length === 0) return []
  const values: unknown[] = []
  try {
    const parsed: unknown = JSON.parse(stdout)
    if (Array.isArray(parsed)) values.push(...parsed)
    else values.push(parsed)
  } catch {
    for (const line of stdout.split(/\r?\n/u)) {
      if (line.trim().length === 0) continue
      try { values.push(JSON.parse(line) as unknown) } catch { return undefined }
    }
  }
  const records = values.filter((value): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
  ))
  return records.length === values.length && records.every(isComposePsRecord) ? records : undefined
}

function isComposePublisher(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const publisher = value as Record<string, unknown>
  const publishedPort = publisher.PublishedPort ?? publisher.publishedPort
  const targetPort = publisher.TargetPort ?? publisher.targetPort
  const protocol = publisher.Protocol ?? publisher.protocol
  return validPort(publishedPort)
    && validPort(targetPort)
    && typeof protocol === 'string'
    && protocol.toLocaleLowerCase() === 'tcp'
}

function isComposePsRecord(value: Record<string, unknown>): boolean {
  const service = boundedIdentifier(value.Service ?? value.service)
  const image = bounded(value.Image ?? value.image, 512)
  const publishers = value.Publishers ?? value.publishers
  const containerId = boundedIdentifier(value.ID ?? value.Id ?? value.id ?? value.ContainerID ?? value.containerId)
  return service !== undefined
    && image !== undefined
    && containerId !== undefined
    && (publishers === null || Array.isArray(publishers) && publishers.every(isComposePublisher))
}

function parseRecord(record: Record<string, unknown>, composeFile: string, workspace: string): ComposeAssociation[] {
  const service = boundedIdentifier(record.Service ?? record.service)
  const image = bounded(record.Image ?? record.image, 512)
  if (service === undefined || image === undefined) return []
  const relativeComposeFile = normalizedName(relative(workspace, composeFile))
  const containerId = boundedIdentifier(record.ID ?? record.Id ?? record.id ?? record.ContainerID ?? record.containerId)
  const projectName = boundedIdentifier(record.Project ?? record.project)
  if (containerId === undefined) return []
  const result: ComposeAssociation[] = []
  const publishers = record.Publishers ?? record.publishers
  if (publishers !== null && !Array.isArray(publishers)) return []
  for (const publisher of publishers ?? []) {
    const hostPort = Number(publisher.PublishedPort ?? publisher.publishedPort)
    const containerPort = Number(publisher.TargetPort ?? publisher.targetPort)
    const protocol = String(publisher.Protocol ?? publisher.protocol ?? 'tcp').toLocaleLowerCase()
    if (!validPort(hostPort) || (Number.isFinite(containerPort) && !validPort(containerPort)) || protocol !== 'tcp') continue
    result.push(Object.freeze({
      composeFile,
      relativeComposeFile,
      service,
      image,
      containerId,
      ...projectName === undefined ? {} : { projectName },
      hostPort,
      ...validPort(containerPort) ? { containerPort } : {},
      protocol: 'tcp',
    }))
  }
  return result
}

/** Read-only Docker Compose correlation with bounded filesystem and CLI work. */
export function createComposeRuntimeAssociationReader(
  options: ComposeRuntimeAssociationOptions = {},
): ComposeRuntimeAssociationReader {
  // The options are Host/test seams, but never allow a caller to remove the
  // resource bounds that make an inventory refresh safe and predictable.
  const maxCandidates = boundedLimit(options.maxCandidates, DEFAULT_MAX_CANDIDATES, DEFAULT_MAX_CANDIDATES)
  const maxDepth = boundedLimit(options.maxDepth, DEFAULT_MAX_DEPTH, DEFAULT_MAX_DEPTH, 0)
  const maxOutputBytes = boundedLimit(options.maxOutputBytes, DEFAULT_MAX_OUTPUT_BYTES, DEFAULT_MAX_OUTPUT_BYTES)
  const usingDefaultCommand = options.command === undefined
  const command = options.command
  const projectNames = options.projectNames
  const dockerRunner = options.dockerRunner
  const readWithStatus = (workspace: string | undefined): ComposeRuntimeRead => {
    const root = safeWorkspace(workspace)
    if (root === undefined) return { associations: [], status: 'not-detected' }
    const files = discoverComposeFiles(root, maxCandidates, maxDepth)
    if (files.length === 0) return { associations: [], status: 'not-detected' }
    const shouldCheckContext = usingDefaultCommand || options.contextProbe !== undefined
    const context = shouldCheckContext
      ? (options.contextProbe ?? ((workspace: string) => localDockerContext(workspace, maxOutputBytes, dockerRunner)))(root)
      : undefined
    const contextName = context?.name
    if (shouldCheckContext
      && (context === undefined
        || !/^[a-z0-9][a-z0-9_.-]{0,127}$/iu.test(context.name)
        || !isLocalDockerEndpoint(context.endpoint))) {
      return { associations: [], status: 'unavailable' }
    }
    const associations: ComposeAssociation[] = []
    let successfulQuery = false
    for (const file of files) {
      const readProject = (projectName?: string): boolean => {
        let result: ComposeCommandResult
        try {
          result = command === undefined
            ? defaultComposeCommand(file, maxOutputBytes, projectName, contextName as string, dockerRunner)
            : command(file, projectName)
        } catch { return false }
        if (result === null || typeof result !== 'object') return false
        if (result.status !== 0 || typeof result.stdout !== 'string' || result.stdout.length > maxOutputBytes) return false
        const records = recordsFromJson(result.stdout)
        if (records === undefined) return false
        successfulQuery = true
        const before = associations.length
        for (const record of records) associations.push(...parseRecord(record, file, root))
        return associations.length > before
      }
      if (readProject()) continue
      let names: readonly string[] = []
      try {
        const candidateNames = projectNames === undefined
          ? defaultProjectNames(file, root, maxOutputBytes, contextName, dockerRunner)
          : projectNames(file, root)
        names = Array.isArray(candidateNames) ? candidateNames : []
      } catch { names = [] }
      if (names.length > MAX_PROJECT_NAMES) continue
      for (const projectName of names) {
        if (typeof projectName !== 'string' || projectName.length === 0 || projectName.length > 256) continue
        readProject(projectName)
      }
    }
    return Object.freeze({
      associations: Object.freeze(associations),
      status: successfulQuery ? 'available' : 'unavailable',
    })
  }
  return Object.freeze({
    read: (workspace: string | undefined): readonly ComposeAssociation[] => readWithStatus(workspace).associations,
    readWithStatus,
  })
}

export function composeAssociationForPort(
  associations: readonly ComposeAssociation[],
  protocol: 'tcp4' | 'tcp6',
  port: number,
): ComposeAssociation | undefined {
  if (protocol !== 'tcp4' && protocol !== 'tcp6') return undefined
  const matches = associations.filter(item => item.protocol === 'tcp' && item.hostPort === port)
  if (matches.length === 0) return undefined
  const unique = new Map(matches.map(item => [
    `${item.composeFile}|${item.relativeComposeFile}|${item.projectName ?? ''}|${item.service}|${item.hostPort}|${item.containerPort ?? ''}|${item.image}|${item.containerId}`,
    item,
  ]))
  return unique.size === 1 ? [...unique.values()][0] : undefined
}
