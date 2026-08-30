import * as React from 'react'
import type {
  HostActionKind,
  HostActionRequest,
  HostInventorySnapshot,
  HostListenerRow,
} from '../host-ui.js'
import type { RuntimeInspectorBrowserRpc } from './bridge.js'
import {
  createRuntimeInspectorLocaleStore,
  createRuntimeInspectorTranslator,
  type RuntimeInspectorLocaleStore,
  type RuntimeInspectorTranslator,
} from './i18n.js'
import {
  buildRuntimeInspectorSessionContext,
  formatProcessCreatedAt,
  type RuntimeInspectorClientSessionsLike,
  type RuntimeInspectorConversationLike,
  type RuntimeInspectorObservableLike,
  type RuntimeInspectorSessionContext,
  type RuntimeInspectorSessionListLike,
} from './session-context.js'
import {
  IconCheck,
  IconChevron,
  IconClose,
  IconCopy,
  IconFolder,
  IconInfo,
  IconLinkSignal,
  IconPin,
  IconPulse,
  IconQuestion,
  IconRefresh,
  IconSearch,
} from './icons.js'
import { loadPinnedListenerKeys, savePinnedListenerKeys, togglePinnedListenerKey } from './pinned-listeners.js'
import {
  actionRequestFailureNotice,
  actionResultNotice,
  copyRequestFailureNotice,
  copyResultNotice,
  inventoryFailureNotice,
  openDirectoryRequestFailureNotice,
  openDirectoryResultNotice,
  noticeAutoDismissMs,
  operationNoticePlacement,
  type PanelNotice,
} from './notices.js'
import { ComposeContextLogo, ToolchainLogo, toolchainName } from './toolchain-logos.js'
import runtimeInspectorLogo from '../../assets/runtime-inspector-logo.webp'

interface SidebarEntryProps {
  readonly wide?: boolean
  readonly onOpen: (trigger?: HTMLElement) => void
  readonly rpc: RuntimeInspectorBrowserRpc
  readonly sessions: RuntimeInspectorClientSessionsLike
  readonly locale: RuntimeInspectorLocaleStore
}

interface PanelProps {
  readonly rpc: RuntimeInspectorBrowserRpc
  readonly sessions: RuntimeInspectorClientSessionsLike
  readonly locale: RuntimeInspectorLocaleStore
}

interface PanelState {
  readonly snapshot?: HostInventorySnapshot
  readonly snapshotContextKey?: string
  readonly inventoryNotice?: PanelNotice
  readonly operationNotice?: PanelNotice
  readonly loading?: boolean
}

type SourceFilterKey = 'all' | 'dsh' | 'unconfirmed'
type ScopeKey = 'development' | 'all'
type SortKey = 'port' | 'application' | 'pid' | 'project' | 'session'
type SortDirection = 'asc' | 'desc'
type SourceState = 'verified' | 'inferred' | 'unattributed' | 'degraded'

const panelState = {
  open: false,
  listeners: new Set<() => void>(),
  returnFocus: undefined as HTMLElement | undefined,
}

const EMPTY_SESSION_LIST: RuntimeInspectorSessionListLike = Object.freeze({ byId: Object.freeze({}) })
const EMPTY_CONVERSATION: RuntimeInspectorConversationLike = Object.freeze({ nodes: Object.freeze([]), runningCalls: Object.freeze([]) })
const noopSubscribe = (): (() => void) => () => {}
const ENTRY_BADGE_REFRESH_MS = 5_000

function shortContainerId(value: string | undefined): string {
  if (value === undefined || value.length <= 12) return value ?? '—'
  return `${value.slice(0, 12)}…`
}

interface EntryBadgeSnapshot {
  readonly contextKey: string
  readonly count?: number
  readonly inventory?: HostInventorySnapshot
}

let entryBadgeSnapshot: EntryBadgeSnapshot = Object.freeze({ contextKey: '' })
const entryBadgeListeners = new Set<() => void>()

function entryBadgeContextKey(sessionId: string | undefined, cwd: string | undefined): string {
  return `${sessionId ?? ''}\u0000${cwd ?? ''}`
}

function readEntryBadgeSnapshot(): EntryBadgeSnapshot {
  return entryBadgeSnapshot
}

function subscribeEntryBadge(listener: () => void): () => void {
  entryBadgeListeners.add(listener)
  return () => { entryBadgeListeners.delete(listener) }
}

function setEntryBadgeSnapshot(next: EntryBadgeSnapshot): void {
  if (next.contextKey === entryBadgeSnapshot.contextKey
    && next.count === entryBadgeSnapshot.count
    && next.inventory === entryBadgeSnapshot.inventory) return
  entryBadgeSnapshot = Object.freeze(next)
  for (const listener of [...entryBadgeListeners]) listener()
}

function publishEntryBadgeSnapshot(snapshot: HostInventorySnapshot, contextKey: string): void {
  setEntryBadgeSnapshot({
    contextKey,
    inventory: snapshot,
    ...snapshot.mode === 'read-only-degraded'
      ? {}
      : { count: snapshot.listeners.filter(isCurrentProjectListener).length },
  })
}

function publishEntryBadgeFailure(contextKey: string): void {
  const previous = readEntryBadgeSnapshot()
  setEntryBadgeSnapshot({
    contextKey,
    ...previous.contextKey === contextKey && previous.inventory !== undefined
      ? { inventory: previous.inventory }
      : {},
  })
}

function useRuntimeInspectorSessionContext(sessions: RuntimeInspectorClientSessionsLike): RuntimeInspectorSessionContext {
  const subscribeList = React.useCallback((listener: () => void) => sessions.list.subscribe(listener), [sessions])
  const readList = React.useCallback(() => sessions.list.getSnapshot() ?? EMPTY_SESSION_LIST, [sessions])
  const list = React.useSyncExternalStore(subscribeList, readList, readList)
  const sessionId = list.current
  const summary = sessionId === undefined ? undefined : list.byId[sessionId]
  let face: RuntimeInspectorObservableLike<RuntimeInspectorConversationLike> | undefined
  try {
    face = sessionId === undefined ? undefined : sessions.binding(sessionId)?.session
  } catch {
    face = undefined
  }
  const subscribeConversation = React.useCallback(
    (listener: () => void) => face?.subscribe(listener) ?? noopSubscribe(),
    [face],
  )
  const readConversation = React.useCallback(() => face?.getSnapshot() ?? EMPTY_CONVERSATION, [face])
  const conversation = React.useSyncExternalStore(subscribeConversation, readConversation, readConversation)
  return React.useMemo(() => buildRuntimeInspectorSessionContext({
    sessionId,
    title: summary?.displayTitle,
    cwd: summary?.cwd,
    conversation,
  }), [conversation, sessionId, summary?.cwd, summary?.displayTitle])
}

function useRuntimeInspectorTranslator(localeStore: RuntimeInspectorLocaleStore): RuntimeInspectorTranslator {
  const locale = React.useSyncExternalStore(localeStore.subscribe, localeStore.getSnapshot, localeStore.getSnapshot)
  return React.useMemo(() => createRuntimeInspectorTranslator(locale), [locale])
}

function notifyPanelState(): void {
  for (const listener of [...panelState.listeners]) listener()
}

function setPanelOpen(open: boolean): void {
  panelState.open = open
  notifyPanelState()
}

export function openRuntimeInspectorPanel(trigger?: HTMLElement): void {
  panelState.returnFocus = trigger
  setPanelOpen(true)
}

function usePanelOpen(): boolean {
  const [open, setOpen] = React.useState(panelState.open)
  React.useEffect(() => {
    const listener = (): void => { setOpen(panelState.open) }
    panelState.listeners.add(listener)
    return () => { panelState.listeners.delete(listener) }
  }, [])
  return open
}

function actionLabel(kind: HostActionKind, t: RuntimeInspectorTranslator['t']): string {
  switch (kind) {
    case 'managed-shutdown': return t('actionManaged')
    case 'external-single-pid': return t('actionExternal')
    case 'read-only':
    case 'degraded':
      return t('actionReadOnly')
  }
}

