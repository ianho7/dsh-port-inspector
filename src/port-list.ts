import type { ProcessOrigin } from './attribution.js'
import { redactCommand, redactPath } from './redaction.js'
import type {
  AttributionConfidence,
  ListenerRecord,
  WindowsListenerScan,
} from './windows-scanner.js'

const MAX_TOOL_LISTENERS = 128
const MAX_TOOL_ID_LENGTH = 256
const MAX_TOOL_COMMAND_LENGTH = 1_024
const MAX_TOOL_PATH_LENGTH = 512
const MAX_RENDER_LENGTH = 65_536

export type PortListMode = 'observing' | 'read-only-degraded'
export type PortListOwnership = 'current-session' | 'another-dsh-session' | 'unattributed'

export interface PortListOrigin {
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

export interface PortListLifecycleOwner {
  readonly kind: 'job' | 'terminal'
  readonly id: string
}

export interface PortListListener {
  readonly protocol: 'tcp4' | 'tcp6'
  readonly localAddress: string
  readonly localPort: number
  readonly owningPid: number
  readonly processCreatedAt?: string
  readonly executable?: string
  readonly project?: string
  readonly confidence: AttributionConfidence
  readonly ownership: PortListOwnership
  readonly rootPid?: number
  readonly origin?: PortListOrigin
  readonly lifecycleOwner?: PortListLifecycleOwner
}

export interface PortListResult {
  readonly mode: PortListMode
  readonly readOnly: true
  readonly scanComplete: boolean
  readonly truncated: boolean
  readonly listeners: readonly PortListListener[]
}

export interface PortListToolExecution {
  readonly agent?: {
    readonly session?: { readonly id?: unknown }
  }
}

export interface PortListToolDefinition {
  readonly name: 'port_list'
  readonly description: string
  readonly parameters: {
    readonly type: 'object'
    readonly properties: Record<string, never>
    readonly additionalProperties: false
  }
  readonly output: {
    readonly schema: unknown
    readonly render: (_args: unknown, value: PortListResult) => readonly [{ readonly type: 'text'; readonly text: string }]
  }
  readonly execute: (_args: unknown, execution: PortListToolExecution) => Promise<PortListResult>
}

interface PortListToolRegistry {
  register(definition: PortListToolDefinition): () => void
}

function bounded(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value
}

function boundedId(value: unknown): string | undefined {
  return bounded(value, MAX_TOOL_ID_LENGTH)
}

function sanitizedCommand(value: unknown): string | undefined {
  const command = redactCommand(value)
  return bounded(command, MAX_TOOL_COMMAND_LENGTH)
}

function sanitizedPath(value: unknown): string | undefined {
  const path = redactPath(value)
  return bounded(path, MAX_TOOL_PATH_LENGTH)
}

function sessionIdFor(execution: PortListToolExecution): string | undefined {
  return boundedId(execution.agent?.session?.id)
}

function originFor(
  row: ListenerRecord,
  originsById: ReadonlyMap<number, ProcessOrigin>,
): ProcessOrigin | undefined {
  if (row.originId === undefined) return undefined
  return originsById.get(row.originId)
}

function publicOrigin(origin: ProcessOrigin): PortListOrigin {
  return Object.freeze({
    sessionId: boundedId(origin.sessionId) ?? '',
    agentId: boundedId(origin.agentId) ?? '',
    turn: origin.turn,
    step: origin.step,
    callId: boundedId(origin.callId) ?? '',
    rootCallId: boundedId(origin.rootCallId) ?? '',
    tool: boundedId(origin.tool) ?? '',
    ...sanitizedCommand(origin.command) === undefined ? {} : { command: sanitizedCommand(origin.command) },
    ...sanitizedPath(origin.workdir) === undefined ? {} : { workdir: sanitizedPath(origin.workdir) },
    kind: origin.kind,
  })
}

function lifecycleOwner(
  origin: ProcessOrigin,
  confidence: AttributionConfidence,
): PortListLifecycleOwner | undefined {
  // An inferred ancestry match never grants managed-owner authority. The
  // owner is shown only when the scanner has a verified identity chain.
  if (confidence !== 'verified') return undefined
  const jobId = boundedId(origin.jobId)
  if (jobId !== undefined) return Object.freeze({ kind: 'job', id: jobId })
  const terminalSessionId = boundedId(origin.terminalSessionId)
  if (terminalSessionId !== undefined) return Object.freeze({ kind: 'terminal', id: terminalSessionId })
  return undefined
}

function publicListener(
  row: ListenerRecord,
  origin: ProcessOrigin | undefined,
  currentSessionId: string | undefined,
): PortListListener {
  const sameSession = origin !== undefined
    && currentSessionId !== undefined
    && origin.sessionId === currentSessionId
  const ownership: PortListOwnership = origin === undefined
    ? 'unattributed'
    : sameSession ? 'current-session' : 'another-dsh-session'
  const currentOrigin = sameSession ? origin : undefined
  return Object.freeze({
    protocol: row.protocol,
    localAddress: bounded(row.localAddress, 128) ?? '',
    localPort: row.localPort,
    owningPid: row.owningPid,
    ...bounded(row.processCreatedAt, MAX_TOOL_ID_LENGTH) === undefined
      ? {}
      : { processCreatedAt: bounded(row.processCreatedAt, MAX_TOOL_ID_LENGTH) },
    ...sanitizedPath(row.executable) === undefined
      ? {}
      : { executable: sanitizedPath(row.executable) },
    confidence: row.confidence,
    ownership,
    ...currentOrigin === undefined || row.rootPid === undefined ? {} : { rootPid: row.rootPid },
    ...currentOrigin === undefined ? {} : {
      ...sanitizedPath(currentOrigin.workdir ?? row.project) === undefined
        ? {}
        : { project: sanitizedPath(currentOrigin.workdir ?? row.project) },
      origin: publicOrigin(currentOrigin),
      ...lifecycleOwner(currentOrigin, row.confidence) === undefined
        ? {}
        : { lifecycleOwner: lifecycleOwner(currentOrigin, row.confidence) },
    },
  })
}

/**
 * Project scanner data for the model-facing read-only Tool. No origin id or
 * action handle crosses this boundary; only the current Session receives
 * detailed attribution.
 */
export function projectPortList(
  scan: WindowsListenerScan,
  origins: readonly ProcessOrigin[],
  currentSessionId?: string,
  mode: PortListMode = 'observing',
): PortListResult {
  const originsById = new Map(origins.map(origin => [origin.id, origin]))
  const visibleRows = scan.rows.slice(0, MAX_TOOL_LISTENERS)
  const listeners = visibleRows.map(row => publicListener(row, originFor(row, originsById), currentSessionId))
  return Object.freeze({
    mode,
    readOnly: true,
    scanComplete: scan.complete,
    truncated: scan.rows.length > visibleRows.length,
    listeners: Object.freeze(listeners),
  })
}

function renderPortList(value: PortListResult): readonly [{ readonly type: 'text'; readonly text: string }] {
  const serialized = JSON.stringify(value)
  const text = serialized.length > MAX_RENDER_LENGTH
    ? `${serialized.slice(0, MAX_RENDER_LENGTH)}…`
    : serialized
  return [{ type: 'text', text }]
}

const PORT_LIST_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['mode', 'readOnly', 'scanComplete', 'truncated', 'listeners'],
  properties: {
    mode: { type: 'string', enum: ['observing', 'read-only-degraded'] },
    readOnly: { type: 'boolean' },
    scanComplete: { type: 'boolean' },
    truncated: { type: 'boolean' },
    listeners: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['protocol', 'localAddress', 'localPort', 'owningPid', 'confidence', 'ownership'],
        properties: {
          protocol: { type: 'string', enum: ['tcp4', 'tcp6'] },
          localAddress: { type: 'string' },
          localPort: { type: 'integer' },
          owningPid: { type: 'integer' },
          processCreatedAt: { type: 'string' },
          executable: { type: 'string' },
          project: { type: 'string' },
          confidence: { type: 'string', enum: ['verified', 'inferred', 'unattributed'] },
          ownership: { type: 'string', enum: ['current-session', 'another-dsh-session', 'unattributed'] },
          rootPid: { type: 'integer' },
          origin: {
            type: 'object',
            additionalProperties: false,
            required: ['sessionId', 'agentId', 'turn', 'step', 'callId', 'rootCallId', 'tool', 'kind'],
            properties: {
              sessionId: { type: 'string' },
              agentId: { type: 'string' },
              turn: { type: 'integer' },
              step: { type: 'integer' },
              callId: { type: 'string' },
              rootCallId: { type: 'string' },
              tool: { type: 'string' },
              command: { type: 'string' },
              workdir: { type: 'string' },
              kind: { type: 'string', enum: ['spawn', 'spawnTerminal'] },
            },
          },
          lifecycleOwner: {
            type: 'object',
            additionalProperties: false,
            required: ['kind', 'id'],
            properties: {
              kind: { type: 'string', enum: ['job', 'terminal'] },
              id: { type: 'string' },
            },
          },
        },
      },
    },
  },
} as const

export function createPortListTool(
  read: (execution: PortListToolExecution) => PortListResult,
): PortListToolDefinition {
  return {
    name: 'port_list',
    description: 'List visible Windows TCP listeners with confidence and privacy-scoped DSH attribution. Read-only; it cannot stop jobs, terminals, or processes.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    output: {
      schema: PORT_LIST_SCHEMA,
      render: (_args, value) => renderPortList(value),
    },
    async execute(_args, execution) {
      return read(execution)
    },
  }
}

export function registerPortListTool(
  registry: PortListToolRegistry | undefined,
  read: (execution: PortListToolExecution) => PortListResult,
): (() => void) | undefined {
  if (registry === undefined || typeof registry.register !== 'function') return undefined
  try {
    return registry.register(createPortListTool(read))
  } catch {
    // Tool registration is optional during early Bundle composition. The
    // runtime service remains available in read-only mode if the registry is
    // absent or rejects this optional surface.
    return undefined
  }
}
