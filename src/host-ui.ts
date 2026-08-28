import type { ProcessOrigin } from './attribution.js'
import type {
  ExternalTerminationRequest,
  ExternalTerminationResult,
  ExternalTerminationSelection,
} from './external-termination.js'
import type {
  LifecycleShutdownOptions,
  ManagedShutdownResult,
} from './lifecycle.js'
import {
  projectDevelopmentPresentation,
  type DevelopmentPresentation,
} from './development-presentation.js'
import {
  composeAssociationForPort,
  type ComposeAssociation,
  type ComposeRuntimeStatus,
  type ComposeRuntimeAssociationReader,
} from './compose-association.js'
import { redactAndBoundProcessCommand, redactCommand, redactPath } from './redaction.js'
import type {
  AttributionConfidence,
  ListenerRecord,
  WindowsListenerScan,
  WindowsListenerScanner,
} from './windows-scanner.js'

const MAX_ID_LENGTH = 512
const MAX_DISPLAY_LENGTH = 1_024
const MAX_COPY_LENGTH = 16_384
const MAX_SEARCH_LENGTH = 256
const MAX_INVENTORY_ROWS = 4_096

export type HostInventoryMode = 'observing' | 'read-only-degraded'
export type HostSessionVisibility =
  | 'current-session'
  | 'another-dsh-session'
  | 'unknown-session'
  | 'unattributed'
export type HostActionKind = 'managed-shutdown' | 'external-single-pid' | 'read-only' | 'degraded'
export type HostActionStatus = 'completed' | 'denied' | 'failed'
export type HostSortKey = 'port' | 'application' | 'pid' | 'project' | 'session'
export type HostSortDirection = 'asc' | 'desc'

export interface HostInventoryQuery {
  readonly search?: string
  /** Browser-selected Session; presentation/privacy only, never action authority. */
  readonly currentSessionId?: string
  /** Browser-selected project; presentation only, never action authority. */
  readonly currentProject?: string
  readonly sort?: {
    readonly key: HostSortKey
    readonly direction?: HostSortDirection
  }
}

export interface HostComposeAssociation {
  readonly relativeComposeFile: string
  readonly service: string
  readonly image: string
  readonly containerId: string
  readonly projectName?: string
  readonly hostPort: number
  readonly containerPort?: number
  readonly protocol: 'tcp'
}

export interface HostListenerAttribution {
  readonly sessionId: string
  readonly agentId: string
  readonly turn: number
  readonly step: number
  readonly callId: string
  readonly rootCallId: string
  readonly tool: string
  readonly command?: string
  readonly workdir?: string
  readonly kind: ProcessOrigin['kind']
}

export interface HostLifecycleOwner {
  readonly kind: 'job' | 'terminal'
  readonly id: string
}

export type HostLaunchChainRole = 'root' | 'intermediate' | 'listener'

export interface HostLaunchChainNode {
  readonly pid: number
  readonly executable?: string
  readonly command?: string
  readonly role: HostLaunchChainRole
}

export interface HostActionState {
  readonly kind: HostActionKind
  readonly label: string
  readonly available: boolean
  readonly requiresConfirmation: boolean
  readonly confirmation?: string
  readonly reason?: string
}

export interface HostListenerRow {
  readonly listenerId: string
  readonly protocol: 'tcp4' | 'tcp6'
  readonly address: string
  readonly port: number
  readonly pid: number
  readonly processCreatedAt?: string
  readonly executable?: string
  readonly project?: string
  readonly confidence: AttributionConfidence
  readonly sessionVisibility: HostSessionVisibility
  readonly session?: HostListenerAttribution
  readonly lifecycleOwner?: HostLifecycleOwner
  readonly compose?: HostComposeAssociation
  /** Read-only, redacted root-to-listener facts for verified attribution rows. */
  readonly launchChain?: readonly HostLaunchChainNode[]
  readonly action: HostActionState
  readonly development: DevelopmentPresentation
}

export interface HostInventorySnapshot {
  readonly mode: HostInventoryMode
  readonly scanComplete: boolean
  readonly truncated: boolean
  readonly composeStatus?: ComposeRuntimeStatus
  readonly listeners: readonly HostListenerRow[]
}

export interface HostCopyResult {
  readonly ok: boolean
  readonly text: string
  readonly copied: boolean
  readonly reason?: 'listener-not-found' | 'clipboard-failed'
  readonly error?: string
}

export interface HostOpenDirectoryResult {
  readonly ok: boolean
  readonly reason?: 'listener-not-found' | 'project-unavailable' | 'opener-unavailable' | 'open-failed'
  readonly error?: string
}