function NoticeView({
  notice,
  t,
  className = '',
}: {
  readonly notice: PanelNotice
  readonly t: RuntimeInspectorTranslator['t']
  readonly className?: string
}): React.ReactNode {
  return React.createElement('div', {
    className: `dsh-ri-notice is-${notice.tone}${className.length === 0 ? '' : ` ${className}`}`,
    role: notice.tone === 'error' ? 'alert' : 'status',
    'data-runtime-inspector-notice': notice.source,
    'data-runtime-inspector-notice-tone': notice.tone,
    ...notice.source === 'action' ? { 'data-runtime-inspector-action-result': 'result' } : {},
  },
  notice.tone === 'success' ? IconCheck({ size: 14 }) : IconInfo({ size: 14 }),
  React.createElement('div', { className: 'dsh-ri-notice-content' },
    React.createElement('span', { className: 'dsh-ri-notice-message' }, notice.message),
    notice.detail === undefined ? null : React.createElement('details', { className: 'dsh-ri-notice-details' },
      React.createElement('summary', null, t('technicalDetails')),
      React.createElement('div', { className: 'dsh-ri-notice-detail-value' }, notice.detail),
    ),
  ),
  )
}

function actionPillLabel(kind: HostActionKind, compact: boolean, t: RuntimeInspectorTranslator['t']): string {
  switch (kind) {
    case 'managed-shutdown': return compact ? t('actionManagedCompact') : t('actionManaged')
    case 'external-single-pid': return compact ? t('actionExternalCompact') : t('actionExternal')
    case 'read-only':
    case 'degraded': return t('actionReadOnly')
  }
}

function displayExecutable(executable: string | undefined, t: RuntimeInspectorTranslator['t']): string {
  if (executable === undefined || executable.length === 0) return t('unknownProcess')
  const parts = executable.split(/[\\/]/u)
  return parts[parts.length - 1] || executable
}

/** The current Host DTO has no user-facing title field, so use a truthful contextual fallback. */
function sessionTitle(row: HostListenerRow, context: RuntimeInspectorSessionContext, t: RuntimeInspectorTranslator['t']): string {
  if (row.sessionVisibility === 'current-session'
    && row.session?.sessionId === context.sessionId
    && context.title !== undefined) return context.title
  switch (row.sessionVisibility) {
    case 'current-session': return t('currentSession')
    case 'another-dsh-session': return t('anotherSession')
    case 'unknown-session':
    case 'unattributed': return '—'
  }
}

/** Resolve the actual current-Session user request that initiated this call. */
function requestSummary(row: HostListenerRow, context: RuntimeInspectorSessionContext): string {
  return context.requestFor({
    sessionId: row.session?.sessionId,
    callId: row.session?.callId,
    rootCallId: row.session?.rootCallId,
    turn: row.session?.turn,
  }) ?? '—'
}

function projectSummary(row: HostListenerRow, context: RuntimeInspectorSessionContext): string {
  if (row.project !== undefined && row.project.length > 0) return row.project
  if (row.sessionVisibility === 'current-session' && row.session?.sessionId === context.sessionId) {
    return context.cwd ?? '—'
  }
  return '—'
}

function callId(row: HostListenerRow): string {
  return row.session?.callId ?? '—'
}

type AttributionField =
  | 'sessionId'
  | 'agentId'
  | 'turn'
  | 'step'
  | 'callId'
  | 'rootCallId'
  | 'tool'
  | 'command'
  | 'workdir'
  | 'kind'

function attributionValue(row: HostListenerRow, field: AttributionField): string {
  const value = row.session?.[field]
  return value === undefined || value === '' ? '—' : String(value)
}

function turnAndStep(row: HostListenerRow): string {
  if (row.session === undefined) return '—'
  return `${String(row.session.turn)} / ${String(row.session.step)}`
}

function isActionable(row: HostListenerRow): boolean {
  return row.action.available
    && (row.action.kind === 'managed-shutdown' || row.action.kind === 'external-single-pid')
}

function isCurrentProjectListener(row: HostListenerRow): boolean {
  // The selected project scope includes both DSH-owned listeners and
  // read-only Compose associations published by that project.
  return row.development.group === 'current-project'
}

function sourceState(row: HostListenerRow, snapshot: HostInventorySnapshot): SourceState {
  if (snapshot.mode === 'read-only-degraded') return 'degraded'
  return row.confidence
}

function sourceLabel(source: SourceState, t: RuntimeInspectorTranslator['t']): string {
  switch (source) {
    case 'verified': return t('sourceVerified')
    case 'inferred':
    case 'unattributed':
      return t('sourceUnconfirmed')
    case 'degraded': return t('sourceDegraded')
  }
}

function sourceDescription(row: HostListenerRow, snapshot: HostInventorySnapshot, t: RuntimeInspectorTranslator['t']): string {
  switch (sourceState(row, snapshot)) {
    case 'verified':
      return row.sessionVisibility === 'current-session'
        ? t('sourceVerifiedCurrent')
        : t('sourceVerifiedAnother')
    case 'inferred':
      return t('sourceInferredDescription')
    case 'unattributed':
      return t('sourceUnattributedDescription')
    case 'degraded':
      return t('sourceDegradedDescription')
  }
}

function handlingDescription(row: HostListenerRow, snapshot: HostInventorySnapshot, t: RuntimeInspectorTranslator['t']): string {
  if (!snapshot.scanComplete) {
    return t('handlingScanIncomplete')
  }
  if (snapshot.mode === 'read-only-degraded' && row.action.kind !== 'external-single-pid') {
    return t('handlingDegraded')
  }
  if (row.compose !== undefined) return t('handlingComposeReadOnly')
  switch (row.action.kind) {
    case 'managed-shutdown':
      return t('handlingManaged')
    case 'external-single-pid':
      return t('handlingExternal')
    case 'read-only':
      return row.action.reason === 'identity-incomplete'
        ? t('handlingIdentityIncomplete')
        : t('handlingReadOnly')
    case 'degraded':
      return t('handlingDegraded')
  }
}

function ComposePill({ t }: { readonly t: RuntimeInspectorTranslator['t'] }): React.ReactNode {
  return React.createElement('span', {
    className: 'dsh-ri-compose-pill',
    title: t('composeAssociation'),
    'data-runtime-inspector-compose': 'associated',
  },
  React.createElement(ComposeContextLogo, { size: 'compact' }),
  React.createElement('span', { className: 'dsh-ri-pill-label' }, t('composeAssociation')),
  )
}

function sourceIcon(source: SourceState): React.ReactNode {
  switch (source) {
    case 'verified': return IconCheck({ size: 12 })
    case 'inferred': return IconLinkSignal({ size: 13 })
    case 'unattributed': return IconQuestion({ size: 13 })
    case 'degraded': return IconInfo({ size: 13 })
  }
}

function SourcePill({ row, snapshot, t }: { readonly row: HostListenerRow; readonly snapshot: HostInventorySnapshot; readonly t: RuntimeInspectorTranslator['t'] }): React.ReactNode {
  const source = sourceState(row, snapshot)
  const label = sourceLabel(source, t)
  return React.createElement('span', {
    className: `dsh-ri-source-pill is-${source}`,
    'data-runtime-inspector-confidence': row.confidence,
    title: source === 'inferred' ? t('sourceInferredTitle') : sourceDescription(row, snapshot, t),
  },
  React.createElement('span', { className: 'dsh-ri-source-signal' }, sourceIcon(source)),
  React.createElement('span', { className: 'dsh-ri-pill-label' }, label),
  )
}

function ActionPill({ row, compact = false, t }: { readonly row: HostListenerRow; readonly compact?: boolean; readonly t: RuntimeInspectorTranslator['t'] }): React.ReactNode {
  const disabled = !isActionable(row)
  const tone = disabled ? 'is-disabled' : row.action.kind === 'managed-shutdown' ? 'is-managed' : 'is-external'
  const label = actionPillLabel(row.action.kind, compact, t)
  return React.createElement('span', { className: `dsh-ri-action-pill ${tone}`, title: label },
    React.createElement('span', { className: 'dsh-ri-pill-label' }, label),
  )
}

