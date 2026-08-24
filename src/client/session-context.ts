import { redactCommand, redactPath } from '../redaction.js'

const WINDOWS_EPOCH_TICKS = 116_444_736_000_000_000n
const TICKS_PER_MILLISECOND = 10_000n
const MAX_REQUEST_LENGTH = 1_024

interface TextBlockLike {
  readonly type?: unknown
  readonly text?: unknown
}

interface ConversationNodeLike {
  readonly kind?: unknown
  readonly turn?: unknown
  readonly callId?: unknown
  readonly content?: readonly TextBlockLike[]
  readonly blocks?: readonly unknown[]
  readonly subCalls?: readonly unknown[]
}

export interface RuntimeInspectorConversationLike {
  readonly nodes?: readonly ConversationNodeLike[]
  readonly runningCalls?: readonly unknown[]
}

export interface RuntimeInspectorSessionContextInput {
  readonly sessionId?: string
  readonly title?: string
  readonly cwd?: string
  readonly conversation?: RuntimeInspectorConversationLike
}

export interface RuntimeInspectorCallContext {
  readonly sessionId?: string
  readonly callId?: string
  readonly rootCallId?: string
  readonly turn?: number
}

export interface RuntimeInspectorSessionContext {
  readonly sessionId?: string
  readonly title?: string
  readonly cwd?: string
  readonly requestFor: (call: RuntimeInspectorCallContext) => string | undefined
}

export interface RuntimeInspectorSessionListLike {
  readonly current?: string
  readonly byId: Readonly<Record<string, {
    readonly displayTitle?: string
    readonly cwd?: string
  } | undefined>>
}

export interface RuntimeInspectorObservableLike<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
}

export interface RuntimeInspectorClientSessionsLike {
  readonly list: RuntimeInspectorObservableLike<RuntimeInspectorSessionListLike>
  binding(id: string): { readonly session: RuntimeInspectorObservableLike<RuntimeInspectorConversationLike> } | undefined
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function boundedText(value: unknown, maxLength = MAX_REQUEST_LENGTH): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.replace(/\s+/gu, ' ').trim()
  if (normalized.length === 0) return undefined
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}…` : normalized
}

function contentText(content: readonly TextBlockLike[] | undefined): string | undefined {
  if (!Array.isArray(content)) return undefined
  return boundedText(redactCommand(content
    .filter(block => block?.type === 'text' && typeof block.text === 'string')
    .map(block => block.text as string)
    .join('\n')))
}

function safeInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : undefined
}

function callIdOf(value: unknown): string | undefined {
  const item = record(value)
  const candidate = item?.callId
  return typeof candidate === 'string' && candidate.length > 0 ? candidate : undefined
}

function indexCalls(
  values: readonly unknown[] | undefined,
  turn: number | undefined,
  request: string | undefined,
  requestsByCall: Map<string, string>,
): void {
  if (!Array.isArray(values)) return
  for (const value of values) {
    const item = record(value)
    if (item === undefined) continue
    const itemTurn = safeInteger(item.turn) ?? turn
    const id = callIdOf(item)
    if (id !== undefined && request !== undefined) requestsByCall.set(id, request)
    indexCalls(Array.isArray(item.subCalls) ? item.subCalls : undefined, itemTurn, request, requestsByCall)
  }
}

function formatDate(date: Date): string | undefined {
  if (!Number.isFinite(date.getTime())) return undefined
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date)
  } catch {
    return date.toISOString()
  }
}

/** Convert Host identity time to a human-facing local time without changing its raw safety identity. */
export function formatProcessCreatedAt(value: string | undefined): string {
  if (value === undefined || value.length === 0) return '—'
  if (/^\d{17,20}$/u.test(value)) {
    try {
      const ticks = BigInt(value)
      if (ticks >= WINDOWS_EPOCH_TICKS) {
        const milliseconds = Number((ticks - WINDOWS_EPOCH_TICKS) / TICKS_PER_MILLISECOND)
        const formatted = formatDate(new Date(milliseconds))
        if (formatted !== undefined) return formatted
      }
    } catch {
      // Fall through to ordinary date parsing and finally the original value.
    }
  }
  const formatted = formatDate(new Date(value))
  return formatted ?? value
}

/** Build a presentation-only view of the Browser-selected DSH Session. */
export function buildRuntimeInspectorSessionContext(
  input: RuntimeInspectorSessionContextInput,
): RuntimeInspectorSessionContext {
  const requestsByTurn = new Map<number, string>()
  const requestsByCall = new Map<string, string>()
  let latestRequest: string | undefined

  for (const node of input.conversation?.nodes ?? []) {
    if (node.kind === 'user' || node.kind === 'steering') {
      latestRequest = contentText(node.content) ?? latestRequest
      continue
    }
    const turn = safeInteger(node.turn)
    if (turn !== undefined && latestRequest !== undefined && !requestsByTurn.has(turn)) {
      requestsByTurn.set(turn, latestRequest)
    }
    indexCalls(node.blocks, turn, latestRequest, requestsByCall)
    const id = typeof node.callId === 'string' ? node.callId : undefined
    if (id !== undefined && latestRequest !== undefined) requestsByCall.set(id, latestRequest)
    indexCalls(node.subCalls, turn, latestRequest, requestsByCall)
  }
  indexCalls(input.conversation?.runningCalls, undefined, latestRequest, requestsByCall)

  const sessionId = boundedText(input.sessionId, 512)
  return Object.freeze({
    ...sessionId === undefined ? {} : { sessionId },
    ...boundedText(input.title, 512) === undefined ? {} : { title: boundedText(input.title, 512) },
    ...redactPath(input.cwd) === undefined ? {} : { cwd: redactPath(input.cwd) },
    requestFor: (call: RuntimeInspectorCallContext): string | undefined => {
      // A request is Session-private presentation data. Missing Session
      // attribution means "not associated", never "use the current Session".
      if (call.sessionId === undefined || call.sessionId !== sessionId) return undefined
      if (call.callId !== undefined) {
        const request = requestsByCall.get(call.callId)
        if (request !== undefined) return request
      }
      if (call.rootCallId !== undefined) {
        const request = requestsByCall.get(call.rootCallId)
        if (request !== undefined) return request
      }
      return call.turn === undefined ? undefined : requestsByTurn.get(call.turn)
    },
  })
}