export interface HostActionRequest {
  readonly listenerId: string
  readonly kind: HostActionKind
  readonly confirmed?: boolean
  /** Browser-selected Session used only to project the returned fresh scan. */
  readonly currentSessionId?: string
  /** Browser-selected project; presentation-only input used to recheck Compose read-only state. */
  readonly currentProject?: string
}

export interface HostManagedOutcome {
  readonly ok: boolean
  readonly status: ManagedShutdownResult['status']
  readonly ownerKind?: ManagedShutdownResult['ownerKind']
  readonly ownerId?: string
  readonly stage?: ManagedShutdownResult['stage']
  readonly reason?: string
  readonly error?: string
}

export interface HostExternalOutcome {
  readonly ok: boolean
  readonly status: ExternalTerminationResult['status']
  readonly pid?: number
  readonly port?: number
  readonly revalidated: boolean
  readonly reason?: string
  readonly error?: string
}

export interface HostActionResult {
  readonly ok: boolean
  readonly action: HostActionKind
  readonly status: HostActionStatus
  readonly listenerId: string
  readonly port?: number
  readonly portReleased?: boolean
  readonly scanComplete: boolean
  readonly freshScan: HostInventorySnapshot
  readonly message: string
  readonly reason?: string
  readonly managed?: HostManagedOutcome
  readonly external?: HostExternalOutcome
}

export interface RuntimeInspectorHostOptions {
  readonly scanner: Pick<WindowsListenerScanner, 'scanWithStatus'>
  readonly origins: () => readonly ProcessOrigin[]
  readonly mode: () => HostInventoryMode
  readonly currentSessionId?: () => string | undefined
  readonly shutdown: (originId: number, options?: LifecycleShutdownOptions) => Promise<ManagedShutdownResult>
  readonly terminateExternal: (
    target: ExternalTerminationSelection,
    request?: ExternalTerminationRequest,
  ) => Promise<ExternalTerminationResult>
  /** Optional host-owned clipboard adapter. The redacted text is returned even without it. */
  readonly clipboard?: (text: string) => void | Promise<void>
  /** Optional host-owned directory opener. Raw paths never cross the RPC result. */
  readonly openDirectory?: (path: string) => void | Promise<void>
  /** Dynamic capability probe for an opener published after Bundle apply. */
  readonly openDirectoryAvailable?: () => boolean
  /** Host-owned workspace lookup keyed by the selected Session; never use Browser paths for probing. */
  readonly currentWorkspace?: (sessionId: string | undefined) => string | undefined
  /** Optional read-only Compose correlation; never grants process authority. */
  readonly compose?: ComposeRuntimeAssociationReader
}

export interface HostListenerRequest {
  readonly listenerId: string
  /** Optional selected Session used to keep Host workspace reads session-scoped. */
  readonly currentSessionId?: string
}

export interface RuntimeInspectorHostRpc {
  readonly inventory: (query?: HostInventoryQuery) => HostInventorySnapshot
  readonly copyDetails: (request: HostListenerRequest) => Promise<HostCopyResult>
  readonly openProjectDirectory: (request: HostListenerRequest) => Promise<HostOpenDirectoryResult>
  readonly performAction: (request: HostActionRequest) => Promise<HostActionResult>
}

export interface RuntimeInspectorHost extends RuntimeInspectorHostRpc {
  readonly rpc: RuntimeInspectorHostRpc
}

interface InternalEntry {
  readonly row: ListenerRecord
  readonly origin?: ProcessOrigin
  readonly compose?: ComposeAssociation
  readonly listenerId: string
}

interface InternalScan {
  readonly scan: WindowsListenerScan
  readonly entries: readonly InternalEntry[]
  readonly composeStatus?: ComposeRuntimeStatus
}

function bounded(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value
}

function boundedId(value: unknown): string | undefined {
  return bounded(value, MAX_ID_LENGTH)
}

function safeError(error: unknown): string | undefined {
  if (error === undefined || error === null) return undefined
  try {
    return bounded(error instanceof Error ? error.message : String(error), MAX_DISPLAY_LENGTH)
  } catch {
    return '<unprintable host error>'
  }
}

function safeMode(read: () => HostInventoryMode): HostInventoryMode {
  try {
    return read() === 'observing' ? 'observing' : 'read-only-degraded'
  } catch {
    return 'read-only-degraded'
  }
}

function safeOrigins(read: () => readonly ProcessOrigin[]): readonly ProcessOrigin[] {
  try {
    const origins = read()
    return Array.isArray(origins) ? origins : []
  } catch {
    return []
  }
}

function isComposeRuntimeStatus(value: unknown): value is ComposeRuntimeStatus {
  return value === 'available' || value === 'unavailable' || value === 'not-detected'
}

function isPort(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= 65_535
}