function sortRows(rows: readonly HostListenerRow[], key: SortKey, direction: SortDirection): HostListenerRow[] {
  const factor = direction === 'asc' ? 1 : -1
  return [...rows].sort((left, right) => {
    const value = (row: HostListenerRow): string | number => {
      switch (key) {
        case 'port': return row.port
        case 'pid': return row.pid
        case 'application': return row.executable ?? row.session?.tool ?? ''
        case 'project': return row.project ?? ''
        case 'session': return row.sessionVisibility
      }
    }
    const leftValue = value(left)
    const rightValue = value(right)
    if (leftValue < rightValue) return -factor
    if (leftValue > rightValue) return factor
    return 0
  })
}

function rowSearchText(row: HostListenerRow): string {
  return [
    row.port,
    row.pid,
    row.address,
    row.executable,
    row.project,
    row.compose?.relativeComposeFile,
    row.compose?.service,
    row.compose?.image,
    row.sessionVisibility,
    row.confidence,
    row.session?.sessionId,
    row.session?.agentId,
    row.session?.tool,
    row.session?.command,
    row.session?.callId,
    row.session?.rootCallId,
    row.session?.workdir,
    row.session?.kind,
    row.session?.turn,
    row.session?.step,
  ].filter(value => value !== undefined).join(' ').toLowerCase()
}

function filteredRows(
  rows: readonly HostListenerRow[],
  search: string,
  sourceFilter: SourceFilterKey,
  actionableOnly: boolean,
): HostListenerRow[] {
  const query = search.trim().toLowerCase()
  return rows.filter(row => {
    if (query.length > 0 && !rowSearchText(row).includes(query)) return false
    if (actionableOnly && !isActionable(row)) return false
    switch (sourceFilter) {
      case 'dsh': return row.confidence === 'verified'
      case 'unconfirmed': return row.confidence !== 'verified'
      case 'all': return true
    }
  })
}

function collapseDuplicateRows(rows: readonly HostListenerRow[]): {
  readonly rows: readonly HostListenerRow[]
  readonly occurrenceCounts: ReadonlyMap<string, number>
} {
  const uniqueRows: HostListenerRow[] = []
  const occurrenceCounts = new Map<string, number>()
  for (const row of rows) {
    const count = occurrenceCounts.get(row.listenerId) ?? 0
    occurrenceCounts.set(row.listenerId, count + 1)
    if (count === 0) uniqueRows.push(row)
  }
  return { rows: uniqueRows, occurrenceCounts }
}

function ListenerRow({
  row,
  snapshot,
  occurrenceCount,
  selected,
  pinned,
  t,
  onSelect,
  onTogglePin,
}: {
  readonly row: HostListenerRow
  readonly snapshot: HostInventorySnapshot
  readonly occurrenceCount: number
  readonly selected: boolean
  readonly pinned: boolean
  readonly t: RuntimeInspectorTranslator['t']
  readonly onSelect: (listenerId: string) => void
  readonly onTogglePin: (row: HostListenerRow) => void
}): React.ReactNode {
  const toolchain = row.development.toolchain
  const name = toolchainName(toolchain)
  const executable = displayExecutable(row.executable ?? row.session?.tool, t)
  return React.createElement('li', {
    className: 'dsh-ri-row',
    'data-runtime-inspector-row': row.listenerId,
    'data-runtime-inspector-selected': selected ? 'true' : 'false',
  },
  React.createElement('button', {
    type: 'button',
    className: `dsh-ri-row-button${selected ? ' is-selected' : ''}${row.development.group === 'other' ? ' has-pin' : ''}`,
    'aria-label': t('selectPortPid', { port: row.port, pid: row.pid }),
    title: t('selectPortPid', { port: row.port, pid: row.pid }),
    'aria-pressed': selected,
    'data-runtime-inspector-select': row.listenerId,
    onClick: () => { onSelect(row.listenerId) },
  },
    React.createElement('div', { className: 'dsh-ri-row-top' },
    React.createElement('span', { className: 'dsh-ri-port' },
      t('port', { port: row.port }),
      React.createElement('span', { className: 'dsh-ri-protocol' }, row.protocol),
    ),
    React.createElement(SourcePill, { row, snapshot, t }),
    row.compose === undefined ? null : React.createElement(ComposePill, { t }),
  ),
  React.createElement('div', { className: 'dsh-ri-toolchain-line' },
    React.createElement(ToolchainLogo, { toolchain, size: 'compact' }),
    React.createElement('div', { className: 'dsh-ri-toolchain-copy' },
      name === undefined ? null : React.createElement('span', { className: 'dsh-ri-toolchain-name' }, name),
      React.createElement('span', {
        className: 'dsh-ri-executable',
        title: row.executable ?? row.session?.tool ?? t('unknownProcess'),
      }, executable),
    ),
  ),
  React.createElement('div', { className: 'dsh-ri-row-meta' },
    React.createElement('span', { className: 'dsh-ri-technical-value' }, t('pidValue', { pid: row.pid })),
    React.createElement('span', { className: 'dsh-ri-row-address dsh-ri-technical-value', title: `${row.address}:${String(row.port)}` }, `${row.address}:${String(row.port)}`),
    occurrenceCount > 1 ? React.createElement('span', { className: 'dsh-ri-technical-value', title: t('sameListenerRecordsTitle', { count: occurrenceCount }) }, `×${String(occurrenceCount)}`) : null,
    React.createElement(ActionPill, { row, compact: true, t }),
  ),
  ),
  row.development.group !== 'other' ? null : React.createElement('button', {
    type: 'button',
    className: `dsh-ri-pin-button${pinned ? ' is-pinned' : ''}`,
    'aria-label': pinned ? t('unpinPort', { port: row.port }) : t('pinPort', { port: row.port }),
    'aria-pressed': pinned,
    'data-runtime-inspector-pin': row.development.stableKey,
    title: pinned ? t('unpinDisplay') : t('pinDisplay'),
    onClick: () => { onTogglePin(row) },
  }, IconPin({ size: 14 })),
  )
}

function Fact({
  label,
  value,
  wide = false,
  multiline = false,
  technical = false,
}: {
  readonly label: string
  readonly value: string
  readonly wide?: boolean
  readonly multiline?: boolean
  readonly technical?: boolean
}): React.ReactNode {
  return React.createElement('div', { className: `dsh-ri-fact${wide ? ' is-wide' : ''}${technical ? ' is-technical' : ''}` },
    React.createElement('dt', null, label),
    React.createElement('dd', { className: multiline ? 'is-multiline' : undefined, title: value }, value),
  )
}

function launchChainRoleLabel(role: NonNullable<HostListenerRow['launchChain']>[number]['role'], t: RuntimeInspectorTranslator['t']): string {
  switch (role) {
    case 'root': return t('launchChainRoot')
    case 'intermediate': return t('launchChainIntermediate')
    case 'listener': return t('launchChainListener')
  }
  return t('launchChainIntermediate')
}

function LaunchChainDetails({ row, t }: { readonly row: HostListenerRow; readonly t: RuntimeInspectorTranslator['t'] }): React.ReactNode {
  if (row.confidence !== 'verified' || row.launchChain === undefined || row.launchChain.length === 0) return null
  return React.createElement('section', {
    className: 'dsh-ri-detail-section',
    'data-runtime-inspector-launch-chain': 'verified',
  },
  React.createElement('h3', { className: 'dsh-ri-section-title' }, t('launchChain')),
  React.createElement('ol', { className: 'dsh-ri-launch-chain' },
    row.launchChain.map(node => React.createElement('li', {
      className: 'dsh-ri-launch-chain-node',
      key: `${node.role}:${String(node.pid)}`,
      'data-runtime-inspector-launch-chain-role': node.role,
    },
    React.createElement('div', { className: 'dsh-ri-launch-chain-meta' },
      React.createElement('span', { className: 'dsh-ri-launch-chain-role' }, launchChainRoleLabel(node.role, t)),
      React.createElement('span', { className: 'dsh-ri-technical-value' }, `PID ${String(node.pid)}`),
    ),
    React.createElement('div', { className: 'dsh-ri-launch-chain-executable dsh-ri-technical-value', title: node.executable ?? t('unknownProcess') },
      displayExecutable(node.executable, t),
    ),
    React.createElement('div', { className: `dsh-ri-launch-chain-command${node.command === undefined ? ' is-unavailable' : ''}`, title: node.command ?? t('launchChainCommandUnavailable') },
      node.command ?? t('launchChainCommandUnavailable'),
    ),
    )),
  ),
  )
}