function safeComposeAssociation(value: unknown): ComposeAssociation | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const candidate = value as Record<string, unknown>
  const composeFile = typeof candidate.composeFile === 'string' && candidate.composeFile.length > 0 && candidate.composeFile.length <= MAX_ID_LENGTH
    ? candidate.composeFile
    : undefined
  const relativeComposeFile = typeof candidate.relativeComposeFile === 'string' && candidate.relativeComposeFile.length > 0 && candidate.relativeComposeFile.length <= MAX_DISPLAY_LENGTH
    ? candidate.relativeComposeFile
    : undefined
  const service = typeof candidate.service === 'string' && candidate.service.length > 0 && candidate.service.length <= MAX_DISPLAY_LENGTH
    ? candidate.service
    : undefined
  const image = typeof candidate.image === 'string' && candidate.image.length > 0 && candidate.image.length <= MAX_DISPLAY_LENGTH
    ? candidate.image
    : undefined
  if (composeFile === undefined || relativeComposeFile === undefined || service === undefined || image === undefined) return undefined
  if (!isPort(candidate.hostPort) || candidate.protocol !== 'tcp') return undefined
  if (candidate.containerPort !== undefined && !isPort(candidate.containerPort)) return undefined
  const containerId = boundedId(candidate.containerId)
  const projectName = boundedId(candidate.projectName)
  if (containerId === undefined) return undefined
  return Object.freeze({
    composeFile,
    relativeComposeFile,
    service,
    image,
    containerId,
    ...projectName === undefined ? {} : { projectName },
    hostPort: candidate.hostPort,
    ...candidate.containerPort === undefined ? {} : { containerPort: candidate.containerPort },
    protocol: 'tcp',
  })
}

function safeCompose(options: RuntimeInspectorHostOptions, workspace: string | undefined): { readonly associations: readonly ComposeAssociation[]; readonly status?: ComposeRuntimeStatus } {
  if (options.compose === undefined || workspace === undefined) return { associations: [] }
  try {
    if (options.compose.readWithStatus !== undefined) {
      const result = options.compose.readWithStatus(workspace)
      if (result !== null && typeof result === 'object' && Array.isArray(result.associations)) {
        const associations = result.associations.map(safeComposeAssociation).filter((value): value is ComposeAssociation => value !== undefined)
        const status = isComposeRuntimeStatus(result.status)
          ? result.status
          : associations.length > 0 ? 'available' : 'unavailable'
        return { associations, status }
      }
    }
    const associations = options.compose.read(workspace)
    const sanitized = Array.isArray(associations)
      ? associations.map(safeComposeAssociation).filter((value): value is ComposeAssociation => value !== undefined)
      : []
    return { associations: sanitized, status: sanitized.length > 0 ? 'available' : 'not-detected' }
  } catch {
    return { associations: [], status: 'unavailable' }
  }
}

function safeCurrentWorkspace(options: RuntimeInspectorHostOptions, sessionId: string | undefined): string | undefined {
  if (options.currentWorkspace === undefined) return undefined
  try {
    const workspace = options.currentWorkspace(sessionId)
    return typeof workspace === 'string' && workspace.length > 0 ? workspace : undefined
  } catch {
    return undefined
  }
}

function publicCompose(value: ComposeAssociation | undefined): HostComposeAssociation | undefined {
  if (value === undefined) return undefined
  const relativeComposeFile = bounded(value.relativeComposeFile, MAX_DISPLAY_LENGTH)
  const service = bounded(value.service, MAX_DISPLAY_LENGTH)
  const image = bounded(value.image, MAX_DISPLAY_LENGTH)
  if (relativeComposeFile === undefined || service === undefined || image === undefined || !isPort(value.hostPort)) return undefined
  if (value.containerPort !== undefined && !isPort(value.containerPort)) return undefined
  const containerId = boundedId(value.containerId)
  if (containerId === undefined) return undefined
  return Object.freeze({
    relativeComposeFile,
    service,
    image,
    containerId,
    ...boundedId(value.projectName) === undefined ? {} : { projectName: boundedId(value.projectName) },
    hostPort: value.hostPort,
    ...value.containerPort === undefined ? {} : { containerPort: value.containerPort },
    protocol: 'tcp',
  })
}

function listenerFingerprint(row: ListenerRecord): string {
  return [
    row.protocol,
    row.localAddress,
    row.localPort,
    row.owningPid,
    row.processCreatedAt ?? '',
  ].join('|')
}

/**
 * The UI receives an opaque, stable row key. It contains only listener
 * identity fields and never an origin object or an action callback.
 */
function listenerId(row: ListenerRecord): string {
  return `listener:${encodeURIComponent(listenerFingerprint(row))}`
}

function displayCommand(value: unknown): string | undefined {
  return bounded(redactCommand(value), MAX_DISPLAY_LENGTH)
}

function displayPath(value: unknown): string | undefined {
  return bounded(redactPath(value), MAX_DISPLAY_LENGTH)
}

function displayId(value: unknown): string | undefined {
  return boundedId(value)
}

function displayOrigin(origin: ProcessOrigin): HostListenerAttribution {
  const command = displayCommand(origin.command)
  const workdir = displayPath(origin.workdir)
  return Object.freeze({
    sessionId: displayId(origin.sessionId) ?? '',
    agentId: displayId(origin.agentId) ?? '',
    turn: origin.turn,
    step: origin.step,
    callId: displayId(origin.callId) ?? '',
    rootCallId: displayId(origin.rootCallId) ?? '',
    tool: displayId(origin.tool) ?? '',
    ...command === undefined ? {} : { command },
    ...workdir === undefined ? {} : { workdir },
    kind: origin.kind,
  })
}

function lifecycleOwner(row: ListenerRecord, origin: ProcessOrigin | undefined): HostLifecycleOwner | undefined {
  // A heuristic ancestry match may identify a candidate origin, but cannot
  // turn that candidate into a managed lifecycle authority.
  if (row.confidence !== 'verified' || origin === undefined) return undefined
  const jobId = displayId(origin.jobId)
  if (jobId !== undefined) return Object.freeze({ kind: 'job', id: jobId })
  const terminalSessionId = displayId(origin.terminalSessionId)
  if (terminalSessionId !== undefined) return Object.freeze({ kind: 'terminal', id: terminalSessionId })
  return undefined
}

function actionState(
  mode: HostInventoryMode,
  scanComplete: boolean,
  row: ListenerRecord,
  owner: HostLifecycleOwner | undefined,
  compose?: HostComposeAssociation,
): HostActionState {
  if (!scanComplete) {
    return Object.freeze({
      kind: 'read-only',
      label: 'Read-only',
      available: false,
      requiresConfirmation: false,
      reason: 'listener-scan-incomplete',
    })
  }
  if (compose !== undefined) {
    return Object.freeze({
      kind: 'read-only',
      label: 'Read-only',
      available: false,
      requiresConfirmation: false,
      reason: 'compose-managed',
    })
  }
  if (mode === 'observing' && owner !== undefined) {
    return Object.freeze({
      kind: 'managed-shutdown',
      label: 'Managed shutdown',
      available: true,
      requiresConfirmation: true,
      confirmation: `Confirm DSH ${owner.kind} shutdown for ${owner.id}.`,
    })
  }
  if (Number.isSafeInteger(row.owningPid) && row.owningPid > 0
    && typeof row.processCreatedAt === 'string' && row.processCreatedAt.length > 0
    && typeof row.executable === 'string' && row.executable.length > 0) {
    return Object.freeze({
      kind: 'external-single-pid',
      label: 'External single-PID termination',
      available: true,
      requiresConfirmation: true,
      confirmation: `Confirm direct termination of PID ${row.owningPid}. Identity will be rechecked first.`,
    })
  }
  return Object.freeze({
    kind: 'read-only',
    label: 'Read-only',
    available: false,
    requiresConfirmation: false,
    reason: 'identity-incomplete',
  })
}

function sessionVisibility(
  origin: ProcessOrigin | undefined,
  currentSessionId: string | undefined,
): HostSessionVisibility {
  if (origin === undefined) return 'unattributed'
  if (currentSessionId === undefined) return 'unknown-session'
  return origin.sessionId === currentSessionId ? 'current-session' : 'another-dsh-session'
}

function projectFor(row: ListenerRecord, origin: ProcessOrigin | undefined): string | undefined {
  return displayPath(origin?.workdir ?? row.project)
}

function projectPathForOpen(row: ListenerRecord, origin: ProcessOrigin | undefined): string | undefined {
  const path = typeof origin?.workdir === 'string'
    ? origin.workdir
    : typeof row.project === 'string' ? row.project : undefined
  const redacted = redactPath(path)
  if (path === undefined || path.length === 0 || redacted === undefined || redacted.includes('[REDACTED]')) return undefined
  return path
}

function publicLaunchChain(row: ListenerRecord, origin: ProcessOrigin | undefined): readonly HostLaunchChainNode[] | undefined {
  if (row.confidence !== 'verified' || origin === undefined || row.launchChain === undefined || row.launchChain.length === 0) return undefined
  const chain = row.launchChain.slice(0, 16).map(node => {
    const executable = bounded(displayPath(node.executable), MAX_DISPLAY_LENGTH)
    const command = redactAndBoundProcessCommand(node.command, MAX_DISPLAY_LENGTH)
    return {
      pid: node.pid,
      ...executable === undefined ? {} : { executable },
      ...command === undefined ? {} : { command },
      role: node.role,
    }
  })
  return Object.freeze(chain)
}