function DetailPanel({
  row,
  snapshot,
  occurrenceCount,
  pending,
  operationNotice,
  onCopy,
  onOpenDirectory,
  onRequest,
  sessionContext,
  locale,
  t,
}: {
  readonly row: HostListenerRow | undefined
  readonly snapshot: HostInventorySnapshot
  readonly occurrenceCount: number
  readonly pending: HostActionRequest | undefined
  readonly operationNotice?: PanelNotice
  readonly onCopy: (row: HostListenerRow) => void
  readonly onOpenDirectory: (row: HostListenerRow) => void
  readonly onRequest: (request: HostActionRequest) => void
  readonly sessionContext: RuntimeInspectorSessionContext
  readonly locale: RuntimeInspectorTranslator['locale']
  readonly t: RuntimeInspectorTranslator['t']
}): React.ReactNode {
  if (row === undefined) {
    return React.createElement('div', { className: 'dsh-ri-empty' },
      React.createElement('div', null,
        React.createElement('span', { className: 'dsh-ri-state-icon' }, IconPulse({ size: 23 })),
        React.createElement('div', { className: 'dsh-ri-empty-title' }, snapshot.listeners.length === 0 ? t('noListeners') : t('selectListener')),
        React.createElement('p', { className: 'dsh-ri-empty-copy' }, snapshot.listeners.length === 0
          ? t('emptyRefreshCopy')
          : t('emptySelectCopy')),
      ),
    )
  }

  const actionDisabled = pending !== undefined
  const source = sourceState(row, snapshot)
  const actionAvailable = isActionable(row)
  const projectAvailable = row.project !== undefined && row.project.length > 0
  const toolchain = row.development.toolchain
  const name = toolchainName(toolchain)
  const inlineNotice = operationNotice?.listenerId === row.listenerId ? operationNotice : undefined
  const headerNotice = inlineNotice?.source === 'copy' || inlineNotice?.source === 'open-directory'
    ? inlineNotice
    : undefined
  const actionNotice = inlineNotice?.source === 'action' ? inlineNotice : undefined
  const detailAction = actionAvailable
    ? React.createElement('button', {
      type: 'button',
      className: row.action.kind === 'external-single-pid' ? 'dsh-ri-danger-action' : 'dsh-ri-primary-action',
      'aria-label': `${actionLabel(row.action.kind, t)}: ${t('port', { port: row.port })}`,
      title: `${actionLabel(row.action.kind, t)}: ${t('port', { port: row.port })}`,
      'data-runtime-inspector-action': row.action.kind,
      disabled: actionDisabled,
      onClick: () => { onRequest({ listenerId: row.listenerId, kind: row.action.kind, ...sessionContext.cwd === undefined ? {} : { currentProject: sessionContext.cwd } }) },
    }, actionLabel(row.action.kind, t))
    : null

  return React.createElement(React.Fragment, null,
    React.createElement('div', { className: 'dsh-ri-detail-head' },
      React.createElement('div', { className: 'dsh-ri-detail-identity' },
        React.createElement(ToolchainLogo, { toolchain, size: 'detail' }),
        React.createElement('div', { className: 'dsh-ri-detail-head-copy' },
          name === undefined ? null : React.createElement('div', { className: 'dsh-ri-detail-toolchain' }, name),
          row.compose === undefined ? null : React.createElement(ComposePill, { t }),
          React.createElement('div', { className: 'dsh-ri-detail-port' },
            t('port', { port: row.port }),
          ),
          React.createElement('div', {
            className: 'dsh-ri-detail-subline',
            title: `${row.executable ?? row.session?.tool ?? t('unknownProcess')} · ${t('pidValue', { pid: row.pid })}`,
          },
            React.createElement('span', null, displayExecutable(row.executable ?? row.session?.tool, t)),
            React.createElement('span', { className: 'dsh-ri-technical-value' }, ` · ${t('pidValue', { pid: row.pid })} · `),
            React.createElement('span', { className: 'dsh-ri-protocol' }, row.protocol),
          ),
        ),
      ),
      React.createElement('div', { className: 'dsh-ri-detail-actions' },
        React.createElement('button', {
          type: 'button',
          className: 'dsh-ri-icon-button',
          'aria-label': t('copyPortDetails', { port: row.port }),
          title: t('copyPortDetails', { port: row.port }),
          'data-runtime-inspector-copy': row.listenerId,
          disabled: actionDisabled,
          onClick: () => { onCopy(row) },
        }, IconCopy({ size: 15 })),
        React.createElement('button', {
          type: 'button',
          className: 'dsh-ri-icon-button',
          'aria-label': t('openPortProjectDirectory', { port: row.port }),
          title: t('openPortProjectDirectory', { port: row.port }),
          'data-runtime-inspector-open-directory': row.listenerId,
          disabled: actionDisabled || !projectAvailable,
          onClick: () => { onOpenDirectory(row) },
        }, IconFolder({ size: 15 })),
      ),
    ),
    headerNotice === undefined ? null : React.createElement(NoticeView, {
      notice: headerNotice,
      t,
      className: 'dsh-ri-detail-notice',
    }),
    React.createElement('section', { className: 'dsh-ri-detail-section' },
      React.createElement('h3', { className: 'dsh-ri-section-title' }, t('sectionRuntimeInfo')),
      React.createElement('dl', { className: 'dsh-ri-fact-grid' },
        React.createElement(Fact, { label: t('application'), value: row.executable ?? row.session?.tool ?? '—', wide: true, multiline: true, technical: true }),
        React.createElement(Fact, { label: t('pid'), value: String(row.pid), technical: true }),
        React.createElement(Fact, { label: t('listenAddress'), value: `${row.address}:${String(row.port)}`, technical: true }),
        occurrenceCount > 1 ? React.createElement(Fact, { label: t('sameListener'), value: t('records', { count: occurrenceCount }), technical: true }) : null,
        React.createElement(Fact, { label: t('createdAt'), value: formatProcessCreatedAt(row.processCreatedAt, locale), wide: occurrenceCount <= 1, multiline: true }),
        React.createElement(Fact, { label: t('projectDirectory'), value: projectSummary(row, sessionContext), wide: true, multiline: true, technical: true }),
        React.createElement(Fact, { label: t('launchCommand'), value: attributionValue(row, 'command'), wide: true, multiline: true, technical: true }),
      ),
    ),
    React.createElement(LaunchChainDetails, { row, t }),
    row.compose === undefined ? null : React.createElement('section', { className: 'dsh-ri-detail-section', 'data-runtime-inspector-compose-details': 'associated' },
      React.createElement('h3', { className: 'dsh-ri-section-title' }, t('composeDetails')),
      React.createElement('dl', { className: 'dsh-ri-fact-grid' },
        React.createElement(Fact, { label: t('composeFile'), value: row.compose.relativeComposeFile, wide: true, multiline: true, technical: true }),
        React.createElement(Fact, { label: t('composeService'), value: row.compose.service, technical: true }),
        React.createElement(Fact, { label: t('composeImage'), value: row.compose.image, wide: true, multiline: true, technical: true }),
        React.createElement(Fact, { label: t('composeContainer'), value: shortContainerId(row.compose.containerId), wide: true, multiline: true, technical: true }),
        React.createElement(Fact, { label: t('composeMapping'), value: `${String(row.compose.hostPort)}:${String(row.compose.containerPort ?? '?')}/${row.compose.protocol}`, technical: true }),
      ),
    ),
    React.createElement('section', { className: 'dsh-ri-detail-section' },
      React.createElement('h3', { className: 'dsh-ri-section-title' }, t('sectionSessionContext')),
      React.createElement('dl', { className: 'dsh-ri-fact-grid' },
        React.createElement(Fact, { label: t('session'), value: sessionTitle(row, sessionContext, t) }),
        React.createElement(Fact, { label: t('sessionId'), value: attributionValue(row, 'sessionId'), multiline: true, technical: true }),
        React.createElement(Fact, { label: t('callId'), value: callId(row), multiline: true, technical: true }),
        React.createElement(Fact, { label: t('userRequest'), value: requestSummary(row, sessionContext), wide: true, multiline: true }),
      ),
    ),
    React.createElement('section', { className: 'dsh-ri-detail-section' },
      React.createElement('h3', { className: 'dsh-ri-section-title' }, t('sectionToolCall')),
      React.createElement('dl', { className: 'dsh-ri-fact-grid' },
        React.createElement(Fact, { label: t('agentId'), value: attributionValue(row, 'agentId'), multiline: true, technical: true }),
        React.createElement(Fact, { label: t('turnStep'), value: turnAndStep(row), multiline: true, technical: true }),
        React.createElement(Fact, { label: t('tool'), value: attributionValue(row, 'tool'), multiline: true, technical: true }),
        React.createElement(Fact, { label: t('rootCallId'), value: attributionValue(row, 'rootCallId'), multiline: true, technical: true }),
      ),
    ),
    React.createElement('section', { className: 'dsh-ri-detail-section' },
      React.createElement('h3', { className: 'dsh-ri-section-title' }, t('sectionSource')),
      React.createElement('div', { className: `dsh-ri-source-card${source === 'degraded' ? ' is-degraded' : ''}` },
        React.createElement(SourcePill, { row, snapshot, t }),
        React.createElement('p', { className: 'dsh-ri-source-copy' }, sourceDescription(row, snapshot, t)),
        React.createElement('dl', { className: 'dsh-ri-fact-grid dsh-ri-source-facts' },
          React.createElement(Fact, { label: t('workdir'), value: attributionValue(row, 'workdir'), wide: true, multiline: true, technical: true }),
          React.createElement(Fact, { label: t('spawnType'), value: attributionValue(row, 'kind'), multiline: true, technical: true }),
        ),
        row.lifecycleOwner === undefined ? null : React.createElement('div', { className: 'dsh-ri-owner-line' },
          React.createElement('span', { className: 'dsh-ri-owner-label' }, t('lifecycle')),
          React.createElement('span', { className: 'dsh-ri-owner-pill' }, `${row.lifecycleOwner.kind} · ${row.lifecycleOwner.id}`),
        ),
      ),
    ),
    React.createElement('section', { className: 'dsh-ri-detail-section' },
      React.createElement('h3', { className: 'dsh-ri-section-title' }, t('sectionHandling')),
      React.createElement('div', { className: `dsh-ri-handling-card${actionAvailable ? '' : ' is-disabled'}` },
        React.createElement('div', { className: 'dsh-ri-handling-content' },
          React.createElement('div', { className: 'dsh-ri-action-line' }, React.createElement(ActionPill, { row, t })),
          React.createElement('p', { className: 'dsh-ri-handling-copy' }, handlingDescription(row, snapshot, t)),
        ),
        detailAction,
      ),
      actionNotice === undefined ? null : React.createElement(NoticeView, {
        notice: actionNotice,
        t,
        className: 'dsh-ri-detail-notice',
      }),
    ),
  )
}