function openDirectoryAvailable(options: RuntimeInspectorHostOptions): boolean {
  if (options.openDirectory === undefined) return false
  try {
    return options.openDirectoryAvailable?.() !== false
  } catch {
    return false
  }
}

function toPublicEntry(
  entry: InternalEntry,
  mode: HostInventoryMode,
  scanComplete: boolean,
  currentSessionId: string | undefined,
  currentProject?: string,
  composeOverride?: ComposeAssociation,
): HostListenerRow {
  const { row, origin } = entry
  const owner = lifecycleOwner(row, origin)
  const attribution = origin === undefined ? undefined : displayOrigin(origin)
  const project = projectFor(row, origin)
  const compose = publicCompose(composeOverride ?? entry.compose)
  const launchChain = publicLaunchChain(row, origin)
  return Object.freeze({
    listenerId: entry.listenerId,
    protocol: row.protocol,
    address: bounded(row.localAddress, MAX_DISPLAY_LENGTH) ?? '',
    port: row.localPort,
    pid: row.owningPid,
    ...bounded(row.processCreatedAt, MAX_ID_LENGTH) === undefined
      ? {}
      : { processCreatedAt: bounded(row.processCreatedAt, MAX_ID_LENGTH) },
    ...displayPath(row.executable) === undefined
      ? {}
      : { executable: displayPath(row.executable) },
    ...project === undefined ? {} : { project },
    confidence: row.confidence,
    sessionVisibility: sessionVisibility(origin, currentSessionId),
    ...attribution === undefined ? {} : { session: attribution },
    ...owner === undefined ? {} : { lifecycleOwner: owner },
    ...compose === undefined ? {} : { compose },
    ...launchChain === undefined ? {} : { launchChain },
    action: actionState(mode, scanComplete, row, owner, compose),
    development: projectDevelopmentPresentation(row, origin, { currentSessionId, currentProject }, compose, launchChain),
  })
}

function compareText(left: string | undefined, right: string | undefined): number {
  if (left === undefined && right === undefined) return 0
  if (left === undefined) return 1
  if (right === undefined) return -1
  const a = left.toLocaleLowerCase()
  const b = right.toLocaleLowerCase()
  return a < b ? -1 : a > b ? 1 : 0
}

function sortValue(entry: InternalEntry, key: HostSortKey): number | string | undefined {
  const { row, origin } = entry
  if (key === 'port') return row.localPort
  if (key === 'pid') return row.owningPid
  if (key === 'application') return displayPath(row.executable) ?? displayId(origin?.tool)
  if (key === 'project') return projectFor(row, origin)
  return displayId(origin?.sessionId)
}

function sortEntries(entries: readonly InternalEntry[], sort: HostInventoryQuery['sort']): InternalEntry[] {
  if (sort === undefined) return [...entries]
  const direction = sort.direction === 'desc' ? -1 : 1
  return [...entries].sort((left, right) => {
    const a = sortValue(left, sort.key)
    const b = sortValue(right, sort.key)
    const comparison = typeof a === 'number' && typeof b === 'number'
      ? a - b
      : compareText(typeof a === 'string' ? a : undefined, typeof b === 'string' ? b : undefined)
    if (comparison !== 0) return comparison * direction
    return compareText(left.listenerId, right.listenerId)
  })
}

function searchText(entry: InternalEntry): string {
  const row = entry.row
  const origin = entry.origin
  const compose = entry.compose
  return [
    row.localPort,
    row.localAddress,
    row.owningPid,
    displayPath(row.executable),
    projectFor(row, origin),
    displayId(origin?.sessionId),
    displayId(origin?.agentId),
    displayId(origin?.tool),
    displayCommand(origin?.command),
    row.confidence,
    compose?.relativeComposeFile,
    compose?.service,
    compose?.image,
    compose?.containerId,
    compose?.projectName,
    compose?.hostPort,
    compose?.containerPort,
  ].filter(value => value !== undefined).join(' ').toLocaleLowerCase()
}

function matchesSearch(entry: InternalEntry, query: string | undefined): boolean {
  const search = bounded(query?.trim(), MAX_SEARCH_LENGTH)?.toLocaleLowerCase()
  return search === undefined || search.length === 0 || searchText(entry).includes(search)
}

function readInternalScan(options: RuntimeInspectorHostOptions, workspace?: string): InternalScan {
  const origins = safeOrigins(options.origins)
  let scan: WindowsListenerScan
  try {
    const candidate = options.scanner.scanWithStatus(origins)
    scan = candidate !== null && typeof candidate === 'object' && Array.isArray(candidate.rows)
      ? candidate
      : { rows: [], complete: false }
  } catch {
    scan = { rows: [], complete: false }
  }
  const originsById = new Map(origins.map(origin => [origin.id, origin]))
  const compose = safeCompose(options, workspace)
  const entries = scan.rows.slice(0, MAX_INVENTORY_ROWS).map(row => ({
    row,
    origin: row.originId === undefined ? undefined : originsById.get(row.originId),
    compose: composeAssociationForPort(compose.associations, row.protocol, row.localPort),
    listenerId: listenerId(row),
  }))
  return { scan, entries, ...compose.status === undefined ? {} : { composeStatus: compose.status } }
}

function readCurrentSession(options: RuntimeInspectorHostOptions, selected?: unknown): string | undefined {
  const selectedId = boundedId(selected)
  if (selectedId !== undefined) return selectedId
  try {
    return boundedId(options.currentSessionId?.())
  } catch {
    return undefined
  }
}

function snapshotFrom(
  internal: InternalScan,
  mode: HostInventoryMode,
  currentSessionId: string | undefined,
  query: HostInventoryQuery = {},
): HostInventorySnapshot {
  const filtered = internal.entries.filter(entry => matchesSearch(entry, query.search))
  const sorted = sortEntries(filtered, query.sort)
  const visible = sorted.slice(0, MAX_INVENTORY_ROWS)
  return Object.freeze({
    mode,
    scanComplete: internal.scan.complete,
    truncated: filtered.length > visible.length || internal.scan.rows.length > MAX_INVENTORY_ROWS,
    ...internal.composeStatus === undefined ? {} : { composeStatus: internal.composeStatus },
    listeners: Object.freeze(visible.map(entry => toPublicEntry(entry, mode, internal.scan.complete, currentSessionId, query.currentProject, entry.compose))),
  })
}

function rowFor(entries: readonly InternalEntry[], listenerId: string): InternalEntry | undefined {
  return entries.find(entry => entry.listenerId === listenerId)
}

function samePort(left: ListenerRecord, right: ListenerRecord): boolean {
  return left.protocol === right.protocol && left.localPort === right.localPort
}

function releasedAfter(row: ListenerRecord, scan: WindowsListenerScan): boolean | undefined {
  if (!scan.complete) return undefined
  return !scan.rows.some(candidate => samePort(row, candidate))
}

function actionMessage(
  action: string,
  status: HostActionStatus,
  port: number | undefined,
  portReleased: boolean | undefined,
  detail?: string,
): string {
  const portText = port === undefined ? 'the selected port' : `port ${port}`
  if (status === 'denied') return detail ?? `${action} is not available for this listener.`
  if (status === 'failed') return detail ?? `${action} failed; no process escalation was attempted.`
  if (portReleased === true) return `${action} completed; ${portText} is no longer listening.`
  if (portReleased === false) return `${action} completed, but ${portText} is still listening.`
  return `${action} completed, but the fresh scan could not confirm whether ${portText} was released.`
}

function safeManagedOutcome(result: ManagedShutdownResult): HostManagedOutcome {
  return Object.freeze({
    ok: result.ok,
    status: result.status,
    ...result.ownerKind === undefined ? {} : { ownerKind: result.ownerKind },
    ...boundedId(result.ownerId) === undefined ? {} : { ownerId: boundedId(result.ownerId) },
    ...result.stage === undefined ? {} : { stage: result.stage },
    ...bounded(result.reason, MAX_DISPLAY_LENGTH) === undefined ? {} : { reason: bounded(result.reason, MAX_DISPLAY_LENGTH) },
    ...safeError(result.error) === undefined ? {} : { error: safeError(result.error) },
  })
}

function safeExternalOutcome(result: ExternalTerminationResult): HostExternalOutcome {
  return Object.freeze({
    ok: result.ok,
    status: result.status,
    ...result.pid === undefined ? {} : { pid: result.pid },
    ...result.port === undefined ? {} : { port: result.port },
    revalidated: result.revalidated,
    ...bounded(result.reason, MAX_DISPLAY_LENGTH) === undefined ? {} : { reason: bounded(result.reason, MAX_DISPLAY_LENGTH) },
    ...safeError(result.error) === undefined ? {} : { error: safeError(result.error) },
  })
}