function identityItem(label: string, value: string, technical = false): React.ReactNode {
  return React.createElement('div', { className: 'dsh-ri-confirm-identity-item' },
    React.createElement('span', { className: 'dsh-ri-confirm-identity-label' }, label),
    React.createElement('span', { className: `dsh-ri-confirm-identity-value${technical ? ' dsh-ri-technical-value' : ''}`, title: value }, value),
  )
}

function ConfirmDialog({
  row,
  request,
  onConfirm,
  onCancel,
  locale,
  t,
}: {
  readonly row: HostListenerRow
  readonly request: HostActionRequest
  readonly onConfirm: () => void
  readonly onCancel: () => void
  readonly locale: RuntimeInspectorTranslator['locale']
  readonly t: RuntimeInspectorTranslator['t']
}): React.ReactNode {
  const external = request.kind === 'external-single-pid'
  const title = external ? t('confirmEndProcess') : t('confirmStopTask')
  const cancelButton = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => { cancelButton.current?.focus() }, [])
  return React.createElement('div', {
    className: 'dsh-ri-confirm-backdrop',
    role: 'presentation',
    onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onCancel()
    },
  },
  React.createElement('section', {
    className: 'dsh-ri-confirm',
    role: 'alertdialog',
    'aria-modal': true,
    'aria-labelledby': 'dsh-runtime-inspector-confirm-title',
    'aria-describedby': 'dsh-runtime-inspector-confirm-copy',
    'data-runtime-inspector-confirmation': 'dialog',
  },
  React.createElement('h2', { className: 'dsh-ri-confirm-title', id: 'dsh-runtime-inspector-confirm-title' }, title),
  React.createElement('p', { className: 'dsh-ri-confirm-copy', id: 'dsh-runtime-inspector-confirm-copy' }, external
    ? t('confirmEndProcessCopy')
    : t('confirmStopTaskCopy')),
  external ? React.createElement('div', { className: 'dsh-ri-confirm-note' },
    IconInfo({ size: 15 }),
    React.createElement('span', null, t('confirmIdentityNote')),
  ) : null,
  React.createElement('div', { className: 'dsh-ri-confirm-identity' },
    identityItem(t('listenPort'), `${row.address}:${String(row.port)}`, true),
    identityItem(t('pid'), String(row.pid), true),
    identityItem(t('createdAt'), formatProcessCreatedAt(row.processCreatedAt, locale), true),
    identityItem(t('application'), row.executable ?? t('unavailable'), true),
    external ? null : identityItem(t('lifecycle'), row.lifecycleOwner === undefined ? t('unavailable') : `${row.lifecycleOwner.kind} · ${row.lifecycleOwner.id}`, true),
  ),
  React.createElement('div', { className: 'dsh-ri-confirm-actions' },
    React.createElement('button', { ref: cancelButton, type: 'button', className: 'dsh-ri-secondary-action', title: t('cancel'), 'data-runtime-inspector-confirm': 'cancel', onClick: onCancel }, t('cancel')),
    React.createElement('button', { type: 'button', className: external ? 'dsh-ri-danger-action' : 'dsh-ri-primary-action', title, 'data-runtime-inspector-confirm': 'confirm', onClick: onConfirm }, title),
  ),
  ),
  )
}

function SidebarEntry({ wide = true, onOpen, rpc, sessions, locale }: SidebarEntryProps): React.ReactNode {
  const translator = useRuntimeInspectorTranslator(locale)
  const { t } = translator
  const sessionContext = useRuntimeInspectorSessionContext(sessions)
  const badgeContextKey = entryBadgeContextKey(sessionContext.sessionId, sessionContext.cwd)
  const sharedBadge = React.useSyncExternalStore(subscribeEntryBadge, readEntryBadgeSnapshot, readEntryBadgeSnapshot)
  const count = sharedBadge.contextKey === badgeContextKey ? sharedBadge.count : undefined
  const badgeRefreshInFlight = React.useRef(false)
  const refreshBadge = React.useCallback((): void => {
    if (badgeRefreshInFlight.current) return
    badgeRefreshInFlight.current = true
    void rpc.inventory({
      ...sessionContext.sessionId === undefined ? {} : { currentSessionId: sessionContext.sessionId },
      ...sessionContext.cwd === undefined ? {} : { currentProject: sessionContext.cwd },
    }).then(
      snapshot => { publishEntryBadgeSnapshot(snapshot, badgeContextKey) },
      () => { publishEntryBadgeFailure(badgeContextKey) },
    ).finally(() => { badgeRefreshInFlight.current = false })
  }, [badgeContextKey, rpc, sessionContext.cwd, sessionContext.sessionId])

  React.useEffect(() => {
    const refreshWhenVisible = (): void => {
      if (document.visibilityState === 'visible') refreshBadge()
    }
    refreshBadge()
    const interval = window.setInterval(refreshWhenVisible, ENTRY_BADGE_REFRESH_MS)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    window.addEventListener('focus', refreshWhenVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      window.removeEventListener('focus', refreshWhenVisible)
    }
  }, [refreshBadge])

  const countLabel = count === undefined ? '—' : count > 99 ? '99+' : String(count)
  const indicator = countLabel
  const accessibleLabel = count === undefined
    ? t('entryAriaUnavailable')
    : t('entryAriaCount', { count })
  return React.createElement('button', {
    type: 'button',
    className: `dsh-ri-entry${wide ? '' : ' is-compact'}`,
    lang: translator.locale,
    title: wide ? 'Runtime Inspector' : t('entryCompactTitle', { indicator }),
    'aria-label': t('openPanelAria', { details: accessibleLabel }),
    'data-runtime-inspector-entry': 'open',
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => { onOpen(event.currentTarget) },
  },
  React.createElement('span', { className: 'dsh-ri-entry-icon' }, IconPulse({ size: 16 })),
  wide ? React.createElement(React.Fragment, null,
    React.createElement('span', { className: 'dsh-ri-entry-label' }, t('entryLabel')),
    React.createElement('span', { className: 'dsh-ri-entry-badge' }, indicator),
  ) : null,
  )
}