function redactedDetails(entry: InternalEntry, publicRow: HostListenerRow): string {
  const origin = entry.origin
  const lines = [
    `Port: ${publicRow.port}`,
    `Address: ${publicRow.address}`,
    `PID: ${publicRow.pid}`,
    `Executable: ${publicRow.executable ?? '<unavailable>'}`,
    `Project: ${publicRow.project ?? '<unavailable>'}`,
    `Confidence: ${publicRow.confidence}`,
    `Session visibility: ${publicRow.sessionVisibility}`,
    `Session: ${publicRow.session?.sessionId ?? '<unattributed>'}`,
    `Agent: ${publicRow.session?.agentId ?? '<unattributed>'}`,
    `Turn/Step: ${publicRow.session === undefined ? '<unattributed>' : `${publicRow.session.turn}/${publicRow.session.step}`}`,
    `Call ID: ${publicRow.session?.callId ?? '<unattributed>'}`,
    `Root Call ID: ${publicRow.session?.rootCallId ?? '<unattributed>'}`,
    `Tool: ${publicRow.session?.tool ?? '<unattributed>'}`,
    `Spawn type: ${publicRow.session?.kind ?? '<unattributed>'}`,
    `Workdir: ${publicRow.session?.workdir ?? '<unavailable>'}`,
    `Lifecycle owner: ${publicRow.lifecycleOwner === undefined ? '<none>' : `${publicRow.lifecycleOwner.kind}:${publicRow.lifecycleOwner.id}`}`,
    `Action: ${publicRow.action.label}`,
    `Command: ${displayCommand(origin?.command) ?? '<unavailable>'}`,
    `Compose association: ${publicRow.compose === undefined ? '<none>' : 'confirmed'}`,
    `Compose file: ${publicRow.compose?.relativeComposeFile ?? '<unavailable>'}`,
    `Compose service: ${publicRow.compose?.service ?? '<unavailable>'}`,
    `Compose image: ${publicRow.compose?.image ?? '<unavailable>'}`,
    `Container ID: ${publicRow.compose?.containerId ?? '<unavailable>'}`,
    `Published mapping: ${publicRow.compose === undefined ? '<unavailable>' : `${publicRow.compose.hostPort}:${publicRow.compose.containerPort ?? '?'}/${publicRow.compose.protocol}`}`,
  ]
  return bounded(lines.join('\n'), MAX_COPY_LENGTH) ?? ''
}

function emptyActionResult(request: HostActionRequest, message: string, internal: InternalScan, mode: HostInventoryMode, currentSessionId: string | undefined, reason: string): HostActionResult {
  const freshScan = snapshotFrom(internal, mode, currentSessionId)
  return Object.freeze({
    ok: false,
    action: request.kind,
    status: 'denied',
    listenerId: request.listenerId,
    scanComplete: freshScan.scanComplete,
    freshScan,
    message,
    reason,
  })
}

/**
 * Create the trusted Host/UI boundary. It owns no process handles and exposes
 * no scanner, origin registry, or termination callback in its RPC surface.
 */