function RuntimeInspectorPanel({ rpc, sessions, locale }: PanelProps): React.ReactNode {
  const translator = useRuntimeInspectorTranslator(locale)
  const { t } = translator
  const sessionContext = useRuntimeInspectorSessionContext(sessions)
  const badgeContextKey = entryBadgeContextKey(sessionContext.sessionId, sessionContext.cwd)
  const sharedInventory = readEntryBadgeSnapshot()
  const cachedSnapshot = sharedInventory.contextKey === badgeContextKey
    ? sharedInventory.inventory
    : undefined
  const open = usePanelOpen()
  const [state, setState] = React.useState<PanelState>({})
  const snapshot = state.snapshotContextKey === badgeContextKey
    ? state.snapshot ?? cachedSnapshot
    : cachedSnapshot
  const [search, setSearch] = React.useState('')
  const [sourceFilter, setSourceFilter] = React.useState<SourceFilterKey>('all')
  const [actionableOnly, setActionableOnly] = React.useState(false)
  const [scope, setScope] = React.useState<ScopeKey>('development')
  const [otherOpen, setOtherOpen] = React.useState(false)
  const [pinnedKeys, setPinnedKeys] = React.useState<ReadonlySet<string>>(() => loadPinnedListenerKeys())
  const [sortKey, setSortKey] = React.useState<SortKey>('port')
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('asc')
  const [selectedListenerId, setSelectedListenerId] = React.useState<string>()
  const [pending, setPending] = React.useState<HostActionRequest>()
  const panelRef = React.useRef<HTMLElement>(null)
  const closeButtonRef = React.useRef<HTMLButtonElement>(null)
  const pendingRef = React.useRef<HostActionRequest>()
  pendingRef.current = pending
  const closePanel = React.useCallback((): void => {
    setPending(undefined)
    setState(previous => ({
      ...previous,
      inventoryNotice: undefined,
      operationNotice: undefined,
    }))
    setPanelOpen(false)
  }, [])

  React.useEffect(() => {
    if (!open) return undefined
    const returnFocus = panelState.returnFocus
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (pendingRef.current !== undefined) setPending(undefined)
        else closePanel()
        return
      }
      if (event.key !== 'Tab') return
      const dialog = panelRef.current
      if (dialog === null) return
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    closeButtonRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (returnFocus?.isConnected === true) returnFocus.focus()
      if (panelState.returnFocus === returnFocus) panelState.returnFocus = undefined
    }
  }, [closePanel, open])

  const refresh = React.useCallback((): void => {
    setState(previous => ({
      ...(previous.snapshotContextKey === badgeContextKey ? previous : {}),
      inventoryNotice: undefined,
      operationNotice: undefined,
      loading: true,
    }))
    void rpc.inventory({
      ...sessionContext.sessionId === undefined ? {} : { currentSessionId: sessionContext.sessionId },
      ...sessionContext.cwd === undefined ? {} : { currentProject: sessionContext.cwd },
    }).then(
      snapshot => {
        publishEntryBadgeSnapshot(snapshot, badgeContextKey)
        setState({ snapshot, snapshotContextKey: badgeContextKey, loading: false })
      },
      error => {
        const latestShared = readEntryBadgeSnapshot()
        const hasCachedSnapshot = latestShared.contextKey === badgeContextKey
          && latestShared.inventory !== undefined
        setState(previous => ({
          ...previous,
          loading: false,
          inventoryNotice: inventoryFailureNotice(
            previous.snapshotContextKey === badgeContextKey && previous.snapshot !== undefined
              || hasCachedSnapshot,
            error,
            t,
          ),
          operationNotice: undefined,
        }))
      },
    )
  }, [badgeContextKey, rpc, sessionContext.cwd, sessionContext.sessionId, t])

  React.useEffect(() => {
    if (open) refresh()
  }, [open, refresh])

  React.useEffect(() => {
    const rows = snapshot?.listeners ?? []
    setSelectedListenerId(previous => previous !== undefined && rows.some(row => row.listenerId === previous)
      ? previous
      : rows.find(row => row.development.group === 'current-project')?.listenerId ?? rows[0]?.listenerId)
    if (pending !== undefined && !rows.some(row => row.listenerId === pending.listenerId)) setPending(undefined)
  }, [snapshot, pending])

  React.useEffect(() => {
    const notice = state.operationNotice
    const delay = noticeAutoDismissMs(notice)
    if (notice === undefined || delay === undefined) return undefined
    const timer = window.setTimeout(() => {
      setState(previous => previous.operationNotice === notice
        ? { ...previous, operationNotice: undefined }
        : previous)
    }, delay)
    return () => { window.clearTimeout(timer) }
  }, [state.operationNotice])

  if (!open) return null

  const allRows = snapshot?.listeners ?? []
  const collapsedRows = collapseDuplicateRows(snapshot === undefined
    ? []
    : sortRows(filteredRows(allRows, search, sourceFilter, actionableOnly), sortKey, sortDirection))
  const rows = collapsedRows.rows
  const searching = search.trim().length > 0
  const currentProjectRows = rows.filter(row => row.development.group === 'current-project')
  const developmentEnvironmentRows = rows.filter(row => row.development.group === 'development-environment')
  const pinnedRows = rows.filter(row => row.development.group === 'other' && pinnedKeys.has(row.development.stableKey))
  const otherRows = rows.filter(row => row.development.group === 'other' && !pinnedKeys.has(row.development.stableKey))
  const showOtherRows = scope === 'all' || otherOpen || searching
  const visibleRows = [
    ...currentProjectRows,
    ...developmentEnvironmentRows,
    ...pinnedRows,
    ...(showOtherRows ? otherRows : []),
  ]
  const selectedRow = visibleRows.find(row => row.listenerId === selectedListenerId) ?? visibleRows[0]
  const noticePlacement = operationNoticePlacement(state.operationNotice, selectedRow?.listenerId)
  const selectedOperationNotice = noticePlacement === 'inline'
    ? state.operationNotice
    : undefined
  const detachedOperationNotice = noticePlacement === 'detached'
    ? state.operationNotice
    : undefined

  const togglePin = (row: HostListenerRow): void => {
    setPinnedKeys(previous => {
      const next = togglePinnedListenerKey(previous, row.development.stableKey)
      savePinnedListenerKeys(undefined, next)
      return next
    })
  }

  const listenerRows = (groupRows: readonly HostListenerRow[]): React.ReactNode => React.createElement('ul', {
    className: 'dsh-ri-list',
    'data-runtime-inspector-list': 'listeners',
  }, groupRows.map(row => React.createElement(ListenerRow, {
    key: row.listenerId,
    row,
    snapshot: snapshot as HostInventorySnapshot,
    occurrenceCount: collapsedRows.occurrenceCounts.get(row.listenerId) ?? 1,
    selected: selectedRow?.listenerId === row.listenerId,
    pinned: pinnedKeys.has(row.development.stableKey),
    t,
    onSelect: setSelectedListenerId,
    onTogglePin: togglePin,
  })))

  const copyDetails = (row: HostListenerRow): void => {
    setState(previous => ({ ...previous, operationNotice: undefined }))
    void rpc.copyDetails({
      listenerId: row.listenerId,
      ...sessionContext.sessionId === undefined ? {} : { currentSessionId: sessionContext.sessionId },
    }).then(result => {
      setState(previous => ({
        ...previous,
        operationNotice: copyResultNotice(result, row.listenerId, row.port, t),
      }))
    }, error => {
      setState(previous => ({
        ...previous,
        operationNotice: copyRequestFailureNotice(row.listenerId, row.port, error, t),
      }))
    })
  }

  const openDirectory = (row: HostListenerRow): void => {
    setState(previous => ({ ...previous, operationNotice: undefined }))
    void rpc.openProjectDirectory({
      listenerId: row.listenerId,
      ...sessionContext.sessionId === undefined ? {} : { currentSessionId: sessionContext.sessionId },
    }).then(result => {
      setState(previous => ({
        ...previous,
        operationNotice: openDirectoryResultNotice(result, row.listenerId, row.port, t),
      }))
    }, error => {
      setState(previous => ({
        ...previous,
        operationNotice: openDirectoryRequestFailureNotice(row.listenerId, row.port, error, t),
      }))
    })
  }

  const confirmAction = (): void => {
    if (pending === undefined) return
    const request = {
      ...pending,
      confirmed: true,
      ...sessionContext.sessionId === undefined ? {} : { currentSessionId: sessionContext.sessionId },
    }
    const targetRow = allRows.find(row => row.listenerId === pending.listenerId)
    const label = actionLabel(pending.kind, t)
    setPending(undefined)
    setState(previous => ({ ...previous, loading: true, operationNotice: undefined }))
    void rpc.performAction(request).then(
      result => {
        publishEntryBadgeSnapshot(result.freshScan, badgeContextKey)
        setState({
          snapshot: result.freshScan,
          snapshotContextKey: badgeContextKey,
          operationNotice: actionResultNotice(result, actionLabel(result.action, t), t),
          loading: false,
        })
      },
      error => {
        setState(previous => ({
          ...previous,
          loading: false,
          operationNotice: actionRequestFailureNotice(
            pending.listenerId,
            targetRow?.port,
            label,
            error,
            t,
          ),
        }))
      },
    )
  }

  const pendingRow = pending === undefined ? undefined : allRows.find(row => row.listenerId === pending.listenerId)

  return React.createElement('div', {
    className: 'dsh-ri-overlay',
    role: 'presentation',
    'data-runtime-inspector-panel': 'overlay',
  },
  React.createElement('div', {
    className: 'dsh-ri-mask',
    'aria-hidden': true,
    onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) closePanel()
    },
  }),
  React.createElement('section', {
    ref: panelRef,
    className: 'dsh-ri-panel',
    lang: translator.locale,
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': 'dsh-runtime-inspector-title',
    'data-runtime-inspector-surface': 'panel',
  },
  React.createElement('div', { className: 'dsh-ri-content' },
  React.createElement('header', { className: 'dsh-ri-header' },
    React.createElement('div', {
      className: 'dsh-ri-header-status',
      'data-runtime-inspector-state': snapshot === undefined
        ? 'loading'
        : snapshot.scanComplete ? 'ready' : 'incomplete',
    },
      React.createElement('div', { className: 'dsh-ri-brand' },
        React.createElement('img', {
          className: 'dsh-ri-brand-logo',
          src: runtimeInspectorLogo,
          alt: '',
          'aria-hidden': true,
          draggable: false,
        }),
        React.createElement('h1', { className: 'dsh-ri-header-title', id: 'dsh-runtime-inspector-title' }, 'Runtime Inspector'),
      ),
      snapshot?.mode === 'read-only-degraded'
        ? React.createElement('span', { className: 'dsh-ri-status-pill is-limited' },
          React.createElement('span', { className: 'dsh-ri-status-dot' }),
          t('statusSourceLimited'),
        )
        : null,
      snapshot !== undefined && !snapshot.scanComplete
        ? React.createElement('span', { className: 'dsh-ri-status-pill is-limited' },
          React.createElement('span', { className: 'dsh-ri-status-dot' }),
          t('statusScanIncomplete'),
        )
        : null,
    ),
    React.createElement('div', { className: 'dsh-ri-header-actions' },
      React.createElement('button', {
        ref: closeButtonRef,
        type: 'button',
        className: 'dsh-ri-close',
        'aria-label': t('closePanel'),
        title: t('closePanel'),
        'data-runtime-inspector-close': 'close',
        onClick: closePanel,
      }, IconClose({ size: 14 })),
    ),
  ),
  React.createElement('div', { className: 'dsh-ri-options' },
  snapshot === undefined && state.inventoryNotice === undefined
    ? React.createElement('div', { className: 'dsh-ri-state', 'data-runtime-inspector-state': 'loading' },
      React.createElement('div', null,
        React.createElement('span', { className: 'dsh-ri-state-icon' }, IconRefresh({ size: 23 })),
        React.createElement('div', { className: 'dsh-ri-empty-title' }, t('loadingListeners')),
      ),
    )
    : null,
  snapshot === undefined && state.inventoryNotice !== undefined
    ? React.createElement('div', { className: 'dsh-ri-state dsh-ri-inventory-failure', 'data-runtime-inspector-state': 'failure' },
      React.createElement(NoticeView, { notice: state.inventoryNotice, t }),
      React.createElement('button', {
        type: 'button',
        className: 'dsh-ri-primary-action',
        'data-runtime-inspector-retry': 'inventory',
        disabled: state.loading === true,
        onClick: refresh,
      }, IconRefresh({ size: 14 }), t('retry')),
    )
    : null,
  snapshot === undefined ? null : React.createElement(React.Fragment, null,
    React.createElement('div', { className: 'dsh-ri-toolbar', 'data-runtime-inspector-toolbar': 'controls' },
      React.createElement('label', { className: 'dsh-ri-search' },
        React.createElement('span', { className: 'dsh-ri-search-icon' }, IconSearch({ size: 15 })),
        React.createElement('input', {
          type: 'search',
          value: search,
          placeholder: t('searchPlaceholder'),
          'aria-label': t('searchLabel'),
          title: t('searchLabel'),
          'data-runtime-inspector-search': 'input',
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => { setSearch(event.target.value) },
        }),
      ),
      React.createElement('select', {
        className: 'dsh-ri-select',
        value: sortKey,
        'aria-label': t('sortLabel'),
        title: t('sortLabel'),
        'data-runtime-inspector-sort': 'select',
        onChange: (event: React.ChangeEvent<HTMLSelectElement>) => { setSortKey(event.target.value as SortKey) },
      },
      React.createElement('option', { value: 'port' }, t('sortPort')),
      React.createElement('option', { value: 'application' }, t('sortApplication')),
      React.createElement('option', { value: 'pid' }, t('sortPid')),
      React.createElement('option', { value: 'project' }, t('sortProject')),
      React.createElement('option', { value: 'session' }, t('sortSession')),
      ),
      React.createElement('button', {
        type: 'button',
        className: 'dsh-ri-toolbar-button',
        'aria-label': t('sortDirection'),
        title: t('sortDirection'),
        'data-runtime-inspector-sort-direction': 'toggle',
        onClick: () => { setSortDirection(previous => previous === 'asc' ? 'desc' : 'asc') },
      }, sortDirection === 'asc' ? t('ascending') : t('descending'), React.createElement('span', null, IconChevron({ size: 13 }))),
      React.createElement('button', {
        type: 'button',
        className: 'dsh-ri-toolbar-button',
        'aria-label': t('refresh'),
        title: t('refresh'),
        'data-runtime-inspector-refresh': 'refresh',
        disabled: state.loading === true,
        onClick: refresh,
      }, IconRefresh({ size: 14 }), t('refresh')),
      React.createElement('div', { className: 'dsh-ri-toolbar-control dsh-ri-scope-control' },
        React.createElement('span', { className: 'dsh-ri-control-label' }, t('view')),
        React.createElement('div', { className: 'dsh-ri-scope-row', role: 'tablist', 'aria-label': t('viewRange') },
          ([
            ['development', t('scopeDevelopment')],
            ['all', t('scopeAll')],
          ] as const).map(([key, label]) => React.createElement('button', {
            key,
            type: 'button',
            className: `dsh-ri-scope-option${scope === key ? ' is-active' : ''}`,
            role: 'tab',
            'aria-selected': scope === key,
            title: label,
            'data-runtime-inspector-scope': key,
            onClick: () => { setScope(key); setOtherOpen(key === 'all') },
          }, label)),
        ),
      ),
      React.createElement('label', { className: 'dsh-ri-toolbar-control dsh-ri-source-control' },
        React.createElement('span', { className: 'dsh-ri-control-label' }, t('sourceFilter')),
        React.createElement('select', {
          className: 'dsh-ri-select dsh-ri-source-select',
          value: sourceFilter,
          'aria-label': t('sourceFilter'),
          title: t('sourceFilter'),
          'data-runtime-inspector-source-filter': 'select',
          onChange: (event: React.ChangeEvent<HTMLSelectElement>) => { setSourceFilter(event.target.value as SourceFilterKey) },
        },
        React.createElement('option', { value: 'all' }, t('sourceAll')),
        React.createElement('option', { value: 'dsh' }, t('sourceDsh')),
        React.createElement('option', { value: 'unconfirmed' }, t('sourceUnconfirmed')),
        ),
      ),
      React.createElement('label', { className: 'dsh-ri-action-toggle' },
        React.createElement('input', {
          type: 'checkbox',
          checked: actionableOnly,
          'aria-label': t('actionableOnly'),
          'data-runtime-inspector-actionable-only': 'toggle',
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => { setActionableOnly(event.target.checked) },
        }),
        React.createElement('span', null, t('actionableOnly')),
      ),
    ),
    state.loading === true ? React.createElement('div', { className: 'dsh-ri-banner', role: 'status' }, IconRefresh({ size: 14 }), t('updatingPortStatus')) : null,
    state.inventoryNotice === undefined ? null : React.createElement(NoticeView, { notice: state.inventoryNotice, t }),
    snapshot.truncated ? React.createElement('div', { className: 'dsh-ri-banner', role: 'status' }, IconInfo({ size: 14 }), t('truncatedBanner')) : null,
    React.createElement('div', { className: 'dsh-ri-body' },
      React.createElement('section', { className: 'dsh-ri-list-column', 'aria-label': t('listenerList') },
        React.createElement('div', { className: 'dsh-ri-column-heading' },
          React.createElement('span', null, t('listenPort')),
          React.createElement('span', { className: 'dsh-ri-column-heading-count' }, t('displayCount', { count: visibleRows.length })),
        ),
        rows.length === 0
          ? React.createElement('div', { className: 'dsh-ri-state', 'data-runtime-inspector-state': 'empty' },
            React.createElement('div', null,
              React.createElement('span', { className: 'dsh-ri-state-icon' }, IconSearch({ size: 23 })),
              React.createElement('div', { className: 'dsh-ri-empty-title' }, allRows.length === 0 ? t('noDiscoveredListeners') : t('noMatch')),
              React.createElement('p', { className: 'dsh-ri-empty-copy' }, allRows.length === 0 ? t('noVisibleListeners') : t('adjustSearch')),
            ),
          )
          : React.createElement(React.Fragment, null,
            currentProjectRows.length === 0 ? null : React.createElement('div', {
              className: 'dsh-ri-list-group',
              'data-runtime-inspector-group': 'current-project',
            },
            React.createElement('div', { className: 'dsh-ri-list-group-heading' },
              React.createElement('span', null, t('groupCurrentProject')),
              React.createElement('span', null, t('records', { count: currentProjectRows.length })),
            ),
            listenerRows(currentProjectRows),
            ),
            developmentEnvironmentRows.length === 0 ? null : React.createElement('div', {
              className: 'dsh-ri-list-group',
              'data-runtime-inspector-group': 'development-environment',
            },
            React.createElement('div', { className: 'dsh-ri-list-group-heading' },
              React.createElement('span', null, t('groupDevelopmentEnvironment')),
              React.createElement('span', null, t('records', { count: developmentEnvironmentRows.length })),
            ),
            listenerRows(developmentEnvironmentRows),
            ),
            pinnedRows.length === 0 ? null : React.createElement('div', {
              className: 'dsh-ri-list-group',
              'data-runtime-inspector-group': 'pinned',
            },
            React.createElement('div', { className: 'dsh-ri-list-group-heading' },
              React.createElement('span', null, t('groupPinned')),
              React.createElement('span', null, t('records', { count: pinnedRows.length })),
            ),
            listenerRows(pinnedRows),
            ),
            otherRows.length === 0 ? null : React.createElement('div', {
              className: 'dsh-ri-list-group',
              'data-runtime-inspector-group': 'other',
            },
            showOtherRows
              ? React.createElement(React.Fragment, null,
                React.createElement('div', { className: 'dsh-ri-list-group-heading' },
                  React.createElement('span', null, t('groupOther')),
                  React.createElement('span', null, t('records', { count: otherRows.length })),
                ),
                searching ? React.createElement('p', { className: 'dsh-ri-search-scope-note' }, t('searchScopeNote')) : null,
                listenerRows(otherRows),
              )
              : React.createElement('button', {
                type: 'button',
                className: 'dsh-ri-other-toggle',
                'aria-expanded': false,
                title: t('collapsedOther', { count: otherRows.length }),
                'data-runtime-inspector-other-toggle': 'open',
                onClick: () => { setOtherOpen(true) },
              },
              React.createElement('span', null, t('collapsedOther', { count: otherRows.length })),
              React.createElement('span', null, IconChevron({ size: 14 })),
              ),
            ),
          ),
      ),
      React.createElement('section', { className: 'dsh-ri-detail-column', 'aria-label': t('detailColumn') },
        detachedOperationNotice === undefined ? null : React.createElement(NoticeView, {
          notice: detachedOperationNotice,
          t,
          className: 'dsh-ri-detail-notice is-detached',
        }),
        React.createElement(DetailPanel, {
          row: selectedRow,
          snapshot,
          occurrenceCount: selectedRow === undefined ? 1 : collapsedRows.occurrenceCounts.get(selectedRow.listenerId) ?? 1,
          pending,
          operationNotice: selectedOperationNotice,
          onCopy: copyDetails,
          onOpenDirectory: openDirectory,
          onRequest: setPending,
          sessionContext,
          locale: translator.locale,
          t,
        }),
      ),
    ),
  ),
  ),
  ),
  pendingRow === undefined || pending === undefined ? null : React.createElement(ConfirmDialog, {
    row: pendingRow,
    request: pending,
    onConfirm: confirmAction,
    onCancel: () => { setPending(undefined) },
    locale: translator.locale,
    t,
  }),
  ),
  )
}

export function createSidebarEntry(
  rpc: RuntimeInspectorBrowserRpc,
  onOpen: (trigger?: HTMLElement) => void,
  sessions: RuntimeInspectorClientSessionsLike,
  locale: RuntimeInspectorLocaleStore = createRuntimeInspectorLocaleStore(undefined),
): (props: unknown) => React.ReactNode {
  return (props: unknown) => {
    const options = typeof props === 'object' && props !== null ? props as Partial<SidebarEntryProps> : {}
    return SidebarEntry({ wide: options.wide, onOpen, rpc, sessions, locale })
  }
}

export function createRuntimeInspectorPanel(
  rpc: RuntimeInspectorBrowserRpc,
  sessions: RuntimeInspectorClientSessionsLike,
  locale: RuntimeInspectorLocaleStore = createRuntimeInspectorLocaleStore(undefined),
): (props: unknown) => React.ReactNode {
  return () => RuntimeInspectorPanel({ rpc, sessions, locale })
}