export function createRuntimeInspectorHost(options: RuntimeInspectorHostOptions): RuntimeInspectorHost {
  let lastWorkspace: string | undefined
  const workspaceBySession = new Map<string, string>()
  const resolveWorkspace = (sessionId: string | undefined): string | undefined => {
    const workspace = safeCurrentWorkspace(options, sessionId)
    if (sessionId !== undefined) {
      if (workspace === undefined) workspaceBySession.delete(sessionId)
      else workspaceBySession.set(sessionId, workspace)
      return workspace
    }
    if (workspace !== undefined) lastWorkspace = workspace
    return workspace ?? lastWorkspace
  }
  const inventory = (query: HostInventoryQuery = {}): HostInventorySnapshot => {
    const currentSessionId = readCurrentSession(options, query.currentSessionId)
    const workspace = resolveWorkspace(currentSessionId)
    const internal = readInternalScan(options, workspace)
    return snapshotFrom(internal, safeMode(options.mode), currentSessionId, query)
  }

  const copyDetails = async (request: HostListenerRequest): Promise<HostCopyResult> => {
    const currentSessionId = readCurrentSession(options, request.currentSessionId)
    const internal = readInternalScan(options, resolveWorkspace(currentSessionId))
    const entry = rowFor(internal.entries, request.listenerId)
    if (entry === undefined) return Object.freeze({ ok: false, text: '', copied: false, reason: 'listener-not-found' })
    const mode = safeMode(options.mode)
    const publicRow = toPublicEntry(entry, mode, internal.scan.complete, currentSessionId)
    const text = redactedDetails(entry, publicRow)
    if (options.clipboard === undefined) return Object.freeze({ ok: true, text, copied: false })
    try {
      await options.clipboard(text)
      return Object.freeze({ ok: true, text, copied: true })
    } catch (error) {
      return Object.freeze({ ok: false, text, copied: false, reason: 'clipboard-failed', error: safeError(error) })
    }
  }

  const openProjectDirectory = async (request: HostListenerRequest): Promise<HostOpenDirectoryResult> => {
    const currentSessionId = readCurrentSession(options, request.currentSessionId)
    const entry = rowFor(readInternalScan(options, resolveWorkspace(currentSessionId)).entries, request.listenerId)
    if (entry === undefined) return Object.freeze({ ok: false, reason: 'listener-not-found' })
    const path = projectPathForOpen(entry.row, entry.origin)
    if (path === undefined) return Object.freeze({ ok: false, reason: 'project-unavailable' })
    const openDirectory = options.openDirectory
    if (openDirectory === undefined || !openDirectoryAvailable(options)) return Object.freeze({ ok: false, reason: 'opener-unavailable' })
    try {
      await openDirectory(path)
      return Object.freeze({ ok: true })
    } catch (error) {
      return Object.freeze({ ok: false, reason: 'open-failed', error: safeError(error) })
    }
  }

  const performAction = async (request: HostActionRequest): Promise<HostActionResult> => {
    const mode = safeMode(options.mode)
    const currentSessionId = readCurrentSession(options, request.currentSessionId)
    // Re-scan before dispatch so a stale UI row cannot select a reused PID or
    // a managed owner that has already changed state.
    const workspace = resolveWorkspace(currentSessionId)
    const before = readInternalScan(options, workspace)
    const entry = rowFor(before.entries, request.listenerId)
    if (entry === undefined) {
      return emptyActionResult(request, 'The listener is no longer present; refresh the inventory.', before, mode, currentSessionId, 'listener-not-found')
    }
    const publicRow = toPublicEntry(entry, mode, before.scan.complete, currentSessionId)
    if (!publicRow.action.available || publicRow.action.kind !== request.kind) {
      return emptyActionResult(request, publicRow.action.reason === 'compatibility-degraded'
        ? 'Runtime Inspector is in read-only degraded mode; no process action is available.'
        : 'The requested action is not allowed for this listener.', before, mode, currentSessionId, 'action-not-allowed')
    }
    if (request.confirmed !== true) {
      return emptyActionResult(request, publicRow.action.confirmation ?? 'Explicit confirmation is required before this action.', before, mode, currentSessionId, 'confirmation-required')
    }

    let managed: HostManagedOutcome | undefined
    let external: HostExternalOutcome | undefined
    let status: HostActionStatus = 'failed'
    let ok = false
    let detail: string | undefined
    if (request.kind === 'managed-shutdown') {
      if (entry.row.originId === undefined || entry.origin === undefined) {
        return emptyActionResult(request, 'The managed lifecycle owner is no longer available.', before, mode, currentSessionId, 'managed-owner-unavailable')
      }
      try {
        const result = await options.shutdown(entry.row.originId, { reason: 'Runtime Inspector UI request' })
        managed = safeManagedOutcome(result)
        ok = result.ok
        status = result.ok ? 'completed' : 'failed'
        detail = result.error ?? result.reason
      } catch (error) {
        detail = safeError(error)
      }
    } else if (request.kind === 'external-single-pid') {
      const selection: ExternalTerminationSelection = {
        owningPid: entry.row.owningPid,
        processCreatedAt: entry.row.processCreatedAt,
        executable: entry.row.executable,
        localPort: entry.row.localPort,
        protocol: entry.row.protocol,
        localAddress: entry.row.localAddress,
        confidence: entry.row.confidence,
      }
      try {
        const result = await options.terminateExternal(selection, { confirmed: true })
        external = safeExternalOutcome(result)
        ok = result.ok
        status = result.ok ? 'completed' : result.status === 'denied' ? 'denied' : 'failed'
        detail = result.error ?? result.reason
      } catch (error) {
        detail = safeError(error)
      }
    }

    const after = readInternalScan(options, workspace)
    const released = releasedAfter(entry.row, after.scan)
    const freshScan = snapshotFrom(after, mode, currentSessionId)
    const message = actionMessage(publicRow.action.label, status, entry.row.localPort, released, status === 'failed' && detail !== undefined
      ? `${publicRow.action.label} failed: ${bounded(detail, MAX_DISPLAY_LENGTH)}`
      : status === 'denied' && detail !== undefined ? bounded(detail, MAX_DISPLAY_LENGTH) : undefined)
    return Object.freeze({
      ok,
      action: request.kind,
      status,
      listenerId: request.listenerId,
      port: entry.row.localPort,
      ...released === undefined ? {} : { portReleased: released },
      scanComplete: freshScan.scanComplete,
      freshScan,
      message,
      ...managed === undefined ? {} : { managed },
      ...external === undefined ? {} : { external },
    })
  }

  const rpc: RuntimeInspectorHostRpc = Object.freeze({
    inventory,
    copyDetails,
    openProjectDirectory,
    performAction,
  })
  return Object.freeze({
    inventory,
    copyDetails,
    openProjectDirectory,
    performAction,
    rpc,
  })
}
